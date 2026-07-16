import { mockAdmissions, mockRooms, mockStaff, mockSurgeries } from "./mockHospital";
import { mockPatients } from "./mockPatients";

const STATUS_META = {
  ACTIVE: { label: "Active", color: "#22C55E" },
  ADMITTED: { label: "Admitted", color: "#3B82F6" },
  OBSERVATION: { label: "Observation", color: "#F59E0B" },
  DISCHARGED: { label: "Discharged", color: "#64748B" },
};

function departmentFor(patient) {
  return patient.department || "General Ward";
}

function admissionFor(patient) {
  return mockAdmissions.find(
    (item) => item.patientEllyId === patient.ellyId || item.patientId === patient.id || item.patientId === patient._id,
  );
}

function roomFor(index) {
  return mockRooms[index % mockRooms.length] || null;
}

function doctorFor(index) {
  const doctors = mockStaff.filter((staff) => staff.role === "DOCTOR");
  return doctors[index % doctors.length] || null;
}

export const mockPatientCensus = {
  generatedAt: "2026-07-16T09:45:00.000Z",
  totals: {
    total: mockPatients.length,
    active: mockPatients.filter((patient) => patient.status === "ACTIVE").length,
    inactive: 0,
    discharged: 1,
  },
  census: {
    inPatients: 2,
    outPatients: 1,
    activeInHospital: mockPatients.length,
  },
  statusDistribution: {
    labels: ["Active", "Admitted", "Observation"],
    data: [1, 1, 1],
    slices: [
      { label: "Active", value: 1, color: "#22C55E" },
      { label: "Admitted", value: 1, color: "#3B82F6" },
      { label: "Observation", value: 1, color: "#F59E0B" },
    ],
  },
  acuityHeatmap: {
    maxAcuity: 9,
    maxWorkload: 9,
    locations: [
      {
        location: "Cardiology",
        patientCount: 1,
        workloadScore: 5,
        averageAcuity: 3,
        riskLabel: "Moderate",
        riskColor: "#F59E0B",
        byStatus: [{ status: "ACTIVE", label: "Active", count: 1, color: "#22C55E" }],
      },
      {
        location: "Emergency",
        patientCount: 1,
        workloadScore: 9,
        averageAcuity: 5,
        riskLabel: "High",
        riskColor: "#EF4444",
        byStatus: [{ status: "OBSERVATION", label: "Observation", count: 1, color: "#F59E0B" }],
      },
      {
        location: "Orthopedics",
        patientCount: 1,
        workloadScore: 4,
        averageAcuity: 2,
        riskLabel: "Stable",
        riskColor: "#22C55E",
        byStatus: [{ status: "ACTIVE", label: "Active", count: 1, color: "#22C55E" }],
      },
    ],
  },
  rows: mockPatients.map((patient, index) => {
    const admission = admissionFor(patient);
    const room = roomFor(index);
    const doctor = doctorFor(index);
    const statusKey = admission?.currentStatus || admission?.status || patient.status || "ACTIVE";
    const status = STATUS_META[statusKey] || STATUS_META.ACTIVE;

    return {
      patientId: patient.ellyId,
      patient,
      isInPatient: Boolean(admission),
      admission,
      admissionsHistory: admission ? [admission] : [],
      surgery: mockSurgeries.find((surgery) => surgery.patientEllyId === patient.ellyId) || null,
      surgeriesHistory: mockSurgeries.filter((surgery) => surgery.patientEllyId === patient.ellyId),
      deptId: departmentFor(patient),
      dept: { id: departmentFor(patient), name: departmentFor(patient) },
      room,
      doctor,
      assignedNurse: mockStaff.find((staff) => staff.role === "NURSE") || null,
      statusLabel: status.label,
      statusColor: status.color,
    };
  }),
};

export const mockPatientPerformance = {
  alos: {
    overall: 4.6,
    target: 4.0,
    deltaDays: 0.6,
    bySpecialty: [
      { specialty: "Cardiology", alos: 4.3, target: 4.0, patientCount: 8 },
      { specialty: "Emergency", alos: 1.2, target: 1.0, patientCount: 18 },
      { specialty: "Orthopedics", alos: 5.1, target: 4.5, patientCount: 6 },
      { specialty: "General Ward", alos: 3.8, target: 4.0, patientCount: 12 },
    ],
  },
  discharge: {
    velocityPerDay: 6,
    throughputTarget: 7,
    onTimePct: 86,
    daily: [4, 6, 5, 7, 8, 6, 5, 7, 6, 8, 7, 6, 5, 7],
  },
  readmission: {
    enabled: false,
    high: 2,
    medium: 3,
    low: 7,
    topAtRisk: [
      {
        patientId: "ELLY-USR-019F3AAE",
        name: "Mary Smith",
        specialty: "Emergency",
        riskScore: 76,
        level: "High",
        action: "Review discharge plan",
      },
      {
        patientId: "ELLY-USR-019F3AAD",
        name: "John Doe",
        specialty: "Cardiology",
        riskScore: 58,
        level: "Medium",
        action: "Schedule follow-up",
      },
    ],
  },
};

export const mockPatientReports = {
  totals: { total: 1284, active: 37, inactive: 12 },
  census: {
    completed: 30,
    expected: 30,
    rangeLabel: "last 30 days",
    latest: "July 16, 09:45",
    reports: [
      {
        id: "census-2026-07-16",
        date: "2026-07-16",
        dateTime: "7/16 09:45",
        reportName: "Census_Report_2026-07-16_0945.pdf",
        type: "ADT snapshot",
        status: "Completed",
        censusCount: 37,
      },
      {
        id: "census-2026-07-15",
        date: "2026-07-15",
        dateTime: "7/15 15:00",
        reportName: "Census_Report_2026-07-15_1500.pdf",
        type: "ADT snapshot",
        status: "Completed",
        censusCount: 36,
      },
    ],
  },
  demographics: {
    averageAge: 45.2,
    genderSplit: { male: 49, female: 51 },
    departments: ["Cardiology", "Emergency", "Orthopedics", "General Ward"],
    ageGroups: [
      { label: "0-17", segments: { Emergency: 2, "General Ward": 3 }, total: 5 },
      { label: "18-35", segments: { Cardiology: 2, Emergency: 6, Orthopedics: 3, "General Ward": 8 }, total: 19 },
      { label: "36-60", segments: { Cardiology: 8, Emergency: 5, Orthopedics: 6, "General Ward": 12 }, total: 31 },
      { label: "60+", segments: { Cardiology: 7, Emergency: 4, Orthopedics: 9, "General Ward": 10 }, total: 30 },
    ],
    genderByDepartment: [
      { label: "Cardiology", male: 52, female: 48 },
      { label: "Emergency", male: 58, female: 42 },
      { label: "Orthopedics", male: 55, female: 45 },
      { label: "General Ward", male: 44, female: 56 },
    ],
  },
  incidents: {
    last7Days: 3,
    awaitingReview: 2,
    types: ["Surgical Complication", "Cancelled Procedure"],
    logs: [
      {
        id: "inc-001",
        date: "7/16",
        type: "Surgical Complication",
        description: "Minor bleeding during orthopedic procedure",
        patient: "ELLY-USR-019F3AAF",
        status: "Awaiting Review",
      },
      {
        id: "inc-002",
        date: "7/15",
        type: "Cancelled Procedure",
        description: "Procedure postponed pending cardiology clearance",
        patient: "ELLY-USR-019F3AAD",
        status: "Reviewed",
      },
    ],
  },
  compliance: { score: 98.5, factors: [] },
};
