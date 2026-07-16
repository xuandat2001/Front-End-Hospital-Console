const navData = {
  overview: {
    label: "Overview",
    icon: "overview",
    tabs: {
      dashboard: "command",
      performance: "overview-performance",
      planning: "N/A",
      resources: "staffing",
      reports: "overview-reports",
    },
  },
  management: {
    label: "Core Modules",
    icon: "modules",
    subsections: {
      staff: { label: "Staff & Department", tabs: { dashboard: "staff", performance: "staff-performance", planning: "staff-schedule", resources: "staff-department-management", reports: "staff-reports" } },
      patient: { label: "Patient", tabs: { dashboard: "patient-dashboard", performance: "patient-performance", planning: "patient-planning", resources: "patient-management", reports: "patient-reports" } },
      room: { label: "Rooms and Beds", tabs: { dashboard: "beds", performance: "room-performance", planning: "ward-planning", resources: "room-management", reports: "room-reports" } },
      icu: { label: "ICU", tabs: { dashboard: "icu-monitoring", performance: "icu-monitoring", planning: "icu-monitoring", resources: "icu-monitoring", reports: "icu-monitoring" } },
    },
  },
  operations: {
    label: "Operations",
    icon: "operations",
    subsections: {
      "emergency-workflow": {
        label: "Emergency Workflow",
        tabs: {
          dashboard: "emergency",
          performance: "emergency",
          planning: "emergency",
          resources: "emergency",
          reports: "emergency",
        },
      },
      "appointment-booking": {
        label: "Appointment Booking",
        tabs: {
          dashboard: "appointment-booking-management",
          performance: "appointment-booking-management",
          planning: "appointment-booking-management",
          resources: "appointment-booking-management",
          reports: "appointment-booking-management",
        },
      },
      billing: {
        label: "Billing",
        tabs: {
          dashboard: "billing-dashboard",
          performance: "billing-dashboard",
          planning: "billing-dashboard",
          resources: "billing-dashboard",
          reports: "billing-dashboard",
        },
      },
    },
  },
  "clinical-ops": {
    label: "Clinical Ops",
    icon: "records",
    subsections: {
      registration: {
        label: "Registration",
        tabs: {
          dashboard: "patient",
          performance: "patient-registration-performance",
          reports: "patient-registration-reports",
        },
      },
      admission: {
        label: "Admission & Discharge",
        tabs: {
          dashboard: "admissions",
          performance: "admission-performance",
          planning: "patient-workflow",
          reports: "admission-reports",
        },
      },
      surgery: {
        label: "Surgery",
        tabs: {
          dashboard: "surgery-records",
          performance: "surgery-performance",
          planning: "surgery-planning",
          reports: "surgery-reports",
        },
      },
    },
  },
  analytic: {
    label: "Analytics",
    icon: "analytics",
    tabs: {
      dashboard: "intelligence-analytics",
      performance: "intelligence-capacity",
      planning: "intelligence-workload",
      resources: "intelligence-resources",
      reports: "intelligence-reports",
    },
  },
  insight: {
    label: "Insights",
    icon: "insight",
    tabs: {
      dashboard: "intelligence-insights",
      performance: "intelligence-recommendations",
      planning: "intelligence-reasoning",
      resources: "intelligence-evidence",
      reports: "intelligence-insight-history",
    },
  },
};

export default navData;

export function getSectionIds() {
  return Object.keys(navData);
}

export function getSubsections(sectionId) {
  const section = navData[sectionId];
  return section?.subsections
    ? Object.entries(section.subsections).map(([id, sub]) => ({ id, ...sub }))
    : [];
}

export function getTabs(sectionId) {
  return navData[sectionId]?.tabs || {};
}

export function getFunction(sectionId, subsectionId, tabId) {
  const section = navData[sectionId];
  if (!section) return null;

  if (subsectionId && section.subsections?.[subsectionId]) {
    return section.subsections[subsectionId].tabs?.[tabId] || subsectionId;
  }

  return section.tabs?.[tabId] || null;
}

export function getDefaultFunction(sectionId) {
  const section = navData[sectionId];
  if (!section) return null;

  if (section.subsections) {
    const firstSub = Object.values(section.subsections)[0];
    return (
      firstSub?.tabs?.dashboard || Object.keys(section.subsections)[0] || null
    );
  }

  return section.tabs?.dashboard || Object.values(section.tabs)[0] || null;
}
