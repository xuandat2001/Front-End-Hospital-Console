import {
  hasAnyPermission,
  hasPermission,
  PERMISSIONS,
} from "./constant/rbac";

const navData = {
  overview: {
    label: "Overview",
    icon: "overview",
    requiredAny: [PERMISSIONS.OVERVIEW_READ, PERMISSIONS.HOSPITAL_READ],
    tabs: {
      dashboard: "command",
      performance: "overview-performance",
      planning: "surgery-planning",
      resources: "staffing",
      reports: "overview-reports",
    },
  },
  management: {
    label: "Core Modules",
    icon: "modules",
    subsections: {
      staff: {
        label: "Staff & Department",
        requiredPermission: PERMISSIONS.STAFF_READ,
        tabs: {
          dashboard: "staff",
          performance: "staff-performance",
          planning: "staff-schedule",
          resources: "staff-department-management",
          reports: "staff-reports",
        },
      },
      patient: {
        label: "Patient",
        requiredPermission: PERMISSIONS.PATIENT_READ,
        tabs: {
          dashboard: "patient-dashboard",
          performance: "patient-performance",
          planning: "patient-planning",
          resources: "patient-management",
          reports: "patient-reports",
        },
      },
      room: {
        label: "Rooms and Beds",
        requiredPermission: PERMISSIONS.ROOM_READ,
        tabs: {
          dashboard: "beds",
          performance: "room-performance",
          planning: "ward-planning",
          resources: "room-management",
          reports: "room-reports",
        },
      },
      icu: {
        label: "ICU",
        requiredPermission: PERMISSIONS.ROOM_READ,
        tabs: {
          dashboard: "icu-monitoring",
          performance: "icu-monitoring",
          planning: "icu-monitoring",
          resources: "icu-monitoring",
          reports: "icu-monitoring",
        },
      },
    },
  },
  operations: {
    label: "Operations",
    icon: "operations",
    subsections: {
      admission: {
        label: "Admissions",
        requiredPermission: PERMISSIONS.ADMISSION_READ,
        tabs: {
          dashboard: "admissions",
          performance: "admission-performance",
          planning: "patient-workflow",
          resources: "admission-management",
          reports: "admission-reports",
        },
      },
      surgery: {
        label: "Surgery",
        requiredPermission: PERMISSIONS.SURGERY_READ,
        tabs: {
          dashboard: "surgery-records",
          performance: "surgery-performance",
          planning: "surgery-planning",
          resources: "surgery-management",
          reports: "surgery-reports",
        },
      },
      "clinic-operations": {
        label: "My Clinic",
        requiredAny: [PERMISSIONS.CLINIC_READ, PERMISSIONS.DOCTOR_READ],
        tabs: {
          dashboard: "clinic-doctor-dashboard",
          performance: "clinic-doctor-schedule",
          planning: "clinic-doctor-surgery-request",
          resources: "clinic-doctor-messages",
          reports: "clinic-doctor-reports",
        },
      },
      "emergency-workflow": {
        label: "Emergency Workflow",
        requiredPermission: PERMISSIONS.EMERGENCY_READ,
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
        requiredPermission: PERMISSIONS.APPOINTMENT_READ,
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
        icon: "billing",
        requiredPermission: PERMISSIONS.BILLING_READ,
        tabs: {
          dashboard: "billing",
          performance: "billing",
          planning: "billing",
          resources: "billing",
          reports: "billing",
        },
      },
      "follow-up-care": {
        label: "Follow-up Care",
        requiredPermission: PERMISSIONS.FOLLOW_UP_READ,
        tabs: {
          dashboard: "doctor-follow-up-care",
          performance: "doctor-follow-up-care",
          planning: "doctor-follow-up-care",
          resources: "doctor-follow-up-care",
          reports: "doctor-follow-up-care",
        },
      },
    },
  },
  analytic: {
    label: "Analytics",
    icon: "analytics",
    requiredPermission: PERMISSIONS.INTELLIGENCE_READ,
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
    requiredPermission: PERMISSIONS.INTELLIGENCE_READ,
    tabs: {
      dashboard: "intelligence-insights",
      performance: "intelligence-recommendations",
      planning: "intelligence-reasoning",
      resources: "intelligence-evidence",
      reports: "intelligence-insight-history",
    },
  },
};

function isNavItemVisible(item, userPermissions = []) {
  if (item.requiredPermission) {
    return hasPermission(userPermissions, item.requiredPermission);
  }

  if (item.requiredAny?.length) {
    return hasAnyPermission(userPermissions, item.requiredAny);
  }

  return true;
}

export function getVisibleNavEntries(userPermissions = []) {
  return Object.entries(navData).filter(([sectionId, section]) => {
    if (!isNavItemVisible(section, userPermissions)) {
      return false;
    }

    if (section.subsections) {
      return getVisibleSubsections(sectionId, userPermissions).length > 0;
    }

    return true;
  });
}

export function getVisibleSubsections(sectionId, userPermissions = []) {
  const section = navData[sectionId];

  if (!section?.subsections) {
    return [];
  }

  return Object.entries(section.subsections)
    .filter(([, subsection]) => isNavItemVisible(subsection, userPermissions))
    .map(([id, subsection]) => ({ id, ...subsection }));
}

export default navData;

export function getSectionIds(userPermissions = []) {
  return getVisibleNavEntries(userPermissions).map(([sectionId]) => sectionId);
}

export function getSubsections(sectionId, userPermissions = []) {
  return getVisibleSubsections(sectionId, userPermissions);
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

export function getDefaultFunction(sectionId, userPermissions = []) {
  const visibleSubsections = getVisibleSubsections(sectionId, userPermissions);

  if (visibleSubsections.length > 0) {
    const firstSubsection = visibleSubsections[0];
    return (
      firstSubsection?.tabs?.dashboard ||
      visibleSubsections[0].id ||
      null
    );
  }

  const section = navData[sectionId];
  if (!section) return null;

  if (!isNavItemVisible(section, userPermissions)) {
    return null;
  }

  return section.tabs?.dashboard || Object.values(section.tabs || {})[0] || null;
}
