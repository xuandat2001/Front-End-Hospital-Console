const rows = {
  overviewPlanning: [
    { name: "Bed demand forecast", owner: "Command center", status: "Review today", detail: "12 additional med-surg beds expected by 18:00" },
    { name: "Discharge coordination", owner: "Patient flow", status: "On track", detail: "18 discharge-ready patients with transport plans" },
    { name: "Transfer risk review", owner: "Operations lead", status: "High attention", detail: "ICU step-down pressure in Ward C" },
  ],
  overviewResources: [
    { name: "Nurse coverage", owner: "Staff office", status: "92% covered", detail: "Two evening gaps need float-pool review" },
    { name: "Diagnostic capacity", owner: "Radiology/Lab", status: "Available", detail: "CT queue under 25 minutes, lab STAT lane clear" },
    { name: "Critical equipment", owner: "Biomedical", status: "Ready", detail: "3 transport monitors and 6 infusion pumps available" },
  ],
  reports: [
    { name: "Daily command summary", owner: "Command center", status: "Ready", detail: "Capacity, queues, staffing, and risks" },
    { name: "Executive capacity report", owner: "Operations analytics", status: "Draft", detail: "Occupancy and forecast narrative" },
    { name: "Exception review", owner: "Quality office", status: "Needs review", detail: "Delayed transfers and overdue tasks" },
  ],
  staffReports: [
    { name: "Attendance report", owner: "HR operations", status: "Ready", detail: "Absence, tardiness, and coverage variance" },
    { name: "Coverage report", owner: "Staffing desk", status: "Active", detail: "Open shifts by department and role" },
    { name: "Overtime report", owner: "Finance partner", status: "Review", detail: "Overtime trend and threshold exceptions" },
  ],
  roomReports: [
    { name: "Bed occupancy report", owner: "Bed board", status: "Ready", detail: "Occupancy by ward, acuity, and bed type" },
    { name: "Room turnover report", owner: "Environmental services", status: "Active", detail: "Cleaning turnaround and delay reasons" },
    { name: "Transfer delays", owner: "Patient flow", status: "Review", detail: "Blocked transfers and receiving ward readiness" },
  ],
  admissionReports: [
    { name: "Daily admission report", owner: "Admissions desk", status: "Ready", detail: "New admits, pending approvals, and placement time" },
    { name: "Weekly volume report", owner: "Patient access", status: "Draft", detail: "Arrival source and department distribution" },
    { name: "Transfer report", owner: "Care coordination", status: "Review", detail: "Inbound transfer timing and acceptance blockers" },
  ],
  surgeryReports: [
    { name: "Surgery utilization report", owner: "OR manager", status: "Ready", detail: "OR use, cancellations, and turnover time" },
    { name: "Surgeon workload report", owner: "Surgical services", status: "Active", detail: "Case mix and schedule balance" },
    { name: "Post-op outcomes", owner: "Quality office", status: "Review", detail: "Recovery exceptions and return-to-OR flags" },
  ],
};

