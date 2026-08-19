import navData from "../../tab-data";

export const EXPLICIT_DASHBOARD_FUNCTION_IDS = [
  "admission-management",
  "admission-performance",
  "admission-reports",
  "admissions",
  "ai-insights",
  "analytics",
  "appointment-booking-management",
  "beds",
  "billing",
  "clinic-doctor-dashboard",
  "clinic-doctor-messages",
  "clinic-doctor-reports",
  "clinic-doctor-schedule",
  "clinic-doctor-surgery-request",
  "command",
  "department-management",
  "departments",
  "doctor-follow-up-care",
  "doctor-management",
  "emergency",
  "icu-monitoring",
  "intelligence-analytics",
  "intelligence-capacity",
  "intelligence-evidence",
  "intelligence-insight-history",
  "intelligence-insights",
  "intelligence-reasoning",
  "intelligence-recommendations",
  "intelligence-reports",
  "intelligence-resources",
  "intelligence-workload",
  "notifications",
  "overview-performance",
  "overview-reports",
  "patient",
  "patient-dashboard",
  "patient-management",
  "patient-performance",
  "patient-planning",
  "patient-registration-performance",
  "patient-registration-reports",
  "patient-reports",
  "patient-workflow",
  "room-management",
  "room-occupancy",
  "room-performance",
  "room-reports",
  "staff",
  "staff-department-management",
  "staff-performance",
  "staff-reports",
  "staff-schedule",
  "staffing",
  "surgery-management",
  "surgery-performance",
  "surgery-planning",
  "surgery-records",
  "surgery-reports",
  "ward-planning",
  "welcome",
];

export const DASHBOARD_FUNCTION_IDS = new Set(EXPLICIT_DASHBOARD_FUNCTION_IDS);

export function collectNavigationFunctionIds(data = navData) {
  const ids = new Set();

  Object.values(data).forEach((section) => {
    Object.values(section.tabs || {}).forEach((functionId) => ids.add(functionId));
    Object.values(section.subsections || {}).forEach((subsection) => {
      Object.values(subsection.tabs || {}).forEach((functionId) =>
        ids.add(functionId),
      );
    });
  });

  return ids;
}

export function isKnownDashboardFunction(functionId) {
  return DASHBOARD_FUNCTION_IDS.has(functionId);
}
