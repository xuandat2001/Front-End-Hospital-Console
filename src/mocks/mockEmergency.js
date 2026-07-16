export const mockEmergencyRequests = [
  {
    _id: "emg-alert-001",
    alertId: "emg-alert-001",
    caseId: "emg-case-001",
    patientName: "John Doe",
    patientEllyId: "ELLY-USR-019F3AAD",
    severity: "HIGH",
    status: "ACCEPTED",
    assignedDepartment: "Emergency",
    transferStatus: "Inbound",
    occurredAt: "2026-07-16T08:12:00.000Z",
    lastEventAt: "2026-07-16T08:18:00.000Z",
  },
  {
    _id: "emg-alert-002",
    alertId: "emg-alert-002",
    caseId: "emg-case-002",
    patientName: "Mary Smith",
    patientEllyId: "ELLY-USR-019F3AAE",
    severity: "CRITICAL",
    status: "PENDING",
    assignedDepartment: "Cardiology",
    transferStatus: "Awaiting ambulance",
    occurredAt: "2026-07-16T09:03:00.000Z",
    lastEventAt: "2026-07-16T09:04:00.000Z",
  },
];

export const mockEmergencySummary = {
  activeCases: 2,
  pendingRequests: 1,
  avgResponseMinutes: 7,
  criticalCases: 1,
  transfersInProgress: 2,
};

export const mockEmergencyResources = {
  ambulancesAvailable: 4,
  erBedsAvailable: 5,
  icuBedsAvailable: 2,
  staffOnDuty: 18,
  equipmentReady: 94,
};

export const mockEmergencyNotifications = [
  {
    _id: "emg-note-001",
    eventId: "emg-note-001",
    eventType: "EMERGENCY_CASE_CREATED",
    title: "Incoming emergency case",
    message: "Critical case assigned to Cardiology.",
    alertId: "emg-alert-002",
    occurredAt: "2026-07-16T09:03:00.000Z",
    read: false,
  },
];

export const mockEmergencyTimeline = [
  { id: "tl-001", label: "Emergency request received", time: "09:03" },
  { id: "tl-002", label: "Triage assigned", time: "09:04" },
  { id: "tl-003", label: "Ambulance ETA confirmed", time: "09:07" },
];
