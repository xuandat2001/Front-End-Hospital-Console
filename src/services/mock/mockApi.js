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
};

function clone(value) {
  return structuredClone(value);
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
  const url = new URL(path, "http://mock.local");
  const pathname = routeName(url.pathname);
  const method = (options.method || "GET").toUpperCase();
  const segments = pathname.split("/").filter(Boolean);

  await new Promise((resolve) => window.setTimeout(resolve, 80));

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
  if (pathname.startsWith("/patients")) {
    if (segments.length === 1 && method === "GET") return list(state.patients);
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
  if (pathname.startsWith("/bookings")) {
    if (segments.length === 1 && method === "GET") return list(state.appointments);
    if (segments.length === 1 && method === "POST") {
      const next = created("booking", options);
      state.appointments.unshift(next);
      return item(next);
    }
    return item(findById(state.appointments, segments[1]) || upsert(state.appointments, segments[1], options));
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
      const next = {
        id: `msg-${Date.now()}`,
        _id: `msg-${Date.now()}`,
        conversationId,
        senderEllyId: "ELLY-USER-HOSP-ADMIN-001",
        senderName: "Hospital Admin",
        content: body.content || "Demo message",
        createdAt: new Date().toISOString(),
        status: "sent",
      };
      state.messages[conversationId] = [...(state.messages[conversationId] || []), next];
      return item(next);
    }
    return list(state.messages[conversationId] || []);
  }
  if (pathname === "/messages/conversations") return list(state.conversations);
  if (pathname.startsWith("/messages/conversations")) return item(state.conversations[0]);
  if (pathname === "/messages/unread") return item({ count: 1, totalUnread: 1 });
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
  const url = new URL(path, "http://mock.local");
  const pathname = url.pathname;

  await new Promise((resolve) => window.setTimeout(resolve, 80));

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
