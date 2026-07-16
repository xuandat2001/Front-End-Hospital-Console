export const mockPatients = [
  {
    _id: "pat-001",
    id: "pat-001",
    ellyId: "ELLY-USR-019F3AAD",
    fullName: "John Doe",
    gender: "Male",
    dateOfBirth: "1982-03-11",
    phone: "+84 900 111 222",
    status: "ACTIVE",
    hospitalMRN: "MRN-100451",
  },
  {
    _id: "pat-002",
    id: "pat-002",
    ellyId: "ELLY-USR-019F3AAE",
    fullName: "Mary Smith",
    gender: "Female",
    dateOfBirth: "1976-09-23",
    phone: "+84 900 333 444",
    status: "ACTIVE",
    hospitalMRN: "MRN-100452",
  },
  {
    _id: "pat-003",
    id: "pat-003",
    ellyId: "ELLY-USR-019F3AAF",
    fullName: "Robert Brown",
    gender: "Male",
    dateOfBirth: "1968-05-04",
    phone: "+84 900 555 666",
    status: "ACTIVE",
    hospitalMRN: "MRN-100453",
  },
];

export const mockMedicalRecords = [
  { _id: "rec-001", patientEllyId: "ELLY-USR-019F3AAD", type: "Visit", summary: "Cardiology follow-up completed.", createdAt: "2026-07-15T10:00:00.000Z" },
  { _id: "rec-002", patientEllyId: "ELLY-USR-019F3AAE", type: "Allergy", summary: "Penicillin allergy noted.", createdAt: "2026-07-12T11:30:00.000Z" },
];
