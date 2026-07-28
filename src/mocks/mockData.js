import { mockHospitalWorkspace } from "./mockSession";

export const mockHospital = {
  _id: "6a259915b8327403156d292a",
  id: "6a259915b8327403156d292a",
  ellyHospitalId: mockHospitalWorkspace.workspaceEllyId,
  hospitalName: mockHospitalWorkspace.workspaceName,
  status: "ACTIVE",
};

export const mockDepartments = [
  {
    _id: "dept-admin",
    id: "dept-admin",
    departmentId: "ADMIN",
    name: "Administration",
    departmentName: "Administration",
    specialty: "Operations",
    status: "ACTIVE",
    headOfDepartment: "Hospital Admin",
    staffCount: 8,
  },
  {
    _id: "dept-emergency",
    id: "dept-emergency",
    departmentId: "EMERGENCY",
    name: "Emergency",
    departmentName: "Emergency",
    specialty: "Emergency Medicine",
    status: "ACTIVE",
    headOfDepartment: "Dr. Maya Chen",
    staffCount: 24,
  },
  {
    _id: "dept-cardiology",
    id: "dept-cardiology",
    departmentId: "CARDIOLOGY",
    name: "Cardiology",
    departmentName: "Cardiology",
    specialty: "Cardiology",
    status: "ACTIVE",
    headOfDepartment: "Dr. Adrian Wells",
    staffCount: 14,
  },
  {
    _id: "dept-surgery",
    id: "dept-surgery",
    departmentId: "SURGERY",
    name: "Surgery",
    departmentName: "Surgery",
    specialty: "General Surgery",
    status: "ACTIVE",
    headOfDepartment: "Dr. Linh Tran",
    staffCount: 18,
  },
];

export const mockStaff = [
  {
    _id: "staff-001",
    id: "staff-001",
    ellyId: "ELLY-STAFF-001",
    fullName: "Dr. Maya Chen",
    name: "Dr. Maya Chen",
    role: "DOCTOR",
    departmentId: "EMERGENCY",
    departmentName: "Emergency",
    specialization: "Emergency Medicine",
    status: "ACTIVE",
    shift: "Day",
  },
  {
    _id: "staff-002",
    id: "staff-002",
    ellyId: "ELLY-USER-DOCTOR-001",
    fullName: "Demo Doctor",
    name: "Demo Doctor",
    role: "DOCTOR",
    departmentId: "CARDIOLOGY",
    departmentName: "Cardiology",
    specialization: "Cardiology",
    status: "ACTIVE",
    shift: "Clinic",
  },
  {
    _id: "staff-003",
    id: "staff-003",
    ellyId: "ELLY-NURSE-001",
    fullName: "Nurse Olivia Grant",
    name: "Nurse Olivia Grant",
    role: "NURSE",
    departmentId: "ICU",
    departmentName: "ICU",
    specialization: "Critical Care",
    status: "ACTIVE",
    shift: "Night",
  },
];

export const mockPatients = [
  {
    _id: "patient-001",
    id: "patient-001",
    ellyId: "ELLY-PAT-001",
    fullName: "Avery Johnson",
    firstName: "Avery",
    lastName: "Johnson",
    gender: "Female",
    dateOfBirth: "1988-04-12",
    age: 38,
    phone: "+1 555 0101",
    status: "ACTIVE",
    priority: "High",
    departmentId: "CARDIOLOGY",
    departmentName: "Cardiology",
    hospitalMRN: "MRN-1001",
    medicalProfile: {
      allergies: ["Penicillin"],
      conditions: ["Hypertension"],
      bloodType: "O+",
    },
  },
  {
    _id: "patient-002",
    id: "patient-002",
    ellyId: "ELLY-PAT-002",
    fullName: "Marcus Lee",
    firstName: "Marcus",
    lastName: "Lee",
    gender: "Male",
    dateOfBirth: "1979-09-22",
    age: 46,
    phone: "+1 555 0102",
    status: "ACTIVE",
    priority: "Medium",
    departmentId: "SURGERY",
    departmentName: "Surgery",
    hospitalMRN: "MRN-1002",
    medicalProfile: {
      allergies: [],
      conditions: ["Diabetes Type 2"],
      bloodType: "A-",
    },
  },
  {
    _id: "patient-003",
    id: "patient-003",
    ellyId: "ELLY-PAT-003",
    fullName: "Sofia Patel",
    firstName: "Sofia",
    lastName: "Patel",
    gender: "Female",
    dateOfBirth: "1994-01-30",
    age: 32,
    phone: "+1 555 0103",
    status: "ACTIVE",
    priority: "Low",
    departmentId: "EMERGENCY",
    departmentName: "Emergency",
    hospitalMRN: "MRN-1003",
    medicalProfile: {
      allergies: ["Latex"],
      conditions: [],
      bloodType: "B+",
    },
  },
];