export const centerTabPrototypeConfigs = {
  "overview-planning": {
    title: "Overview Planning",
    subtitle: "Hospital-wide capacity plan, expected admissions, transfers, and discharge coordination.",
    metrics: [
      { label: "Forecast occupancy", value: "87%", caption: "+4% by evening" },
      { label: "Expected admits", value: "31", caption: "Next 12 hours" },
      { label: "Planned discharges", value: "18", caption: "Ready or pending transport" },
      { label: "Transfer risks", value: "6", caption: "Need command review" },
    ],
    rows: rows.overviewPlanning,
    sections: [
      { title: "Planning focus", items: ["Bed demand forecast", "Discharge readiness", "Inbound transfers", "Escalation routing"] },
      { title: "Prototype actions", items: ["Export capacity plan", "Assign patient-flow owner", "Flag delayed discharge"] },
    ],
  },
  "overview-resources": {
    title: "Overview Resources",
    subtitle: "Cross-hospital staffing, equipment, diagnostics, and critical supply readiness.",
    metrics: [
      { label: "Staff coverage", value: "92%", caption: "All departments" },
      { label: "Open beds", value: "42", caption: "Hospital-wide" },
      { label: "Critical equipment", value: "96%", caption: "Ready status" },
      { label: "Supply risk", value: "3", caption: "Items to monitor" },
    ],
    rows: rows.overviewResources,
    sections: [
      { title: "Resource groups", items: ["Clinical staffing", "Room and bed readiness", "Diagnostics throughput", "Equipment pool"] },
      { title: "Local controls", items: ["Filter by department", "Export readiness snapshot", "Mark resource reviewed"] },
    ],
  },
  "overview-reports": {
    title: "Overview Reports",
    subtitle: "Frontend-only command reports for daily operations, capacity, staffing, and exception review.",
    metrics: [
      { label: "Generated today", value: "7", caption: "Mock reports" },
      { label: "Open exceptions", value: "12", caption: "Across operations" },
      { label: "Ready exports", value: "4", caption: "PDF/CSV prototypes" },
      { label: "Review queue", value: "5", caption: "Leadership actions" },
    ],
    rows: rows.reports,
    sections: [
      { title: "Report library", items: ["Daily command summary", "Capacity forecast", "Queue exceptions", "Staffing variance"] },
      { title: "Export options", items: ["Prepare PDF", "Prepare CSV", "Send to leadership packet"] },
    ],
  },
  "staff-reports": {
    title: "Staff Reports",
    subtitle: "Attendance, coverage, overtime, department staffing, and performance report prototypes.",
    metrics: [
      { label: "Attendance", value: "96.4%", caption: "This month" },
      { label: "Open shifts", value: "14", caption: "Next 7 days" },
      { label: "Overtime hours", value: "128", caption: "-8% vs last week" },
      { label: "Risk flags", value: "5", caption: "Wellness review" },
    ],
    rows: rows.staffReports,
    sections: [
      { title: "Included reports", items: ["Attendance report", "Coverage report", "Overtime report", "Department staffing report", "Performance report"] },
      { title: "Prototype controls", items: ["Search reports", "Export selected", "Open review modal"] },
    ],
  },
  "room-reports": {
    title: "Room Reports",
    subtitle: "Bed occupancy, turnover, ward utilization, cleaning turnaround, transfer delay, and ICU availability reports.",
    metrics: [
      { label: "Occupancy", value: "82%", caption: "All wards" },
      { label: "Avg turnover", value: "42m", caption: "Cleaning to ready" },
      { label: "Transfer delays", value: "9", caption: "Active blockers" },
      { label: "ICU available", value: "5", caption: "Ready beds" },
    ],
    rows: rows.roomReports,
    sections: [
      { title: "Report cards", items: ["Bed occupancy report", "Room turnover report", "Ward utilization", "Cleaning turnaround", "Transfer delays", "ICU availability"] },
      { title: "Operational actions", items: ["Export room report", "Filter by ward", "Flag turnover blocker"] },
    ],
  },
  "admission-reports": {
    title: "Admission Reports",
    subtitle: "Daily admission, weekly volume, department distribution, and transfer report prototypes.",
    metrics: [
      { label: "New admissions", value: "46", caption: "Today" },
      { label: "Avg admit time", value: "38m", caption: "-6m vs target" },
      { label: "Pending approvals", value: "11", caption: "Needs review" },
      { label: "Transfers", value: "8", caption: "Inbound active" },
    ],
    rows: rows.admissionReports,
    sections: [
      { title: "Report set", items: ["Daily admission report", "Weekly volume", "Department report", "Transfer report"] },
      { title: "Workflow controls", items: ["Prepare report", "Filter by department", "Open admission queue"] },
    ],
  },
  "surgery-reports": {
    title: "Surgery Reports",
    subtitle: "Surgery utilization, schedule performance, surgeon workload, cancellation, and outcome report prototypes.",
    metrics: [
      { label: "OR utilization", value: "78%", caption: "Today" },
      { label: "Cases completed", value: "23", caption: "5 rooms active" },
      { label: "Turnover avg", value: "29m", caption: "Room to room" },
      { label: "Cancellations", value: "2", caption: "Same-day" },
    ],
    rows: rows.surgeryReports,
    sections: [
      { title: "Report set", items: ["Surgery utilization", "Surgeon workload", "Cancellation report", "Post-op outcomes"] },
      { title: "Prototype controls", items: ["Export surgery report", "Filter by OR", "Review exception"] },
    ],
  },
};

