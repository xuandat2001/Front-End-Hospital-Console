export const mockDoctors = [
  { id: "doc-001", fullName: "Dr. Linh Nguyen", department: "Cardiology" },
  { id: "doc-002", fullName: "Dr. Maya Tran", department: "Emergency" },
  { id: "doc-003", fullName: "Dr. Arun Patel", department: "Orthopedics" },
];

export const mockAppointmentSlots = [
  { time: "09:00", available: true },
  { time: "10:30", available: true },
  { time: "14:00", available: true },
  { time: "15:30", available: false },
];

export const mockAppointments = [
  {
    _id: "appt-001",
    id: "appt-001",
    patientName: "John Doe",
    patientEllyId: "ELLY-USR-019F3AAD",
    doctorName: "Dr. Linh Nguyen",
    doctorId: "doc-001",
    department: "Cardiology",
    status: "BOOKED",
    startTime: "2026-07-16T09:00:00.000Z",
    durationMinutes: 30,
    reason: "Follow-up",
  },
  {
    _id: "appt-002",
    id: "appt-002",
    patientName: "Mary Smith",
    patientEllyId: "ELLY-USR-019F3AAE",
    doctorName: "Dr. Arun Patel",
    doctorId: "doc-003",
    department: "Orthopedics",
    status: "COMPLETED",
    startTime: "2026-07-15T10:30:00.000Z",
    durationMinutes: 45,
    reason: "Post-op review",
  },
  {
    _id: "appt-003",
    id: "appt-003",
    patientName: "Robert Brown",
    patientEllyId: "ELLY-USR-019F3AAF",
    doctorName: "Dr. Maya Tran",
    doctorId: "doc-002",
    department: "Emergency",
    status: "CANCELED",
    startTime: "2026-07-14T14:00:00.000Z",
    durationMinutes: 30,
    reason: "Patient rescheduled",
  },
];
