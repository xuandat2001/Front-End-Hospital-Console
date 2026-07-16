export const mockDepartments = [
  { _id: "dept-card", id: "dept-card", name: "Cardiology", specialty: "Cardiology", status: "ACTIVE" },
  { _id: "dept-er", id: "dept-er", name: "Emergency", specialty: "Emergency Medicine", status: "ACTIVE" },
  { _id: "dept-ortho", id: "dept-ortho", name: "Orthopedics", specialty: "Orthopedics", status: "ACTIVE" },
  { _id: "dept-neuro", id: "dept-neuro", name: "Neurology", specialty: "Neurology", status: "ACTIVE" },
  { _id: "dept-rad", id: "dept-rad", name: "Radiology", specialty: "Radiology", status: "ACTIVE" },
];

export const mockStaff = [
  { _id: "staff-001", id: "staff-001", ellyId: "ELLY-DR-001", fullName: "Dr. Linh Nguyen", role: "DOCTOR", departmentId: "dept-card", departmentName: "Cardiology" },
  { _id: "staff-002", id: "staff-002", ellyId: "ELLY-DR-002", fullName: "Dr. Maya Tran", role: "DOCTOR", departmentId: "dept-er", departmentName: "Emergency" },
  { _id: "staff-003", id: "staff-003", ellyId: "ELLY-NURSE-001", fullName: "An Pham", role: "NURSE", departmentId: "dept-er", departmentName: "Emergency" },
];

export const mockRooms = [
  { _id: "room-icu-01", roomNumber: "ICU-01", roomType: "ICU", capacity: 8, occupiedBeds: 6, bedsAvailable: 2, occupancyRate: 75 },
  { _id: "room-er-01", roomNumber: "ER-01", roomType: "EMERGENCY", capacity: 14, occupiedBeds: 9, bedsAvailable: 5, occupancyRate: 64 },
  { _id: "room-ward-03", roomNumber: "WARD-03", roomType: "WARD", capacity: 28, occupiedBeds: 18, bedsAvailable: 10, occupancyRate: 64 },
];

export const mockAdmissions = [
  { _id: "adm-001", patientId: "pat-001", patientEllyId: "ELLY-USR-019F3AAD", department: "Cardiology", status: "ADMITTED", admittedAt: "2026-07-16T08:10:00.000Z" },
  { _id: "adm-002", patientId: "pat-002", patientEllyId: "ELLY-USR-019F3AAE", department: "Emergency", status: "OBSERVATION", admittedAt: "2026-07-16T09:25:00.000Z" },
];

export const mockSurgeries = [
  { _id: "surg-001", patientEllyId: "ELLY-USR-019F3AAF", department: "Orthopedics", status: "SCHEDULED", scheduledAt: "2026-07-16T13:00:00.000Z" },
];