export const icuTabPrototypeConfigs = {
  performance: {
    title: "ICU Performance",
    subtitle: "Occupancy trend, average ICU stay, bed turnover, escalation, and risk proxy metrics.",
    metrics: [
      { label: "Occupancy", value: "91%", caption: "Critical care beds" },
      { label: "Average stay", value: "3.8d", caption: "-0.4d vs last month" },
      { label: "Turnover", value: "5.2h", caption: "Bed ready cycle" },
      { label: "Escalations", value: "7", caption: "Last 24 hours" },
    ],
    rows: [
      { name: "Ventilator cohort", owner: "ICU charge nurse", status: "Stable", detail: "6 patients monitored" },
      { name: "Sepsis risk proxy", owner: "Critical care", status: "Review", detail: "3 high-attention patients" },
      { name: "Bed turnover", owner: "EVS / ICU", status: "Improving", detail: "Two rooms under target" },
    ],
    sections: [{ title: "Performance views", items: ["Occupancy trend", "Average ICU stay", "Bed turnover", "Escalations", "Risk proxy metrics"] }],
  },
  planning: {
    title: "ICU Planning",
    subtitle: "Expected admissions, expected discharges, bed forecast, and staff coverage.",
    metrics: [
      { label: "Expected admits", value: "6", caption: "Next shift" },
      { label: "Expected discharges", value: "4", caption: "Step-down candidates" },
      { label: "Bed forecast", value: "5 open", caption: "By midnight" },
      { label: "Staff coverage", value: "94%", caption: "Nurse and intensivist" },
    ],
    rows: [
      { name: "Step-down candidates", owner: "Intensivist team", status: "Review", detail: "4 patients pending ward acceptance" },
      { name: "Surgery arrivals", owner: "OR coordinator", status: "Planned", detail: "2 post-op ICU beds reserved" },
      { name: "Night coverage", owner: "Staffing", status: "Covered", detail: "One float nurse assigned" },
    ],
    sections: [{ title: "Planning views", items: ["Expected admissions", "Expected discharges", "Bed forecast", "Staff coverage"] }],
  },
  resources: {
    title: "ICU Resources",
    subtitle: "Ventilators, monitors, infusion pumps, beds, staff, and critical supplies.",
    metrics: [
      { label: "Ventilators", value: "14/16", caption: "Ready" },
      { label: "Monitors", value: "22/24", caption: "Ready" },
      { label: "Infusion pumps", value: "61", caption: "Available" },
      { label: "Supply flags", value: "2", caption: "Review today" },
    ],
    rows: [
      { name: "Ventilator pool", owner: "Respiratory therapy", status: "Ready", detail: "2 reserve units" },
      { name: "Infusion pumps", owner: "Biomedical", status: "Available", detail: "6 staged at ICU desk" },
      { name: "Critical supplies", owner: "Materials", status: "Watch", detail: "Central line kits below par" },
    ],
    sections: [{ title: "Resource views", items: ["Ventilators", "Monitors", "Infusion pumps", "Beds", "Staff", "Critical supplies"] }],
  },
  reports: {
    title: "ICU Reports",
    subtitle: "Daily ICU summary, capacity, patient movement, and equipment utilization reports.",
    metrics: [
      { label: "Reports ready", value: "4", caption: "Today" },
      { label: "Movement events", value: "12", caption: "Admit/transfer/discharge" },
      { label: "Equipment use", value: "88%", caption: "Critical devices" },
      { label: "Capacity risk", value: "Medium", caption: "Next 12 hours" },
    ],
    rows: [
      { name: "Daily ICU summary", owner: "Charge nurse", status: "Ready", detail: "Census, acuity, and alerts" },
      { name: "Capacity report", owner: "Command center", status: "Draft", detail: "Bed forecast and step-down queue" },
      { name: "Equipment utilization", owner: "Biomedical", status: "Ready", detail: "Ventilator and monitor usage" },
    ],
    sections: [{ title: "Report views", items: ["Daily ICU summary", "Capacity report", "Patient movement report", "Equipment utilization"] }],
  },
};