export const mockRooms = [
  {
    _id: "room-icu-1",
    id: "room-icu-1",
    roomNumber: "ICU-1",
    roomType: "ICU",
    capacity: 8,
    occupiedBeds: 6,
    bedsAvailable: 2,
    occupancyRate: 75,
    status: "ACTIVE",
    departmentId: "ICU",
  },
  {
    _id: "room-er-1",
    id: "room-er-1",
    roomNumber: "ER-1",
    roomType: "EMERGENCY",
    capacity: 12,
    occupiedBeds: 8,
    bedsAvailable: 4,
    occupancyRate: 67,
    status: "ACTIVE",
    departmentId: "EMERGENCY",
  },
  {
    _id: "room-ward-1",
    id: "room-ward-1",
    roomNumber: "WARD-3A",
    roomType: "GENERAL",
    capacity: 30,
    occupiedBeds: 21,
    bedsAvailable: 9,
    occupancyRate: 70,
    status: "ACTIVE",
    departmentId: "GENERAL",
  },
];

export const mockAdmissions = [
  {
    _id: "adm-001",
    id: "adm-001",
    patientId: "patient-001",
    patientEllyId: "ELLY-PAT-001",
    patientName: "Avery Johnson",
    status: "ADMITTED",
    roomId: "room-ward-1",
    roomNumber: "WARD-3A",
    admissionDate: "2026-07-25T09:00:00.000Z",
    departmentName: "Cardiology",
  },
  {
    _id: "adm-002",
    id: "adm-002",
    patientId: "patient-002",
    patientEllyId: "ELLY-PAT-002",
    patientName: "Marcus Lee",
    status: "PENDING",
    roomId: "room-er-1",
    roomNumber: "ER-1",
    admissionDate: "2026-07-28T02:30:00.000Z",
    departmentName: "Surgery",
  },
];

export const mockSurgeries = [
  {
    _id: "surg-001",
    id: "surg-001",
    patientId: "patient-002",
    patientEllyId: "ELLY-PAT-002",
    patientName: "Marcus Lee",
    procedureName: "Laparoscopic cholecystectomy",
    surgeryType: "General Surgery",
    status: "SCHEDULED",
    scheduledAt: "2026-07-29T11:30:00.000Z",
    surgeonName: "Dr. Linh Tran",
    roomNumber: "OR-2",
  },
  {
    _id: "surg-002",
    id: "surg-002",
    patientId: "patient-001",
    patientEllyId: "ELLY-PAT-001",
    patientName: "Avery Johnson",
    procedureName: "Cardiac catheterization",
    surgeryType: "Cardiology",
    status: "READY",
    scheduledAt: "2026-07-30T08:00:00.000Z",
    surgeonName: "Dr. Adrian Wells",
    roomNumber: "Cath Lab 1",
  },
];

export const mockSurgeryRequests = [
  {
    _id: "sr-001",
    id: "sr-001",
    patientId: "patient-002",
    patientEllyId: "ELLY-PAT-002",
    patientName: "Marcus Lee",
    requestedProcedure: "Gallbladder review",
    status: "REQUESTED",
    priority: "Medium",
    requestedBy: "Demo Doctor",
    createdAt: "2026-07-28T04:15:00.000Z",
  },
];

