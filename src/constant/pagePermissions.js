import { hasAnyPermission, hasPermission } from "./rbac";
import { PERMISSIONS } from "./rbac";

export const PAGE_PERMISSIONS = {
  command: [PERMISSIONS.OVERVIEW_READ, PERMISSIONS.HOSPITAL_READ],
  "overview-performance": [PERMISSIONS.OVERVIEW_READ, PERMISSIONS.HOSPITAL_READ],
  staffing: PERMISSIONS.OVERVIEW_READ,
  "overview-reports": PERMISSIONS.REPORT_READ,

  staff: PERMISSIONS.STAFF_READ,
  "staff-performance": PERMISSIONS.STAFF_READ,
  "staff-schedule": PERMISSIONS.STAFF_READ,
  "staff-department-management": PERMISSIONS.STAFF_MANAGE,
  "staff-reports": PERMISSIONS.REPORT_READ,
  "doctor-management": PERMISSIONS.STAFF_MANAGE,
  "department-management": PERMISSIONS.DEPARTMENT_MANAGE,
  departments: PERMISSIONS.DEPARTMENT_READ,

  "patient-dashboard": PERMISSIONS.PATIENT_READ,
  "patient-performance": PERMISSIONS.PATIENT_READ,
  "patient-planning": PERMISSIONS.PATIENT_READ,
  "patient-management": PERMISSIONS.PATIENT_MANAGE,
  "patient-reports": PERMISSIONS.REPORT_READ,

  beds: PERMISSIONS.ROOM_READ,
  "room-occupancy": PERMISSIONS.ROOM_READ,
  "room-performance": PERMISSIONS.ROOM_READ,
  "ward-planning": PERMISSIONS.ROOM_READ,
  "room-management": PERMISSIONS.ROOM_MANAGE,
  "room-reports": PERMISSIONS.REPORT_READ,
  "icu-monitoring": PERMISSIONS.ROOM_READ,

  emergency: PERMISSIONS.EMERGENCY_READ,
  "appointment-booking-management": PERMISSIONS.APPOINTMENT_READ,
  billing: PERMISSIONS.BILLING_READ,
  "doctor-follow-up-care": PERMISSIONS.FOLLOW_UP_READ,

  patient: PERMISSIONS.ADMISSION_READ,
  "patient-registration-performance": PERMISSIONS.ADMISSION_READ,
  "patient-registration-reports": PERMISSIONS.REPORT_READ,
  admissions: PERMISSIONS.ADMISSION_READ,
  "admission-performance": PERMISSIONS.ADMISSION_READ,
  "patient-workflow": PERMISSIONS.ADMISSION_READ,
  "admission-management": PERMISSIONS.ADMISSION_MANAGE,
  "admission-reports": PERMISSIONS.REPORT_READ,
  "surgery-records": PERMISSIONS.SURGERY_READ,
  "surgery-performance": PERMISSIONS.SURGERY_READ,
  "surgery-planning": PERMISSIONS.SURGERY_READ,
  "surgery-management": PERMISSIONS.SURGERY_MANAGE,
  "surgery-reports": PERMISSIONS.REPORT_READ,

  "intelligence-analytics": PERMISSIONS.INTELLIGENCE_READ,
  "intelligence-capacity": PERMISSIONS.INTELLIGENCE_READ,
  "intelligence-workload": PERMISSIONS.INTELLIGENCE_READ,
  "intelligence-resources": PERMISSIONS.INTELLIGENCE_READ,
  "intelligence-reports": PERMISSIONS.INTELLIGENCE_READ,
  "intelligence-insights": PERMISSIONS.INTELLIGENCE_READ,
  "intelligence-recommendations": PERMISSIONS.INTELLIGENCE_READ,
  "intelligence-reasoning": PERMISSIONS.INTELLIGENCE_READ,
  "intelligence-evidence": PERMISSIONS.INTELLIGENCE_READ,
  "intelligence-insight-history": PERMISSIONS.INTELLIGENCE_READ,

  "clinic-doctor-dashboard": [PERMISSIONS.CLINIC_READ, PERMISSIONS.DOCTOR_READ],
  "clinic-doctor-schedule": [PERMISSIONS.CLINIC_READ, PERMISSIONS.APPOINTMENT_READ],
  "clinic-doctor-messages": PERMISSIONS.MESSAGE_READ,
  "clinic-doctor-patients": PERMISSIONS.PATIENT_READ,
  "clinic-doctor-surgery-request": [PERMISSIONS.CLINIC_READ, PERMISSIONS.DOCTOR_READ],
  "clinic-doctor-reports": PERMISSIONS.REPORT_READ,

  notifications: PERMISSIONS.OVERVIEW_READ,
};

export function canAccessFunction(activeFunction, userPermissions = []) {
  const requiredPermission = PAGE_PERMISSIONS[activeFunction];

  if (!requiredPermission) {
    return true;
  }

  if (Array.isArray(requiredPermission)) {
    return hasAnyPermission(userPermissions, requiredPermission);
  }

  return hasPermission(userPermissions, requiredPermission);
}