export const doctorAppointmentTabConfigs = {
  performance: {
    title: "Appointment Performance",
    subtitle: "Doctor-focused visit completion, no-show, cancellation, and schedule adherence metrics.",
    metrics: [
      { label: "Completion rate", value: "91%", caption: "This month" },
      { label: "No-show rate", value: "4.8%", caption: "-1.2% vs last month" },
      { label: "Avg delay", value: "7m", caption: "Clinic start variance" },
      { label: "Follow-ups created", value: "18", caption: "From appointments" },
    ],
    rows: [
      { name: "Visit completion", owner: "Doctor workspace", status: "On track", detail: "91% completed this month" },
      { name: "No-show review", owner: "Clinic desk", status: "Improving", detail: "Four repeat no-shows flagged" },
      { name: "Schedule adherence", owner: "Clinical assistant", status: "Review", detail: "Two late-start clinic blocks" },
    ],
    sections: [{ title: "Performance views", items: ["Completion rate", "No-show rate", "Schedule adherence", "Follow-up conversion"] }],
  },
  planning: {
    title: "Appointment Planning",
    subtitle: "Upcoming clinic load, visit preparation, patient records, and follow-up planning.",
    metrics: [
      { label: "Upcoming visits", value: "26", caption: "Next 7 days" },
      { label: "Records to review", value: "9", caption: "Before appointment" },
      { label: "Open slots", value: "14", caption: "This week" },
      { label: "Follow-up candidates", value: "6", caption: "Suggested" },
    ],
    rows: [
      { name: "Pre-visit review", owner: "Doctor", status: "9 records", detail: "Diagnostics and notes ready for review" },
      { name: "Slot planning", owner: "Clinic desk", status: "Open", detail: "14 slots available this week" },
      { name: "Follow-up planning", owner: "Care team", status: "Suggested", detail: "6 patients likely need follow-up" },
    ],
    sections: [{ title: "Planning views", items: ["Upcoming visits", "Visit preparation", "Open availability", "Follow-up planning"] }],
  },
  resources: {
    title: "Appointment Resources",
    subtitle: "Clinic templates, visit checklists, patient education, and scheduling rules.",
    metrics: [
      { label: "Templates", value: "8", caption: "Visit note and message" },
      { label: "Checklists", value: "5", caption: "By visit type" },
      { label: "Education files", value: "24", caption: "Approved resources" },
      { label: "Scheduling rules", value: "6", caption: "Clinic policies" },
    ],
    rows: [
      { name: "Visit templates", owner: "Clinical admin", status: "Ready", detail: "Initial, follow-up, and telehealth templates" },
      { name: "Patient education", owner: "Knowledge base", status: "Approved", detail: "24 approved clinic resources" },
      { name: "Scheduling rules", owner: "Clinic manager", status: "Current", detail: "Slot duration and buffer policies" },
    ],
    sections: [{ title: "Resource library", items: ["Clinic templates", "Visit checklists", "Patient education", "Scheduling rules"] }],
  },
  reports: {
    title: "Appointment Reports",
    subtitle: "Doctor appointment volume, visit outcomes, no-show, and follow-up reports.",
    metrics: [
      { label: "Reports ready", value: "4", caption: "Mock exports" },
      { label: "Visits month-to-date", value: "112", caption: "Clinic total" },
      { label: "No-show report", value: "Ready", caption: "Current month" },
      { label: "Outcome summary", value: "Draft", caption: "Needs review" },
    ],
    rows: [
      { name: "Visit volume report", owner: "Clinic analytics", status: "Ready", detail: "Daily and weekly appointment volume" },
      { name: "No-show report", owner: "Clinic desk", status: "Ready", detail: "Missed visits and repeat patterns" },
      { name: "Follow-up report", owner: "Care team", status: "Draft", detail: "Follow-ups created from appointments" },
    ],
    sections: [{ title: "Report set", items: ["Visit volume", "Visit outcomes", "No-show report", "Follow-up report"] }],
  },
};

