import {
  getMockResolvedIdentity,
  getMockSessionByEllyId,
  mockHospitalWorkspace,
} from "../../mocks/mockSession";
import {
  mockAdmissions,
  mockAnalytics,
  mockAppointments,
  mockConversations,
  mockDepartments,
  mockEmergencyRequests,
  mockFollowUps,
  mockHospital,
  mockIcu,
  mockInsights,
  mockKnowledgeDocuments,
  mockMessages,
  mockNotifications,
  mockPatientCensus,
  mockPatientPerformance,
  mockPatientReportsSnapshot,
  mockPatients,
  mockPerformance,
  mockRegistrationQueue,
  mockRegistrationPerformance,
  mockReports,
  mockRooms,
  mockStaff,
  mockSurgeries,
  mockSurgeryRequests,
} from "../../mocks/mockData";

const AUTH_STORAGE_KEY = "ellyAuthSession";
const SESSION_STORAGE_KEY = "ellyFrontendSession";

const state = {
  appointments: structuredClone(mockAppointments),
  departments: structuredClone(mockDepartments),
  staff: structuredClone(mockStaff),
  patients: structuredClone(mockPatients),
  rooms: structuredClone(mockRooms),
  admissions: structuredClone(mockAdmissions),
  surgeries: structuredClone(mockSurgeries),
  surgeryRequests: structuredClone(mockSurgeryRequests),
  reports: structuredClone(mockReports),
  conversations: structuredClone(mockConversations),
  messages: structuredClone(mockMessages),
  followUps: structuredClone(mockFollowUps),
};

function clone(value) {
  return structuredClone(value);
}

function assertArray(name, value) {
  if (!Array.isArray(value)) {
    throw new Error(`Mock contract violation: ${name} must be an array.`);
  }
}

function list(data) {
  const rows = clone(data);
  return {
    success: true,
    data: rows,
    pagination: {
      page: 1,
      limit: Math.max(rows.length, 1),
      total: rows.length,
      pages: 1,
    },
  };
}

function item(data) {
  return { success: true, data: clone(data) };
}

function created(prefix, payload) {
  const data = normalizeBody(payload);
  return {
    _id: `${prefix}-${Date.now()}`,
    id: `${prefix}-${Date.now()}`,
    status: data.status || "ACTIVE",
    createdAt: new Date().toISOString(),
    ...data,
  };
}

function normalizeBody(options = {}) {
  if (!options.body || typeof options.body !== "string") return {};
  try {
    return JSON.parse(options.body);
  } catch {
    return {};
  }
}

function routeName(pathname) {
  return pathname.replace(/^\/api/, "");
}

function findById(rows, id) {
  return rows.find((row) => row.id === id || row._id === id || row.ellyId === id);
}

function upsert(rows, id, payload) {
  const body = normalizeBody(payload);
  const index = rows.findIndex((row) => row.id === id || row._id === id);
  if (index === -1) {
    const next = created(id || "mock", body);
    rows.unshift(next);
    return next;
  }
  rows[index] = { ...rows[index], ...body, updatedAt: new Date().toISOString() };
  return rows[index];
}

function byPatient(rows, patientId) {
  return rows.filter(
    (row) =>
      row.patientId === patientId ||
      row.patientEllyId === patientId ||
      row.patient?.ellyId === patientId,
  );
}

function analyticsSnapshot(key) {
  return item(mockAnalytics[key] || mockAnalytics.overview);
}