export const mockAppointments = [
  {
    _id: "booking-001",
    id: "booking-001",
    patientId: "patient-001",
    patientEllyId: "ELLY-PAT-001",
    patientName: "Avery Johnson",
    doctorId: "staff-002",
    doctorName: "Demo Doctor",
    departmentId: "CARDIOLOGY",
    departmentName: "Cardiology",
    status: "CONFIRMED",
    scheduledAt: "2026-07-28T14:00:00.000Z",
    reason: "Follow-up consultation",
  },
  {
    _id: "booking-002",
    id: "booking-002",
    patientId: "patient-003",
    patientEllyId: "ELLY-PAT-003",
    patientName: "Sofia Patel",
    doctorId: "staff-001",
    doctorName: "Dr. Maya Chen",
    departmentId: "EMERGENCY",
    departmentName: "Emergency",
    status: "CHECKED_IN",
    scheduledAt: "2026-07-28T10:30:00.000Z",
    reason: "Triage review",
  },
];

export const mockEmergencyRequests = [
  {
    _id: "alert-001",
    id: "alert-001",
    alertId: "alert-001",
    caseId: "case-001",
    patientEllyId: "ELLY-PAT-003",
    patientName: "Sofia Patel",
    severity: "CRITICAL",
    status: "ACTIVE",
    chiefComplaint: "Chest pain with shortness of breath",
    location: "ER Bay 4",
    lastEventAt: "2026-07-28T05:40:00.000Z",
  },
  {
    _id: "alert-002",
    id: "alert-002",
    alertId: "alert-002",
    caseId: "case-002",
    patientEllyId: "ELLY-PAT-001",
    patientName: "Avery Johnson",
    severity: "HIGH",
    status: "ACCEPTED",
    chiefComplaint: "Elevated blood pressure",
    location: "Observation 2",
    lastEventAt: "2026-07-28T04:20:00.000Z",
  },
];

export const mockNotifications = [
  {
    _id: "note-001",
    eventId: "alert-001",
    eventType: "EMERGENCY_ALERT",
    title: "Emergency alert",
    message: "Critical emergency case awaiting review.",
    read: false,
    occurredAt: "2026-07-28T05:40:00.000Z",
    data: mockEmergencyRequests[0],
  },
  {
    _id: "note-002",
    eventId: "reg_ELLY-PAT-003_ELLY-ORG-019EA2DD-FBD5-76B8-9CEC-19DA332BA2CD",
    eventType: "RegistrationSuccessEvent",
    title: "Patient registered",
    message: "Patient ELLY-PAT-003 registered and auto-accepted.",
    read: false,
    occurredAt: "2026-07-28T03:55:00.000Z",
    data: {
      ellyId: "ELLY-PAT-003",
      hospitalMRN: "MRN-1003",
      hospitalId: mockHospitalWorkspace.workspaceEllyId,
    },
  },
];

export const mockRegistrationQueue = [
  {
    eventId: "reg_ELLY-PAT-003_ELLY-ORG-019EA2DD-FBD5-76B8-9CEC-19DA332BA2CD",
    ellyId: "ELLY-PAT-003",
    fullName: "Sofia Patel",
    gender: "Female",
    dateOfBirth: "1994-01-30",
    hospitalMRN: "MRN-1003",
    status: "ACCEPTED",
    priority: "Medium",
    registeredAt: "2026-07-28T03:55:00.000Z",
  },
];

export const mockIcu = {
  overview: {
    totalPatients: 6,
    criticalCount: 1,
    highAttentionCount: 2,
    availableBeds: 2,
    deviceIssues: 1,
    nurseCoverage: "Adequate",
  },
  patients: [
    {
      _id: "icu-patient-001",
      id: "icu-patient-001",
      patientEllyId: "ELLY-PAT-001",
      patientName: "Avery Johnson",
      bedLabel: "ICU-1A",
      severity: "High Attention",
      heartRate: 104,
      spo2: 94,
      latestUpdateAt: "2026-07-28T05:52:00.000Z",
    },
    {
      _id: "icu-patient-002",
      id: "icu-patient-002",
      patientEllyId: "ELLY-PAT-003",
      patientName: "Sofia Patel",
      bedLabel: "ICU-1B",
      severity: "Critical",
      heartRate: 128,
      spo2: 90,
      latestUpdateAt: "2026-07-28T05:54:00.000Z",
    },
  ],
  alerts: [
    {
      _id: "icu-alert-001",
      id: "icu-alert-001",
      patientName: "Sofia Patel",
      severity: "Critical",
      message: "Oxygen saturation dropped below threshold.",
      status: "OPEN",
      createdAt: "2026-07-28T05:53:00.000Z",
    },
  ],
};