export const followUpTabConfigs = {
  performance: {
    title: "Follow-up Performance",
    subtitle: "Completion, overdue, escalation, and patient response metrics for follow-up care.",
    metrics: [
      { label: "Completion rate", value: "84%", caption: "This month" },
      { label: "Overdue tasks", value: "7", caption: "Needs review" },
      { label: "Avg close time", value: "1.8d", caption: "From due date" },
      { label: "Escalations", value: "3", caption: "High priority" },
    ],
    rows: [
      { name: "Overdue review", owner: "Care coordinator", status: "Active", detail: "7 tasks past due" },
      { name: "Completion trend", owner: "Doctor workspace", status: "Improving", detail: "84% completed this month" },
      { name: "Escalation audit", owner: "Clinical lead", status: "Review", detail: "3 high-priority callbacks" },
    ],
    sections: [{ title: "Performance views", items: ["Completion rate", "Overdue rate", "Escalations", "Patient response"] }],
  },
  planning: {
    title: "Follow-up Planning",
    subtitle: "Upcoming follow-ups, scheduling gaps, priority callbacks, and weekly care plan.",
    metrics: [
      { label: "Due this week", value: "28", caption: "Across clinic" },
      { label: "Priority callbacks", value: "6", caption: "High urgency" },
      { label: "Schedule gaps", value: "4", caption: "Need assignment" },
      { label: "Completed plan", value: "72%", caption: "Week prepared" },
    ],
    rows: [
      { name: "Priority callback list", owner: "Care team", status: "6 calls", detail: "High urgency follow-ups" },
      { name: "Weekly schedule", owner: "Doctor", status: "Draft", detail: "28 follow-ups due this week" },
      { name: "Assignment gaps", owner: "Clinic manager", status: "Review", detail: "4 tasks need owner assignment" },
    ],
    sections: [{ title: "Planning views", items: ["Due this week", "Priority callbacks", "Schedule gaps", "Weekly plan"] }],
  },
  resources: {
    title: "Follow-up Resources",
    subtitle: "Care instructions, message templates, escalation policies, and patient education resources.",
    metrics: [
      { label: "Instructions", value: "18", caption: "Approved sets" },
      { label: "Message templates", value: "12", caption: "SMS and chat" },
      { label: "Escalation policies", value: "5", caption: "Clinical rules" },
      { label: "Education files", value: "31", caption: "Patient-facing" },
    ],
    rows: [
      { name: "Care instructions", owner: "Clinical knowledge", status: "Approved", detail: "18 follow-up instruction sets" },
      { name: "Message templates", owner: "Clinic desk", status: "Ready", detail: "Reminder and check-in templates" },
      { name: "Escalation policies", owner: "Clinical lead", status: "Current", detail: "High-risk callback criteria" },
    ],
    sections: [{ title: "Resource library", items: ["Care instructions", "Message templates", "Escalation policies", "Patient education"] }],
  },
  reports: {
    title: "Follow-up Reports",
    subtitle: "Follow-up completion, overdue, escalation, and patient response report prototypes.",
    metrics: [
      { label: "Reports ready", value: "4", caption: "Mock exports" },
      { label: "Completion report", value: "Ready", caption: "Current month" },
      { label: "Overdue report", value: "7", caption: "Open tasks" },
      { label: "Response rate", value: "79%", caption: "Patient contact" },
    ],
    rows: [
      { name: "Completion report", owner: "Care coordination", status: "Ready", detail: "Completed and missed follow-ups" },
      { name: "Overdue report", owner: "Doctor workspace", status: "Active", detail: "Tasks past due by priority" },
      { name: "Patient response report", owner: "Clinic desk", status: "Draft", detail: "Contact attempts and response timing" },
    ],
    sections: [{ title: "Report set", items: ["Completion report", "Overdue report", "Escalation report", "Patient response report"] }],
  },
};