function readStoredSession() {
  if (typeof localStorage === "undefined" && typeof sessionStorage === "undefined") {
    return null;
  }

  try {
    const stored =
      globalThis.localStorage?.getItem(AUTH_STORAGE_KEY) ||
      globalThis.sessionStorage?.getItem(SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function currentMockUser() {
  const session = readStoredSession();
  return {
    ellyId: session?.currentUser?.ellyId || "ELLY-USER-HOSP-ADMIN-001",
    fullName: session?.currentUser?.fullName || session?.currentUser?.name || "Hospital Admin",
    role: session?.role || session?.currentUser?.role || "HOSPITAL_ADMIN",
  };
}

function findMockParticipant(ellyId) {
  const normalized = String(ellyId || "").toUpperCase();
  const staff = state.staff.find((item) => String(item.ellyId).toUpperCase() === normalized);
  if (staff) {
    return {
      ellyId: staff.ellyId,
      fullName: staff.fullName || staff.name,
      role: staff.role,
      departmentId: staff.departmentId,
      departmentName: staff.departmentName,
    };
  }

  if (normalized === "ELLY-USER-HOSP-ADMIN-001") {
    return {
      ellyId: "ELLY-USER-HOSP-ADMIN-001",
      fullName: "Hospital Admin",
      role: "HOSPITAL_ADMIN",
      departmentId: "ADMIN",
      departmentName: "Administration",
    };
  }

  return {
    ellyId: normalized,
    fullName: normalized || "Unknown user",
    role: "STAFF",
  };
}

function getConversationUnreadSummary() {
  assertArray("conversations", state.conversations);
  return state.conversations.map((conversation) => ({
    conversationId: conversation.id || conversation._id,
    unreadCount: Number(conversation.unread || 0),
  }));
}

function updateConversationLastMessage(conversationId, message) {
  const conversation = state.conversations.find(
    (item) => item.id === conversationId || item._id === conversationId,
  );
  if (!conversation) return null;

  conversation.lastMessage = {
    id: message.id,
    senderEllyId: message.senderEllyId,
    senderName: message.senderName,
    content: message.content,
    createdAt: message.createdAt,
    sentAt: message.createdAt,
  };

  return conversation;
}

function createConversation(type, payload = {}) {
  const currentUser = currentMockUser();
  const timestamp = Date.now();
  const idPrefix =
    type === "DIRECT" ? "conv-direct" : type === "DEPARTMENT" ? "conv-channel" : "conv-group";
  const currentParticipant = findMockParticipant(currentUser.ellyId);
  const targetIds =
    type === "DIRECT"
      ? [payload.targetEllyId]
      : type === "DEPARTMENT"
        ? ["ELLY-STAFF-001", "ELLY-NURSE-001"]
        : payload.memberEllyIds || payload.memberIds || [];
  const memberIds = [...new Set([currentUser.ellyId, ...targetIds].filter(Boolean))];
  const members = memberIds.map(findMockParticipant);
  const targetParticipant =
    type === "DIRECT" ? members.find((member) => member.ellyId !== currentParticipant.ellyId) : null;
  const conversation = {
    id: `${idPrefix}-${timestamp}`,
    _id: `${idPrefix}-${timestamp}`,
    type,
    name:
      type === "DIRECT"
        ? targetParticipant?.fullName || payload.targetEllyId || "Direct message"
        : payload.name || payload.departmentName || payload.departmentId || "New conversation",
    description: payload.description || "",
    departmentId: payload.departmentId,
    departmentName: payload.departmentName,
    unread: 0,
    members,
    memberIds,
    lastMessage: {
      id: `msg-${timestamp}`,
      senderEllyId: currentParticipant.ellyId,
      senderName: currentParticipant.fullName,
      content:
        type === "DIRECT"
          ? "Conversation started."
          : type === "DEPARTMENT"
            ? "Channel opened for coordination."
            : "Group conversation created.",
      createdAt: new Date(timestamp).toISOString(),
      sentAt: new Date(timestamp).toISOString(),
    },
  };

  state.conversations.unshift(conversation);
  state.messages[conversation.id] = [
    {
      id: conversation.lastMessage.id,
      _id: conversation.lastMessage.id,
      conversationId: conversation.id,
      senderEllyId: currentParticipant.ellyId,
      senderName: currentParticipant.fullName,
      content: conversation.lastMessage.content,
      createdAt: conversation.lastMessage.createdAt,
      status: "sent",
      reactions: [],
    },
  ];

  return conversation;
}

let mockContractsValidated = false;

function validateMockContracts() {
  if (mockContractsValidated) return;

  [
    ["appointments", state.appointments],
    ["departments", state.departments],
    ["staff", state.staff],
    ["patients", state.patients],
    ["rooms", state.rooms],
    ["admissions", state.admissions],
    ["surgeries", state.surgeries],
    ["surgeryRequests", state.surgeryRequests],
    ["reports", state.reports],
    ["conversations", state.conversations],
    ["followUps", state.followUps],
  ].forEach(([name, value]) => assertArray(name, value));

  Object.entries(state.messages).forEach(([conversationId, messages]) => {
    assertArray(`messages.${conversationId}`, messages);
  });

  state.conversations.forEach((conversation) => {
    if (!conversation.id || !conversation.type || !Array.isArray(conversation.memberIds)) {
      throw new Error(
        `Mock contract violation: conversation ${conversation.id || "(missing id)"} is missing id, type, or memberIds.`,
      );
    }
  });

  state.patients.forEach((patient) => {
    if (!patient.ellyId || !Array.isArray(patient.registeredHospitals)) {
      throw new Error(
        `Mock contract violation: patient ${patient.ellyId || "(missing id)"} must include registeredHospitals.`,
      );
    }
  });

  mockContractsValidated = true;
}

function nowDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function dateAt(hour, minute = 0, offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function normalizeAppointment(raw, index = 0) {
  const patient =
    findById(state.patients, raw.patientId) ||
    findById(state.patients, raw.patientEllyId) ||
    state.patients[index % state.patients.length];
  const doctor =
    findById(state.staff, raw.doctorId) ||
    findById(state.staff, raw.doctorEllyId) ||
    state.staff[1];
  const department =
    findById(state.departments, raw.departmentId) ||
    state.departments.find((dept) => dept.name === raw.departmentName) ||
    state.departments[2];
  const statuses = ["BOOKED", "IN_PROGRESS", "COMPLETED", "NO_SHOW", "CANCELED"];
  const appointmentDateTime =
    raw.appointmentDateTime ||
    (index === 0
      ? dateAt(10, 30)
      : index === 1
        ? dateAt(14, 0)
        : dateAt(9 + index, 0, index - 1));
  const statusMap = {
    CONFIRMED: "BOOKED",
    CHECKED_IN: "IN_PROGRESS",
    CANCELLED: "CANCELED",
  };

  return {
    ...raw,
    _id: raw._id || raw.id,
    id: raw.id || raw._id,
    appointmentDateTime,
    scheduledAt: appointmentDateTime,
    status: statusMap[raw.status] || raw.status || statuses[index % statuses.length],
    reason: raw.reason || "Clinical consultation",
    notes: raw.notes || "Prototype appointment generated from mock data.",
    patient: {
      _id: patient?._id,
      id: patient?.id,
      ellyId: patient?.ellyId,
      patientEllyId: patient?.ellyId,
      name: patient?.fullName,
      fullName: patient?.fullName,
      gender: patient?.gender,
      age: patient?.age,
      phone: patient?.phone,
    },
    doctor: {
      _id: doctor?._id,
      id: doctor?.id,
      ellyId: doctor?.ellyId,
      name: doctor?.fullName || doctor?.name,
      fullName: doctor?.fullName || doctor?.name,
      specialization: doctor?.specialization,
    },
    department: {
      _id: department?._id,
      id: department?.id,
      departmentId: department?.departmentId,
      name: department?.name || department?.departmentName,
      specialty: department?.specialty,
    },
  };
}

function doctorAppointments() {
  const baseRows = state.appointments.map(normalizeAppointment);
  return [
    ...baseRows,
    normalizeAppointment(
      {
        _id: "booking-003",
        id: "booking-003",
        patientId: "patient-002",
        doctorId: "staff-002",
        departmentId: "CARDIOLOGY",
        status: "BOOKED",
        reason: "Medication review",
        appointmentDateTime: dateAt(16, 15, 1),
      },
      2,
    ),
  ];
}

function appointmentSummary(rows = doctorAppointments()) {
  const today = nowDateKey();
  const todayRows = rows.filter((row) => nowDateKey(row.appointmentDateTime) === today);
  const nextAppointment =
    todayRows.find((row) => ["BOOKED", "IN_PROGRESS"].includes(row.status)) ||
    rows.find((row) => ["BOOKED", "IN_PROGRESS"].includes(row.status)) ||
    rows[0] ||
    null;

  return {
    totalToday: todayRows.length,
    bookedToday: todayRows.filter((row) => row.status === "BOOKED").length,
    inProgressToday: todayRows.filter((row) => row.status === "IN_PROGRESS").length,
    completedToday: todayRows.filter((row) => row.status === "COMPLETED").length,
    nextAppointment,
  };
}

function appointmentAdminSnapshot() {
  const rows = doctorAppointments();
  return {
    stats: {
      totalAppointments: rows.length,
      booked: rows.filter((row) => row.status === "BOOKED").length,
      inProgress: rows.filter((row) => row.status === "IN_PROGRESS").length,
      completed: rows.filter((row) => row.status === "COMPLETED").length,
      canceled: rows.filter((row) => row.status === "CANCELED").length,
    },
    appointments: rows,
    statusBreakdown: [
      { status: "BOOKED", count: rows.filter((row) => row.status === "BOOKED").length },
      { status: "IN_PROGRESS", count: rows.filter((row) => row.status === "IN_PROGRESS").length },
      { status: "COMPLETED", count: rows.filter((row) => row.status === "COMPLETED").length },
      { status: "CANCELED", count: rows.filter((row) => row.status === "CANCELED").length },
    ],
  };
}

function followUpSummary() {
  const tasks = state.followUps;
  return {
    total: tasks.length,
    pending: tasks.filter((task) => task.status === "PENDING").length,
    completed: tasks.filter((task) => task.status === "COMPLETED").length,
    canceled: tasks.filter((task) => task.status === "CANCELED").length,
    overdue: tasks.filter((task) => task.overdue || task.displayStatus === "OVERDUE").length,
    nextFollowUp: tasks.find((task) => task.status === "PENDING") || null,
  };
}

function findFollowUp(id) {
  return state.followUps.find((task) => task._id === id || task.followUpEllyId === id);
}

function getEmergencyData(pathname) {
  if (pathname.includes("/dashboard/summary")) {
    return {
      activeCases: mockEmergencyRequests.length,
      criticalCases: 1,
      averageResponseMinutes: 7,
      availableBeds: 15,
    };
  }
  if (pathname.includes("/cases/active")) return clone(mockEmergencyRequests);
  if (pathname.includes("/resources/snapshot")) {
    return {
      beds: { available: 15, total: 50 },
      ambulances: { available: 4, total: 7 },
      staff: { available: 32, total: 48 },
      equipment: { available: 41, total: 45 },
    };
  }
  if (pathname.includes("/planning/volume-forecast")) {
    return { forecast: [{ hour: "08:00", expected: 12 }, { hour: "12:00", expected: 18 }] };
  }
  if (pathname.includes("/planning/capacity-forecast")) {
    return { capacityRisk: "Moderate", availableBeds: 15, projectedNeed: 18 };
  }
  if (pathname.includes("/planning/staffing-gap")) {
    return { gaps: [{ department: "Emergency", needed: 3, available: 2 }] };
  }
  if (pathname.includes("/planning/ambulance-demand")) {
    return { expectedTrips: 11, peakWindow: "14:00-18:00" };
  }
  if (pathname.includes("/planning/recommendations")) {
    return {
      recommendations: [
        { id: "rec-001", title: "Hold two ER beds", priority: "High" },
        { id: "rec-002", title: "Move one nurse to triage", priority: "Medium" },
      ],
    };
  }
  if (pathname.includes("/resources/ambulances")) {
    return [{ id: "amb-1", status: "AVAILABLE", location: "North bay" }];
  }
  if (pathname.includes("/resources/beds")) {
    return { total: 50, available: 15, occupied: 35 };
  }
  if (pathname.includes("/resources/staff")) {
    return [{ id: "staff-001", name: "Dr. Maya Chen", status: "ON_SHIFT" }];
  }
  if (pathname.includes("/resources/equipment")) {
    return [{ id: "vent-001", name: "Ventilator", status: "READY" }];
  }
  if (pathname.includes("/resources/bottlenecks")) {
    return [{ area: "ER Bays", severity: "Medium", waitMinutes: 18 }];
  }
  if (pathname.includes("/reports/daily-summary")) {
    return { totalEmergencyCases: 18, criticalCases: 3, averageResponseMinutes: 7 };
  }
  if (pathname.includes("/reports/sla")) {
    return { rows: [{ caseId: "case-001", status: "met" }, { caseId: "case-002", status: "breached" }] };
  }
  if (pathname.includes("/reports/delay-root-causes")) {
    return { rows: [{ cause: "Lab turnaround", cases: 4 }, { cause: "Bed assignment", cases: 3 }] };
  }
  if (pathname.includes("/reports/case-audit")) {
    return {
      case: mockEmergencyRequests[0],
      events: [
        { time: "05:40", label: "Alert received" },
        { time: "05:44", label: "Team assigned" },
      ],
    };
  }
  if (pathname.includes("/performance/response-time-trend")) return clone(mockPerformance.responseTimeTrend);
  if (pathname.includes("/performance/sla-compliance")) return clone(mockPerformance.slaCompliance);
  if (pathname.includes("/performance/severity-breakdown")) return clone(mockPerformance.severityBreakdown);
  if (pathname.includes("/performance/outcomes")) return clone(mockPerformance.outcomes);
  if (pathname.includes("/performance/delay-bottlenecks")) return clone(mockPerformance.delayBottlenecks);
  if (pathname.includes("/alerts/")) return { acknowledged: true, status: "ACCEPTED" };
  return clone(mockEmergencyRequests);
}

export async function mockApiRequest(path, options = {}) {
  validateMockContracts();

  const url = new URL(path, "http://mock.local");
  const pathname = routeName(url.pathname);
  const method = (options.method || "GET").toUpperCase();
  const segments = pathname.split("/").filter(Boolean);

  await new Promise((resolve) => globalThis.setTimeout(resolve, 80));

  if (pathname === "/auth/resolve-elly-id") {
    const body = normalizeBody(options);
    return item(getMockResolvedIdentity(body.ellyId));
  }
  if (pathname === "/auth/login") {
    const body = normalizeBody(options);
    return item(getMockSessionByEllyId(body.ellyId));
  }
  if (pathname === "/auth/logout") return item({ ok: true });
  if (pathname === "/auth/refresh" || pathname === "/auth/me") {
    return item(getMockSessionByEllyId("ELLY-USER-HOSP-ADMIN-001"));
  }
  if (pathname === "/auth/workspaces") return list([mockHospitalWorkspace]);
  if (pathname === "/auth/select-workspace") {
    return item(getMockSessionByEllyId("ELLY-USER-HOSP-ADMIN-001"));
  }

  if (pathname === "/hospitals/resolve-elly-id" || pathname === "/hospitals/resolve-staff-access") {
    return item({ hospital: mockHospital, staff: mockStaff[1] });
  }
  if (pathname === "/hospitals") return list([mockHospital]);
  if (pathname.startsWith("/departments")) return list(state.departments);

  if (pathname.startsWith("/staff")) {
    if (segments.length === 1 && method === "GET") return list(state.staff);
    if (segments.length === 1 && method === "POST") {
      const next = created("staff", options);
      state.staff.unshift(next);
      return item(next);
    }
    if (segments[2] === "schedule") {
      return item({ staffId: segments[1], weekStart: url.searchParams.get("weekStart"), shifts: [] });
    }
    return item(findById(state.staff, segments[1]) || upsert(state.staff, segments[1], options));
  }

  if (pathname.startsWith("/patients/elly/") && pathname.endsWith("/medical-records")) {
    return item([
      { id: "mr-001", type: "note", title: "Cardiology follow-up", createdAt: "2026-07-22T11:00:00.000Z" },
      { id: "mr-002", type: "lab", title: "CBC panel", createdAt: "2026-07-20T08:30:00.000Z" },
    ]);
  }
  if (pathname.startsWith("/patients/elly/")) {
    const patient = findById(state.patients, decodeURIComponent(segments[2])) || state.patients[0];
    return item({ patient, medicalProfile: patient.medicalProfile || {} });
  }
  if (pathname === "/patients/search") {
    const queryText = String(url.searchParams.get("q") || "").toLowerCase();
    const rows = state.patients.filter((patient) =>
      [
        patient.ellyId,
        patient.fullName,
        patient.firstName,
        patient.lastName,
        patient.hospitalMRN,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(queryText)),
    );
    return list(rows);
  }
  if (pathname.startsWith("/patients")) {
    if (segments.length === 1 && method === "GET") {
      const search = String(url.searchParams.get("search") || "").toLowerCase();
      const ellyId = String(url.searchParams.get("ellyId") || "").toUpperCase();
      const rows = state.patients.filter((patient) => {
        const matchesEllyId = !ellyId || String(patient.ellyId).toUpperCase() === ellyId;
        const matchesSearch =
          !search ||
          [patient.ellyId, patient.fullName, patient.hospitalMRN]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search));
        return matchesEllyId && matchesSearch;
      });
      return list(rows);
    }
    if (segments.length === 1 && method === "POST") {
      const next = created("patient", options);
      state.patients.unshift(next);
      return item(next);
    }
    return item(findById(state.patients, segments[1]) || upsert(state.patients, segments[1], options));
  }

  if (pathname === "/rooms/occupancy") return list(state.rooms);
  if (pathname.startsWith("/rooms")) {
    if (segments.length === 1 && method === "GET") return list(state.rooms);
    if (segments.length === 1 && method === "POST") {
      const next = created("room", options);
      state.rooms.unshift(next);
      return item(next);
    }
    return item(findById(state.rooms, segments[1]) || upsert(state.rooms, segments[1], options));
  }

  if (pathname.startsWith("/admissions/patient/")) return list(byPatient(state.admissions, segments[2]));
  if (pathname.includes("/with-patient")) return list(state.admissions.map((admission) => ({ ...admission, patient: findById(state.patients, admission.patientId) })));
  if (pathname.startsWith("/admissions")) {
    if (segments.length === 1 && method === "GET") return list(state.admissions);
    if (segments.length === 1 && method === "POST") {
      const next = created("admission", options);
      state.admissions.unshift(next);
      return item(next);
    }
    return item(findById(state.admissions, segments[1]) || upsert(state.admissions, segments[1], options));
  }

  if (pathname.startsWith("/surgeries/patient/")) return list(byPatient(state.surgeries, segments[2]));
  if (pathname.startsWith("/surgeries")) {
    if (segments.length === 1 && method === "GET") return list(state.surgeries);
    if (segments.length === 1 && method === "POST") {
      const next = created("surgery", options);
      state.surgeries.unshift(next);
      return item(next);
    }
    return item(findById(state.surgeries, segments[1]) || upsert(state.surgeries, segments[1], options));
  }

  if (pathname.startsWith("/surgery-requests/patient/")) return list(byPatient(state.surgeryRequests, segments[2]));
  if (pathname.startsWith("/surgery-requests")) {
    if (segments.length === 1 && method === "GET") return list(state.surgeryRequests);
    if (segments.length === 1 && method === "POST") {
      const next = created("surgery-request", options);
      state.surgeryRequests.unshift(next);
      return item(next);
    }
    return item(findById(state.surgeryRequests, segments[1]) || upsert(state.surgeryRequests, segments[1], options));
  }

  if (pathname.startsWith("/bookings/availability")) {
    return item({ slots: ["09:00", "10:30", "14:00", "15:30"] });
  }
  if (pathname === "/bookings/admin/dashboard") return item(appointmentAdminSnapshot());
  if (pathname === "/bookings/admin/performance") {
    return item({
      volumeTrend: [
        { label: "Mon", value: 18 },
        { label: "Tue", value: 22 },
        { label: "Wed", value: 20 },
        { label: "Thu", value: 24 },
        { label: "Fri", value: 21 },
      ],
      statusBreakdown: appointmentAdminSnapshot().statusBreakdown,
      averageWaitMinutes: 14,
    });
  }
  if (pathname === "/bookings/admin/planning") {
    return item({
      recommendations: [
        { id: "apt-plan-001", title: "Add two cardiology slots tomorrow", priority: "High" },
        { id: "apt-plan-002", title: "Keep one overflow visit block", priority: "Medium" },
      ],
    });
  }
  if (pathname === "/bookings/admin/reports") {
    return item({
      reports: [
        { id: "apt-report-001", title: "Daily appointment utilization", status: "Ready" },
        { id: "apt-report-002", title: "No-show pattern review", status: "Draft" },
      ],
    });
  }
  if (pathname === "/bookings/me/summary") return item(appointmentSummary());
  if (pathname === "/bookings/me/today") {
    const today = url.searchParams.get("date") || nowDateKey();
    return list(doctorAppointments().filter((row) => nowDateKey(row.appointmentDateTime) === today));
  }
  if (pathname === "/bookings/me") return list(doctorAppointments());
  if (pathname.startsWith("/bookings/me/")) {
    const id = decodeURIComponent(segments[2]);
    if (segments[3] === "status" && method === "PATCH") {
      const body = normalizeBody(options);
      const updated = upsert(state.appointments, id, body);
      return item(normalizeAppointment(updated));
    }
    return item(doctorAppointments().find((row) => row._id === id || row.id === id) || doctorAppointments()[0]);
  }
  if (pathname.startsWith("/bookings")) {
    if (segments.length === 1 && method === "GET") return list(doctorAppointments());
    if (segments.length === 1 && method === "POST") {
      const next = normalizeAppointment(created("booking", options), state.appointments.length);
      state.appointments.unshift(next);
      return item(next);
    }
    if (["cancel", "complete", "status"].includes(segments[2]) && ["PATCH", "POST"].includes(method)) {
      const body = normalizeBody(options);
      const nextStatus =
        segments[2] === "cancel"
          ? "CANCELED"
          : segments[2] === "complete"
            ? "COMPLETED"
            : body.status;
      return item(normalizeAppointment(upsert(state.appointments, segments[1], { body: JSON.stringify({ ...body, status: nextStatus }) })));
    }
    return item(normalizeAppointment(findById(state.appointments, segments[1]) || upsert(state.appointments, segments[1], options)));
  }

  if (pathname === "/follow-ups/me/summary") return item(followUpSummary());
  if (pathname === "/follow-ups/me") return list(state.followUps);
  if (pathname.startsWith("/follow-ups/from-appointment/") && method === "POST") {
    const appointmentId = decodeURIComponent(segments[2]);
    const body = normalizeBody(options);
    const appointment = doctorAppointments().find((row) => row._id === appointmentId || row.id === appointmentId);
    const next = {
      _id: `follow-up-${Date.now()}`,
      followUpEllyId: `FU-${Date.now()}`,
      status: "PENDING",
      displayStatus: "PENDING",
      overdue: false,
      createdAt: new Date().toISOString(),
      appointment,
      patient: appointment?.patient,
      ...body,
    };
    state.followUps.unshift(next);
    return item(next);
  }
  if (pathname.startsWith("/follow-ups/me/")) {
    const id = decodeURIComponent(segments[2]);
    const body = normalizeBody(options);
    const task = findFollowUp(id) || state.followUps[0];
    if (segments[3] === "complete") {
      Object.assign(task, body, {
        status: "COMPLETED",
        displayStatus: "COMPLETED",
        completedAt: new Date().toISOString(),
      });
    } else if (segments[3] === "cancel") {
      Object.assign(task, body, {
        status: "CANCELED",
        displayStatus: "CANCELED",
        canceledAt: new Date().toISOString(),
      });
    } else if (method === "PATCH") {
      Object.assign(task, body, { updatedAt: new Date().toISOString() });
    }
    return item(task);
  }

  if (pathname.startsWith("/icu/overview")) return item(mockIcu.overview);
  if (pathname.startsWith("/icu/patients")) return list(mockIcu.patients);
  if (pathname.startsWith("/icu/alerts")) return list(mockIcu.alerts);
  if (pathname.startsWith("/icu/signoffs")) return list([]);
  if (pathname.startsWith("/icu/")) return item({ ok: true });

  if (pathname.startsWith("/messages/conversations/") && pathname.endsWith("/messages")) {
    const conversationId = segments[2];
    if (method === "POST") {
      const body = normalizeBody(options);
      const currentUser = currentMockUser();
      const next = {
        id: `msg-${Date.now()}`,
        _id: `msg-${Date.now()}`,
        conversationId,
        senderEllyId: currentUser.ellyId,
        senderName: currentUser.fullName,
        content: body.content || "Demo message",
        createdAt: new Date().toISOString(),
        status: "sent",
        reactions: [],
      };
      state.messages[conversationId] = [...(state.messages[conversationId] || []), next];
      updateConversationLastMessage(conversationId, next);
      return item(next);
    }
    return list(state.messages[conversationId] || []);
  }
  if (pathname === "/messages/conversations/direct" && method === "POST") {
    const body = normalizeBody(options);
    const targetEllyId = String(body.targetEllyId || "").toUpperCase();
    const existing = state.conversations.find(
      (conversation) =>
        conversation.type === "DIRECT" &&
        conversation.memberIds?.includes(currentMockUser().ellyId) &&
        conversation.memberIds?.includes(targetEllyId),
    );
    return item(existing || createConversation("DIRECT", { targetEllyId }));
  }
  if (pathname === "/messages/conversations/department" && method === "POST") {
    const body = normalizeBody(options);
    const existing = state.conversations.find(
      (conversation) =>
        conversation.type === "DEPARTMENT" &&
        conversation.departmentId === body.departmentId,
    );
    return item(
      existing ||
        createConversation("DEPARTMENT", {
          departmentId: body.departmentId || "EMERGENCY",
          departmentName: body.departmentName || "Emergency",
        }),
    );
  }
  if (pathname === "/messages/conversations/group" && method === "POST") {
    const body = normalizeBody(options);
    return item(createConversation("GROUP", body));
  }
  if (
    pathname.startsWith("/messages/conversations/") &&
    segments[3] === "read" &&
    method === "PATCH"
  ) {
    const conversation = state.conversations.find(
      (item) => item.id === segments[2] || item._id === segments[2],
    );
    if (conversation) conversation.unread = 0;
    return item({ conversationId: segments[2], unreadCount: 0 });
  }
  if (
    pathname.startsWith("/messages/conversations/") &&
    segments[3] === "archive" &&
    method === "PATCH"
  ) {
    const index = state.conversations.findIndex(
      (item) => item.id === segments[2] || item._id === segments[2],
    );
    if (index >= 0) state.conversations.splice(index, 1);
    delete state.messages[segments[2]];
    return item({ conversationId: segments[2], archived: true });
  }
  if (pathname === "/messages/conversations") return list(state.conversations);
  if (pathname.startsWith("/messages/conversations")) {
    return item(
      state.conversations.find((conversation) => conversation.id === segments[2]) ||
        state.conversations[0],
    );
  }
  if (pathname === "/messages/unread") return list(getConversationUnreadSummary());
  if (pathname.startsWith("/messages/")) return item({ ok: true });

  if (pathname === "/ai/knowledge/ask") {
    return item({
      answer: "This prototype is using local mock knowledge. Emergency escalation should prioritize critical cases, available beds, and staffing coverage.",
      answerSource: "Mock knowledge base",
      matchedChunks: 2,
    });
  }
  if (pathname.startsWith("/ai/knowledge/documents")) return list(mockKnowledgeDocuments);
  if (pathname.startsWith("/ai/intelligence/patient-context-graph")) {
    return item({ nodes: [], edges: [], summary: "Mock patient context graph." });
  }
  if (pathname.startsWith("/ai/intelligence/patient-risk-monitor")) {
    return item({
      insight: { answer: "Vitals and recent registration data indicate medium monitoring priority." },
      dataQuality: { unavailableSources: [] },
    });
  }

  if (pathname.includes("/intelligence/analytics/overview")) return analyticsSnapshot("overview");
  if (pathname.includes("/intelligence/analytics/capacity")) return analyticsSnapshot("capacity");
  if (pathname.includes("/intelligence/analytics/emergency")) return analyticsSnapshot("emergency");
  if (pathname.includes("/intelligence/analytics/staff-workload")) return analyticsSnapshot("staffWorkload");
  if (pathname.includes("/intelligence/analytics/inventory")) return analyticsSnapshot("inventory");
  if (pathname.includes("/intelligence/analytics/equipment")) return analyticsSnapshot("equipment");
  if (pathname.includes("/intelligence/patient-census")) return item(mockPatientCensus);
  if (pathname.includes("/intelligence/insights")) return list(mockInsights);
  if (pathname.includes("/intelligence/recommendations")) return list(mockInsights);
  if (pathname.includes("/intelligence/patient-performance")) return item(mockPatientPerformance);
  if (pathname.includes("/intelligence/registration-performance")) return item(mockRegistrationPerformance);
  if (pathname.includes("/intelligence/patient-reports")) return item(mockPatientReportsSnapshot);

  if (pathname.startsWith("/diagnostics")) return list([]);
  if (pathname.startsWith("/reports")) {
    if (segments.length === 1 && method === "GET") return list(state.reports);
    if (segments.length === 1 && method === "POST") {
      const next = created("report", options);
      state.reports.unshift(next);
      return item(next);
    }
    return item(findById(state.reports, segments[1]) || upsert(state.reports, segments[1], options));
  }
  if (pathname.startsWith("/performance")) return list([]);

  return item({ ok: true, mock: true, path: pathname });
}

export async function mockApiRequestBlob() {
  const blob = new Blob(["Mock prototype export"], { type: "text/plain" });
  return blob;
}

export async function mockDirectData(path) {
  validateMockContracts();

  const url = new URL(path, "http://mock.local");
  const pathname = url.pathname;

  await new Promise((resolve) => globalThis.setTimeout(resolve, 80));

  if (pathname.includes("/registration-queue")) {
    return { success: true, data: clone(mockRegistrationQueue) };
  }
  if (pathname.includes("/notifications/unread-count")) {
    return { count: mockNotifications.filter((item) => !item.read).length };
  }
  if (pathname.includes("/notifications")) return clone(mockNotifications);
  if (pathname.includes("/api/emergency")) return getEmergencyData(pathname);
  if (pathname.includes("/api/emergency-requests")) return clone(mockEmergencyRequests);

  return { ok: true, mock: true };
}

export function mockExportResponse(filename = "elly-prototype-export.txt") {
  return {
    blob: new Blob(["Mock prototype export"], { type: "text/plain" }),
    filename,
    contentType: "text/plain",
  };
}