export const mockReports = [
  {
    _id: "report-001",
    id: "report-001",
    title: "Daily Capacity Report",
    category: "EQUIPMENT",
    status: "OPEN",
    priority: "Medium",
    createdAt: "2026-07-28T02:00:00.000Z",
    createdBy: "Hospital Admin",
    description: "Demo capacity summary for prototype review.",
  },
  {
    _id: "report-002",
    id: "report-002",
    title: "Incident Follow-up",
    category: "INCIDENT",
    status: "RESOLVED",
    priority: "High",
    createdAt: "2026-07-27T14:20:00.000Z",
    createdBy: "Dr. Maya Chen",
    description: "Closed demo incident record.",
  },
];

export const mockKnowledgeDocuments = [
  {
    _id: "doc-001",
    id: "doc-001",
    title: "Emergency Escalation Protocol",
    category: "hospital_policy",
    visibility: "internal",
    uploadedBy: "Hospital Admin",
    createdAt: "2026-07-21T09:00:00.000Z",
  },
  {
    _id: "doc-002",
    id: "doc-002",
    title: "ICU Bed Management Guide",
    category: "clinical_operations",
    visibility: "internal",
    uploadedBy: "Hospital Admin",
    createdAt: "2026-07-22T10:30:00.000Z",
  },
];

export const mockConversations = [
  {
    id: "conv-admin-emergency",
    _id: "conv-admin-emergency",
    type: "DEPARTMENT",
    name: "Emergency Coordination",
    departmentId: "EMERGENCY",
    unread: 1,
    members: ["ELLY-USER-HOSP-ADMIN-001", "ELLY-STAFF-001"],
    memberIds: ["ELLY-USER-HOSP-ADMIN-001", "ELLY-STAFF-001"],
    lastMessage: {
      content: "ER Bay 4 needs administrator review.",
      createdAt: "2026-07-28T05:45:00.000Z",
      sentAt: "2026-07-28T05:45:00.000Z",
    },
  },
  {
    id: "conv-admin-doctor",
    _id: "conv-admin-doctor",
    type: "DIRECT",
    name: "Demo Doctor",
    unread: 0,
    members: ["ELLY-USER-HOSP-ADMIN-001", "ELLY-USER-DOCTOR-001"],
    memberIds: ["ELLY-USER-HOSP-ADMIN-001", "ELLY-USER-DOCTOR-001"],
    lastMessage: {
      content: "Clinic schedule is ready for review.",
      createdAt: "2026-07-28T04:30:00.000Z",
      sentAt: "2026-07-28T04:30:00.000Z",
    },
  },
];

export const mockMessages = {
  "conv-admin-emergency": [
    {
      id: "msg-001",
      _id: "msg-001",
      conversationId: "conv-admin-emergency",
      senderEllyId: "ELLY-STAFF-001",
      senderName: "Dr. Maya Chen",
      content: "ER Bay 4 needs administrator review.",
      createdAt: "2026-07-28T05:45:00.000Z",
      status: "sent",
    },
  ],
  "conv-admin-doctor": [
    {
      id: "msg-002",
      _id: "msg-002",
      conversationId: "conv-admin-doctor",
      senderEllyId: "ELLY-USER-DOCTOR-001",
      senderName: "Demo Doctor",
      content: "Clinic schedule is ready for review.",
      createdAt: "2026-07-28T04:30:00.000Z",
      status: "sent",
    },
  ],
};