export const clinicDoctorTabConfigs = {
  "clinic-doctor-schedule": {
    title: "My Schedule",
    subtitle: "Doctor clinic availability, booked appointments, time-off blocks, and schedule exceptions.",
    metrics: [
      { label: "Booked today", value: "12", caption: "Clinic visits" },
      { label: "Open slots", value: "6", caption: "This week" },
      { label: "Time-off blocks", value: "2", caption: "Next 14 days" },
      { label: "Schedule conflicts", value: "1", caption: "Needs review" },
    ],
    rows: [
      { name: "Morning clinic", owner: "Doctor", status: "Booked", detail: "8 appointments scheduled" },
      { name: "Afternoon telehealth", owner: "Clinic desk", status: "Open slots", detail: "3 slots remain" },
      { name: "Time-off review", owner: "Clinic manager", status: "Pending", detail: "One coverage handoff needed" },
    ],
    sections: [{ title: "Schedule views", items: ["Weekly calendar", "Available slots", "Booked appointments", "Time-off blocks"] }],
  },
  "clinic-doctor-messages": {
    title: "Clinic Messages",
    subtitle: "Direct messages, department channels, patient-care threads, and call activity.",
    metrics: [
      { label: "Unread", value: "5", caption: "Direct and team" },
      { label: "Patient threads", value: "9", caption: "Active care threads" },
      { label: "Calls today", value: "3", caption: "Voice/video" },
      { label: "Escalations", value: "1", caption: "Needs reply" },
    ],
    rows: [
      { name: "Direct patient-care thread", owner: "Nurse team", status: "Unread", detail: "Lab result follow-up" },
      { name: "Department channel", owner: "Cardiology", status: "Active", detail: "Schedule coverage update" },
      { name: "Call activity", owner: "Clinic desk", status: "Complete", detail: "Three calls logged today" },
    ],
    sections: [{ title: "Message views", items: ["Direct messages", "Department channels", "Patient care threads", "Call activity"] }],
  },
  "clinic-doctor-reports": {
    title: "Clinic Reports",
    subtitle: "Visit summaries, appointment reports, patient flow, and clinic metric report prototypes.",
    metrics: [
      { label: "Reports ready", value: "4", caption: "Mock exports" },
      { label: "Visits month-to-date", value: "112", caption: "Completed" },
      { label: "Patient flow", value: "91%", caption: "On-time throughput" },
      { label: "Follow-up conversion", value: "28%", caption: "Visits to tasks" },
    ],
    rows: [
      { name: "Visit summary", owner: "Doctor workspace", status: "Ready", detail: "Completed visits and clinical notes" },
      { name: "Appointment report", owner: "Clinic analytics", status: "Ready", detail: "Bookings, cancellations, and no-shows" },
      { name: "Patient flow report", owner: "Clinic manager", status: "Draft", detail: "Wait times and care milestones" },
    ],
    sections: [{ title: "Report set", items: ["Visit summaries", "Appointment reports", "Patient flow", "Clinic metrics"] }],
  },
};

