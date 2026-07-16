import { mockAppointments, mockAppointmentSlots } from "../mocks/mockAppointments";
import { mockAlerts, mockRegistrationNotifications } from "../mocks/mockAlerts";
import { mockCurrentUser, mockWorkspace } from "../mocks/mockSession";
import { mockDepartments, mockRooms, mockStaff, mockAdmissions, mockSurgeries } from "../mocks/mockHospital";
import { mockEmergencyNotifications, mockEmergencyRequests, mockEmergencyResources, mockEmergencySummary, mockEmergencyTimeline } from "../mocks/mockEmergency";
import { mockKnowledgeAnswers, mockKnowledgeDocuments } from "../mocks/mockKnowledge";
import { mockMedicalRecords, mockPatients } from "../mocks/mockPatients";
import { mockMessagesByConversation, mockConversations } from "../mocks/mockMessaging";
import { mockOverviewDashboard } from "../mocks/mockDashboard";
import { mockReports } from "../mocks/mockReports";

export const isMockMode =
  import.meta.env.VITE_USE_MOCK_DATA === "true" ||
  import.meta.env.VITE_DISABLE_API === "true";

export function delay(ms = 260) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseBody(body) {
  if (!body || typeof body !== "string") return {};
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

function ok(data, extra = {}) {
  return { success: true, data: clone(data), ...extra };
}

function list(data) {
  return ok(data, { count: Array.isArray(data) ? data.length : undefined });
}

function findPatientByEllyId(ellyId) {
  return mockPatients.find((patient) => patient.ellyId === decodeURIComponent(ellyId));
}

function getConversationId(path) {
  return path.match(/\/messages\/conversations\/([^/]+)/)?.[1];
}

function buildMessage(conversationId, content) {
  return {
    id: `msg-demo-${Date.now()}`,
    conversationId,
    sender: mockCurrentUser.fullName,
    senderEllyId: mockCurrentUser.ellyId,
    content,
    createdAt: new Date().toISOString(),
  };
}

export async function mockApiRequest(path, options = {}) {
  await delay();

  const method = (options.method || "GET").toUpperCase();
  const body = parseBody(options.body);
  const pathname = path.split("?")[0];

  if (pathname === "/hospitals/resolve-elly-id") {
    return ok({ hospital: { ...mockWorkspace, ellyHospitalId: body.ellyHospitalId || mockWorkspace.ellyHospitalId } });
  }

  if (pathname === "/hospitals") return list([{ ...mockWorkspace, name: mockWorkspace.hospitalName }]);
  if (pathname.startsWith("/departments")) return list(mockDepartments);
  if (pathname.startsWith("/staff")) return list(mockStaff);
  if (pathname === "/rooms/occupancy") return ok(mockRooms);
  if (pathname.startsWith("/rooms")) return list(mockRooms);
  if (pathname.startsWith("/admissions")) return list(mockAdmissions);
  if (pathname.startsWith("/surgeries")) return list(mockSurgeries);

  if (pathname === "/patients") return list(mockPatients);
  if (pathname.startsWith("/patients/elly/") && pathname.endsWith("/medical-records")) {
    const ellyId = pathname.split("/")[3];
    return ok(mockMedicalRecords.filter((record) => record.patientEllyId === ellyId));
  }
  if (pathname.startsWith("/patients/elly/")) {
    const patient = findPatientByEllyId(pathname.split("/").pop());
    return ok({ patient: patient || mockPatients[0] });
  }
  if (pathname.startsWith("/patients/")) {
    const id = pathname.split("/").pop();
    return ok(mockPatients.find((patient) => patient._id === id || patient.id === id) || mockPatients[0]);
  }

  if (pathname === "/bookings" && method === "GET") return list(mockAppointments);
  if (pathname === "/bookings/availability") return ok({ slots: mockAppointmentSlots });
  if (pathname === "/bookings" && method === "POST") {
    return ok({
      _id: `appt-demo-${Date.now()}`,
      id: `appt-demo-${Date.now()}`,
      status: "BOOKED",
      ...body,
    });
  }
  if (pathname.startsWith("/bookings/")) {
    const id = pathname.split("/")[2];
    const appointment = mockAppointments.find((item) => item.id === id || item._id === id) || mockAppointments[0];
    if (pathname.endsWith("/cancel")) return ok({ ...appointment, status: "CANCELED" });
    if (pathname.endsWith("/complete")) return ok({ ...appointment, status: "COMPLETED" });
    return ok({ ...appointment, ...body });
  }

  if (pathname === "/messages/conversations") return ok(mockConversations);
  if (pathname === "/messages/unread") {
    return ok({
      unreadByConversation: mockConversations.reduce((map, conversation) => {
        map[conversation.id] = conversation.unread || 0;
        return map;
      }, {}),
    });
  }
  if (pathname.includes("/messages/conversations/") && pathname.endsWith("/read")) {
    return ok({ read: true });
  }
  if (pathname.includes("/messages/conversations/") && pathname.endsWith("/messages")) {
    const conversationId = getConversationId(pathname);
    if (method === "POST") return ok(buildMessage(conversationId, body.content || "Demo message"));
    return ok(mockMessagesByConversation[conversationId] || []);
  }
  if (pathname.includes("/messages/conversations/")) {
    return ok(mockConversations.find((conversation) => conversation.id === getConversationId(pathname)) || mockConversations[0]);
  }

  if (pathname === "/ai/knowledge/ask") {
    const question = String(body.question || "").toLowerCase();
    const answer =
      mockKnowledgeAnswers.find((item) => question.includes("emergency") && item.answerSource.includes("emergency")) ||
      mockKnowledgeAnswers.find((item) => question.includes("billing") && item.answerSource.includes("billing")) ||
      mockKnowledgeAnswers[0];
    return ok(answer);
  }
  if (pathname === "/ai/knowledge/documents/pdf") {
    return ok({ ...mockKnowledgeDocuments[0], title: body.title || "Uploaded demo document" });
  }
  if (pathname.startsWith("/ai/knowledge/documents/")) {
    const id = pathname.split("/").pop();
    return ok(mockKnowledgeDocuments.find((doc) => doc.id === id) || mockKnowledgeDocuments[0]);
  }
  if (pathname === "/ai/knowledge/documents") return ok(mockKnowledgeDocuments);

  if (pathname.startsWith("/intelligence")) return ok(mockOverviewDashboard);
  if (pathname.startsWith("/reports")) return list(mockReports);
  if (pathname.startsWith("/diagnostics")) return list([]);
  if (pathname.startsWith("/icu")) {
    if (pathname.includes("overview")) return ok({ capacity: 8, occupied: 6, critical: 1, watch: 3 });
    return ok([]);
  }
  if (pathname.includes("performance")) return ok(mockOverviewDashboard.metrics);

  return ok([]);
}

export async function mockApiBlob(path) {
  await delay();
  return new Blob([`Mock export generated for ${path}`], { type: "text/plain" });
}

export async function mockGatewayRequest(path, options = {}) {
  await delay();
  const method = (options.method || "GET").toUpperCase();

  if (path.includes("/api/emergency-requests")) return clone(mockEmergencyRequests);
  if (path.includes("/api/emergency/dashboard/summary")) return clone(mockEmergencySummary);
  if (path.includes("/api/emergency/cases/active")) return clone(mockEmergencyRequests);
  if (path.includes("/api/emergency/resources/snapshot")) return clone(mockEmergencyResources);
  if (path.includes("/timeline")) return clone(mockEmergencyTimeline);
  if (path.includes("/api/notifications/unread-count")) return { count: 3 };
  if (path.includes("RegistrationSuccessEvent")) return clone(mockRegistrationNotifications);
  if (path.includes("/api/notifications")) return clone(mockEmergencyNotifications);
  if (path.includes("/acknowledge") && method === "POST") return { accepted: true, status: "ACCEPTED" };
  if (path.includes("/planning/")) return clone([{ label: "Next 6h", value: 18 }, { label: "Next 12h", value: 24 }]);
  if (path.includes("/resources/")) return clone(mockEmergencyResources);
  if (path.includes("/reports/")) return clone(mockReports);

  return [];
}

export function getMockEmergencyRealtimeState() {
  return {
    requests: clone(mockEmergencyRequests),
    activeCases: clone(mockEmergencyRequests),
    notifications: clone(mockEmergencyNotifications),
    summary: clone(mockEmergencySummary),
    resources: clone(mockEmergencyResources),
    unreadCount: 1,
  };
}

export function getMockRegistrationRealtimeState() {
  return {
    notifications: clone(mockRegistrationNotifications),
    unreadCount: mockRegistrationNotifications.filter((item) => !item.read).length,
  };
}

export { mockAlerts };
