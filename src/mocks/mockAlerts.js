export const mockAlerts = [
  { id: "alert-001", label: "24 accounts are overdue", level: "Urgent" },
  { id: "alert-002", label: "High-value claim requires review", level: "Urgent" },
  { id: "alert-003", label: "ICU East has limited monitored beds", level: "Review" },
  { id: "alert-004", label: "Daily capacity entry complete", level: "Ready" },
];

export const mockRegistrationNotifications = [
  {
    _id: "reg-note-001",
    eventId: "reg_ELLY-USR-019F3AAD_mock-hospital-001",
    eventType: "RegistrationSuccessEvent",
    title: "Patient registered",
    message: "Patient ELLY-USR-019F3AAD registered and auto-accepted.",
    occurredAt: new Date().toISOString(),
    read: false,
    data: {
      ellyId: "ELLY-USR-019F3AAD",
      hospitalId: "ELLY-ORG-019EA2DD-FBD5-76B8-9CEC-19DA332BA2CD",
      hospitalMRN: "MRN-100451",
    },
  },
];