export const doctorSurgeryTabConfigs = {
  dashboard: {
    title: "My Surgery Dashboard",
    subtitle: "Doctor surgery requests, scheduled cases, linked patients, and action queue.",
    metrics: [
      { label: "Active requests", value: "7", caption: "Awaiting review" },
      { label: "Scheduled cases", value: "4", caption: "Next 14 days" },
      { label: "Linked patients", value: "9", caption: "Ready records" },
      { label: "Pending info", value: "2", caption: "Needs completion" },
    ],
    rows: [
      { name: "Request queue", owner: "Doctor", status: "Active", detail: "7 requests in progress" },
      { name: "Scheduled cases", owner: "Surgical services", status: "Confirmed", detail: "4 cases on calendar" },
      { name: "Missing consent", owner: "Clinic team", status: "Review", detail: "2 records need documents" },
    ],
    sections: [{ title: "Dashboard views", items: ["Active requests", "Scheduled surgeries", "Linked patients", "Action queue"] }],
  },
  performance: {
    title: "My Surgery Performance",
    subtitle: "Request approval, schedule lead time, cancellation, and outcome proxy metrics.",
    metrics: [
      { label: "Approval rate", value: "89%", caption: "Requests accepted" },
      { label: "Lead time", value: "4.2d", caption: "Request to schedule" },
      { label: "Cancellations", value: "1", caption: "This month" },
      { label: "Post-op flags", value: "2", caption: "Follow-up review" },
    ],
    rows: [
      { name: "Approval trend", owner: "Surgery desk", status: "On track", detail: "89% accepted" },
      { name: "Schedule lead time", owner: "OR coordinator", status: "Improving", detail: "4.2 day average" },
      { name: "Post-op flags", owner: "Doctor", status: "Review", detail: "2 patients need follow-up" },
    ],
    sections: [{ title: "Performance views", items: ["Approval rate", "Lead time", "Cancellations", "Post-op flags"] }],
  },
  resources: {
    title: "My Surgery Resources",
    subtitle: "Procedure templates, consent packets, surgical checklists, and operating-room references.",
    metrics: [
      { label: "Templates", value: "10", caption: "Procedure requests" },
      { label: "Consent packets", value: "6", caption: "Approved" },
      { label: "Checklists", value: "8", caption: "By procedure" },
      { label: "OR references", value: "5", caption: "Available" },
    ],
    rows: [
      { name: "Procedure templates", owner: "Surgical services", status: "Ready", detail: "10 templates configured" },
      { name: "Consent packets", owner: "Clinic admin", status: "Approved", detail: "6 active document sets" },
      { name: "Surgical checklist", owner: "OR team", status: "Current", detail: "Procedure-specific checklists" },
    ],
    sections: [{ title: "Resource library", items: ["Procedure templates", "Consent packets", "Surgical checklists", "OR references"] }],
  },
  reports: {
    title: "My Surgery Reports",
    subtitle: "Request history, scheduled cases, cancellations, and post-op follow-up reports.",
    metrics: [
      { label: "Reports ready", value: "4", caption: "Mock exports" },
      { label: "Request history", value: "21", caption: "This quarter" },
      { label: "Scheduled report", value: "Ready", caption: "Next 14 days" },
      { label: "Follow-up report", value: "Draft", caption: "Needs review" },
    ],
    rows: [
      { name: "Request history", owner: "Doctor workspace", status: "Ready", detail: "Submitted and approved surgery requests" },
      { name: "Scheduled cases", owner: "OR coordinator", status: "Ready", detail: "Calendar and assigned rooms" },
      { name: "Post-op follow-up", owner: "Care team", status: "Draft", detail: "Patients needing review" },
    ],
    sections: [{ title: "Report set", items: ["Request history", "Scheduled cases", "Cancellation report", "Post-op follow-up"] }],
  },
};
