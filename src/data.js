export const workspacePages = {
  patients: {
    title: "Patients",
    description:
      "Track patient intake, admission state, transfers, and discharge readiness.",
    items: [
      "Patient registry",
      "Admission status",
      "Transfer queue",
      "Discharge planning",
    ],
  },
  staff: {
    title: "Staff & Department Discovery",
    description:
      "Search across staff, departments, specialties, and hospitals. Find staff by name or ID, and explore departments with their assigned teams.",
    items: [
      "Staff search",
      "Department search",
      "Hospital locations",
      "Team assignments",
    ],
  },
  departments: {
    title: "Staff & Department Discovery",
    description:
      "Search across staff, departments, specialties, and hospitals. Find staff by name or ID, and explore departments with their assigned teams.",
    items: [
      "Staff search",
      "Department search",
      "Hospital locations",
      "Team assignments",
    ],
  },
  "staff-department-management": {
    title: "Staff & Department Management",
    description:
      "Create, update, and manage staff members and departments.",
    items: [
      "Staff records",
      "Department records",
      "Assignments",
      "Schedules",
    ],
  },
  emergency: {
    title: "Emergency",
    description:
      "Review incoming emergency admission requests and follow their live hospital workflow.",
    items: [],
  },
  patient: {
    title: "Patient",
    description:
      "Monitor auto-accepted registrations by logical priority, and remove or re-add patients as needed.",
    items: [],
  },
  command: {
    title: "Command Overview",
    description:
      "Monitor hospital capacity, active queues, rooms, beds, staffing, and daily workflow.",
    items: ["KPI rows", "Charts and diagrams", "Activity feed", "Action queue"],
  },
  admissions: {
    title: "Admissions",
    description:
      "Review incoming admissions, patient placement, and pending room assignments.",
    items: [
      "Admission queue",
      "Patient placement",
      "Pending approvals",
      "Transfer requests",
    ],
  },
  "patient-planning": {
    title: "Patient Roadmap",
    description:
      "Track patients through the inpatient journey — from registration through to discharge.",
    items: [
      "Inpatient flow pipeline",
      "Outpatient flow pipeline",
      "Stage-based patient tracking",
    ],
  },
  "patient-workflow": {
    title: "Patient Workflow and Room Assignment",
    description:
      "Track patients through admission, surgery, recovery, and discharge and assign rooms",
    items: [
      "Admission pipeline",
      "Surgery queue",
      "Recovery tracking",
      "Discharge planning",
    ],
  },
  "surgery-management": {
    title: "Surgery Management",
    description: "Create, update, and manage surgery records in the system.",
    items: ["Surgery registry", "Surgeon assignments", "Operating room scheduling", "Outcome tracking"],
  },
  "surgery-planning": {
    title: "Surgery Planning",
    description:
      "View scheduled surgeries on a calendar — plan operating room assignments, surgeon schedules, and daily case load.",
    items: [
      "Monthly calendar view",
      "Daily surgery schedule",
      "Operating room utilization",
      "Surgeon availability",
    ],
  },
  "surgery-records": {
    title: "Surgery Records",
    description:
      "Track surgical procedures, schedules, operating rooms, and outcomes.",
    items: [
      "Surgery queue",
      "Operating room assignments",
      "Surgeon schedules",
      "Outcome tracking",
    ],
  },
  "room-performance": {
    title: "Room Performance",
    description:
      "View room utilization rates, turnover times, occupancy trends, and efficiency metrics across all rooms and wards.",
    items: [
      "Occupancy rates",
      "Turnover times",
      "Room utilization",
      "Efficiency metrics",
    ],
  },
  beds: {
    title: "Bed Flow",
    description:
      "Prepare rooms and beds, track availability, and manage discharge-ready capacity.",
    items: [
      "Open beds",
      "Room readiness",
      "Cleaning queue",
      "Transfer blockers",
    ],
  },
  "staff-performance": {
    title: "Staff Performance",
    description:
      "View staff performance ratings, success rates, attendance, task completion, mental health scores, and risk indicators.",
    items: [
      "Performance ratings",
      "Success rate tracking",
      "Attendance monitoring",
      "Mental health & wellness",
    ],
  },
  staffing: {
    title: "Staffing",
    description:
      "Manage shift coverage, nurse assignments, doctor availability, and escalation routing.",
    items: [
      "Shift coverage",
      "Nurse assignments",
      "Doctor availability",
      "Escalations",
    ],
  },
  billing: {
    title: "Billing",
    description:
      "Review billing exceptions, payment status, invoices, and insurance workflow.",
    items: [
      "Billing queue",
      "Insurance review",
      "Payment status",
      "Exceptions",
    ],
  },
  claims: {
    title: "Claims",
    description:
      "Track claim submission, verification, rejections, and follow-up work.",
    items: ["Claim queue", "Verification", "Rejected claims", "Follow-ups"],
  },
  payments: {
    title: "Payments",
    description:
      "Monitor payment status, deposits, outstanding balances, and receipt activity.",
    items: ["Payment status", "Outstanding balances", "Deposits", "Receipts"],
  },
  analytics: {
    title: "Analytics",
    description:
      "View KPIs, operational trends, department performance, and insight summaries.",
    items: [
      "KPI rows",
      "Charts and diagrams",
      "Activity trends",
      "Insight history",
    ],
  },
  "intelligence-analytics": {
    title: "Analytics",
    description:
      "Review operational intelligence snapshots, capacity statistics, emergency load, and resource status.",
    items: [],
  },
  "intelligence-capacity": {
    title: "Capacity Analytics",
    description:
      "Review bed occupancy, ICU pressure, available beds, and emergency demand signals.",
    items: [],
  },
  "intelligence-workload": {
    title: "Workload Analytics",
    description:
      "Review department workload, staff coverage, and operational pressure indicators.",
    items: [],
  },
  "intelligence-resources": {
    title: "Resource Analytics",
    description:
      "Review medicine stock, equipment availability, and missing resource metrics.",
    items: [],
  },
  "intelligence-reports": {
    title: "Analytics Report",
    description:
      "Review the latest generated intelligence snapshots for operational reporting.",
    items: [],
  },
  "ai-insights": {
    title: "AI Insights",
    description:
      "Review AI-suggested actions for hospital management and capacity planning.",
    items: [
      "Suggested actions",
      "Capacity predictions",
      "Risk flags",
      "Management insights",
    ],
  },
  "intelligence-insights": {
    title: "Insights",
    description:
      "Review active rule-based operational insights and their recommended responses.",
    items: [],
  },
  "intelligence-recommendations": {
    title: "Recommendations",
    description:
      "Review recommended actions attached to active operational insights.",
    items: [],
  },
  "intelligence-reasoning": {
    title: "Insight Reasoning",
    description:
      "Review the operational evidence behind each recommendation.",
    items: [],
  },
  "intelligence-evidence": {
    title: "Insight Evidence",
    description:
      "Review metric evidence captured by the intelligence rule engine.",
    items: [],
  },
  "intelligence-insight-history": {
    title: "Insight History",
    description:
      "Review generated insight records and recommendation status.",
    items: [],
  },
  reports: {
    title: "Reports",
    description:
      "Build operational, finance, patient flow, and department performance reports.",
    items: [
      "Operational reports",
      "Finance reports",
      "Patient flow",
      "Department performance",
    ],
  },
  "clinic-doctor-dashboard": {
    title: "My Clinic Dashboard",
    description:
      "Today's appointments, patient queue, and clinic activity at a glance.",
    items: [
      "Today's schedule",
      "Patient queue",
      "Upcoming visits",
      "Clinic alerts",
    ],
  },
  "clinic-doctor-schedule": {
    title: "My Schedule",
    description:
      "View and manage your clinic availability and booked appointments.",
    items: [
      "Weekly calendar",
      "Available slots",
      "Booked appointments",
      "Time-off blocks",
    ],
  },
  "clinic-doctor-patients": {
    title: "My Patients",
    description:
      "Search and review patients assigned to your clinic practice.",
    items: [
      "Patient search",
      "Recent visits",
      "Clinical notes",
      "Follow-up list",
    ],
  },
  "clinic-doctor-surgery-request": {
    title: "Surgery Request",
    description:
      "Submit and track surgical procedure requests for your patients.",
    items: [
      "New surgery request",
      "Active requests",
      "Request history",
      "Patient search",
    ],
  },
  "clinic-doctor-reports": {
    title: "Clinic Reports",
    description:
      "Review clinic activity, visit summaries, and operational reports.",
    items: [
      "Visit summaries",
      "Appointment reports",
      "Patient flow",
      "Clinic metrics",
    ],
  },
  "patient-dashboard": {
    title: "Patient Dashboard",
    description:
      "Review patient census, activity, and care status across the clinic.",
    items: [
      "Patient census",
      "Active cases",
      "Care milestones",
      "Recent updates",
    ],
  },
  "patient-management": {
    title: "Patient Management",
    description:
      "Manage patient records, updates, and clinical information.",
    items: [
      "Patient registry",
      "Record updates",
      "Care plans",
      "Clinical notes",
    ],
  },
  "appointment-booking-management": {
    title: "Appointment Booking",
    description:
      "View and manage clinic appointments, availability, and bookings.",
    items: [
      "Appointment list",
      "Availability",
      "Booking calendar",
      "Visit status",
    ],
  },
  welcome: {
    title: "Welcome",
    description:
      "Your profile, workspace information, and available modules.",
    items: [
      "Profile info",
      "Workspace details",
      "Module overview",
    ],
  },
};

export const centerTabs = [
  { id: "dashboard", label: "Dashboard", description: "Visual overview and key information." },
  { id: "performance", label: "Performance", description: "Metrics, trends, outcomes, and progress." },
  { id: "planning", label: "Planning", description: "Goals, projects, journeys, forecasts, and roadmaps." },
  { id: "resources", label: "Resources", description: "Documents, knowledge, research, learning materials, and references." },
  { id: "reports", label: "Reports", description: "Generated reports, exports, executive summaries, and compliance reports." },
];

export const notificationItems = [
  "New lab results arrived for Patient E-2049",
  "Billing exception resolved for Ward C",
  "AI suggests reserving two rooms for midnight arrivals",
  "Internal message from Pediatrics waiting",
];