export const mockAnalytics = {
  overview: {
    metrics: {
      totalBeds: 50,
      availableBeds: 15,
      availableIcuBeds: 2,
      pendingAdmissions: 5,
      activeEmergencyCases: 2,
      totalBedOccupancy: 70,
      icuOccupancy: 75,
    },
    missingMetrics: [],
  },
  capacity: {
    metrics: {
      totalBeds: 50,
      availableBeds: 15,
      availableIcuBeds: 2,
      totalBedOccupancy: 70,
      icuOccupancy: 75,
    },
    missingMetrics: [],
  },
  emergency: {
    metrics: {
      activeEmergencyCases: 2,
      averageResponseTimeMinutes: 7,
      slaCompliance: 94,
    },
    missingMetrics: [],
  },
  staffWorkload: {
    metrics: {
      departments: [
        { department: "Emergency", workload: 82, availableStaff: 6 },
        { department: "Cardiology", workload: 64, availableStaff: 5 },
        { department: "Surgery", workload: 71, availableStaff: 4 },
      ],
    },
    missingMetrics: [],
  },
  inventory: {
    metrics: {
      trackedMedicineItems: 124,
      lowStockItems: 3,
      lowStockMedicineIds: ["IV saline", "Epinephrine", "Heparin"],
    },
    missingMetrics: [],
  },
  equipment: {
    metrics: {
      trackedEquipmentItems: 45,
      unavailableEquipmentIds: ["Ventilator V-03", "Pump P-12"],
    },
    missingMetrics: [],
  },
};

export const mockPatientCensus = {
  generatedAt: "2026-07-28T06:00:00.000Z",
  totals: { total: 3, active: 3, inactive: 0, discharged: 1 },
  census: { inPatients: 2, outPatients: 1, activeInHospital: 2 },
  statusDistribution: {
    data: [2, 1, 1],
    labels: ["Inpatient", "Outpatient", "Discharged"],
    slices: [
      { label: "Inpatient", value: 2, color: "#3B82F6" },
      { label: "Outpatient", value: 1, color: "#10B981" },
      { label: "Discharged", value: 1, color: "#94A3B8" },
    ],
  },
  acuityHeatmap: {
    maxWorkload: 86,
    maxAcuity: 5,
    locations: [
      {
        location: "Emergency",
        patientCount: 1,
        workloadScore: 86,
        averageAcuity: 5,
        riskLabel: "High",
        riskColor: "#EF4444",
        byStatus: [{ status: "ACTIVE", label: "Active", count: 1, color: "#EF4444" }],
      },
      {
        location: "Cardiology",
        patientCount: 1,
        workloadScore: 62,
        averageAcuity: 3,
        riskLabel: "Medium",
        riskColor: "#F59E0B",
        byStatus: [{ status: "ACTIVE", label: "Active", count: 1, color: "#F59E0B" }],
      },
      {
        location: "Surgery",
        patientCount: 1,
        workloadScore: 44,
        averageAcuity: 2,
        riskLabel: "Low",
        riskColor: "#22C55E",
        byStatus: [{ status: "ACTIVE", label: "Active", count: 1, color: "#22C55E" }],
      },
    ],
  },
  rows: mockPatients.map((patient, index) => ({
    patientId: patient.ellyId,
    patient,
    isInPatient: index !== 2,
    statusLabel: index === 2 ? "Outpatient" : "Inpatient",
    statusColor: index === 2 ? "#10B981" : "#3B82F6",
    deptId: patient.departmentId,
    dept: { id: patient.departmentId, name: patient.departmentName },
    room: index === 0 ? mockRooms[2] : index === 1 ? mockRooms[1] : null,
    admission: mockAdmissions[index] || null,
    doctor: mockStaff[index === 0 ? 1 : 0],
    assignedNurse: mockStaff[2],
    admissionsHistory: mockAdmissions.filter((admission) => admission.patientEllyId === patient.ellyId),
    surgeriesHistory: mockSurgeries.filter((surgery) => surgery.patientEllyId === patient.ellyId),
  })),
};

export const mockPatientPerformance = {
  alos: {
    overall: 4.2,
    target: 4.5,
    deltaDays: -0.3,
    bySpecialty: [
      { specialty: "Cardiology", alos: 4.1 },
      { specialty: "Surgery", alos: 5.3 },
      { specialty: "Emergency", alos: 1.2 },
    ],
  },
  discharge: {
    velocityPerDay: 12,
    throughputTarget: 10,
    onTimePct: 88,
    daily: [8, 10, 11, 9, 12, 14, 13],
  },
  readmission: {
    enabled: true,
    available: true,
    distribution: { high: 1, medium: 1, low: 1 },
    high: 1,
    medium: 1,
    low: 1,
    topAtRisk: [
      {
        patientEllyId: "ELLY-PAT-003",
        name: "Sofia Patel",
        level: "High",
        summary: "Recent emergency acuity signal.",
        topFindings: ["Critical emergency case", "ICU monitoring active"],
      },
    ],
  },
};

export const mockRegistrationPerformance = {
  doorToBed: {
    avgMinutes: 31,
    targetMinutes: 35,
    trend: [{ avgMinutes: 34 }, { avgMinutes: 33 }, { avgMinutes: 32 }, { avgMinutes: 31 }],
  },
  abandonment: {
    todayPct: 2.2,
    previousDayPct: 2.8,
    trend: [{ ratePct: 3.1 }, { ratePct: 2.8 }, { ratePct: 2.4 }, { ratePct: 2.2 }],
  },
  steps: [
    { key: "registration", label: "Registration", avgMinutes: 4 },
    { key: "triage", label: "Triage", avgMinutes: 7 },
    { key: "insurance", label: "Insurance Verification", avgMinutes: 12, flagged: true },
    { key: "attendingReview", label: "Attending Review", avgMinutes: 9 },
    { key: "bedSearch", label: "Bed Search", avgMinutes: 6 },
    { key: "transport", label: "Wait for Transport", avgMinutes: 8 },
  ],
  stepDistribution: {
    categories: ["Registration", "Triage", "Insurance", "Review", "Bed Search", "Transport"],
    series: [
      { priority: "CRITICAL", label: "Critical", values: [3, 5, 8, 7, 5, 7] },
      { priority: "URGENT", label: "Urgent", values: [4, 7, 12, 9, 6, 9] },
      { priority: "STANDARD", label: "Standard", values: [5, 8, 15, 10, 7, 10] },
    ],
  },
  bottleneck: { aiAnalysis: { enabled: false } },
};

export const mockPatientReportsSnapshot = {
  totals: { total: 3, active: 3, inactive: 0 },
  dailyCensus: [
    { label: "Mon", total: 39 },
    { label: "Tue", total: 41 },
    { label: "Wed", total: 43 },
  ],
  demographics: [
    { label: "18-39", total: 1 },
    { label: "40-59", total: 1 },
    { label: "60+", total: 1 },
  ],
  incidents: [{ id: "inc-001", title: "Delayed discharge", severity: "Medium" }],
  compliance: { score: 91, status: "Ready" },
  reports: mockReports,
};

export const mockInsights = [
  {
    id: "insight-001",
    _id: "insight-001",
    title: "Emergency throughput risk",
    summary: "Two high-priority cases are competing for ER bay capacity.",
    severity: "High",
    status: "ACTIVE",
    createdAt: "2026-07-28T05:20:00.000Z",
  },
  {
    id: "insight-002",
    _id: "insight-002",
    title: "ICU bed pressure",
    summary: "ICU occupancy is trending above target for the evening shift.",
    severity: "Medium",
    status: "ACTIVE",
    createdAt: "2026-07-28T04:10:00.000Z",
  },
];

export const mockPerformance = {
  responseTimeTrend: [
    { label: "Mon", value: 8 },
    { label: "Tue", value: 7 },
    { label: "Wed", value: 6 },
    { label: "Thu", value: 9 },
    { label: "Fri", value: 7 },
  ],
  slaCompliance: { met: 94, breached: 6, target: 90 },
  severityBreakdown: [
    { label: "Critical", value: 4 },
    { label: "High", value: 12 },
    { label: "Medium", value: 21 },
    { label: "Low", value: 18 },
  ],
  outcomes: [
    { label: "Stabilized", value: 38 },
    { label: "Transferred", value: 9 },
    { label: "Admitted", value: 15 },
  ],
  delayBottlenecks: [
    { label: "Lab turnaround", value: 14 },
    { label: "Bed assignment", value: 9 },
    { label: "Transport", value: 5 },
  ],
};
