import { apiRequest } from "../config/config";

export const HOSPITAL_WORKSPACE_STORAGE_KEY = "ellyHospitalWorkspace";

const ELLY_HOSPITAL_ID_PATTERN = /^ELLY-(ORG|HOSP)-[A-Z0-9][A-Z0-9-]*$/i;
const ELLY_STAFF_ID_PATTERN = /^ELLY-(USR|STAFF)-[A-Z0-9][A-Z0-9-]*$/i;

export function normalizeEllyHospitalId(value = "") {
  return value.trim().toUpperCase();
}

export function normalizeStaffEllyId(value = "") {
  return value.trim().toUpperCase();
}

export function validateEllyHospitalId(value = "") {
  const normalized = normalizeEllyHospitalId(value);

  if (!normalized) {
    return "Enter your ELLY ID to continue.";
  }

  if (!ELLY_HOSPITAL_ID_PATTERN.test(normalized)) {
    return "Use an ELLY hospital ID that starts with ELLY-ORG- or ELLY-HOSP-.";
  }

  return "";
}

export function validateStaffEllyId(value = "") {
  const normalized = normalizeStaffEllyId(value);

  if (!normalized) {
    return "Enter your doctor ELLY ID to continue.";
  }

  return "";
}

function normalizeHospitalResponse(response, ellyHospitalId) {
  const hospital =
    response?.hospital ||
    response?.data?.hospital ||
    response?.data ||
    response ||
    {};

  return {
    id: hospital.id || hospital._id || ellyHospitalId,
    ellyHospitalId:
      hospital.ellyHospitalId ||
      hospital.ellyId ||
      hospital.hospitalEllyId ||
      ellyHospitalId,
    hospitalName:
      hospital.hospitalName ||
      hospital.name ||
      hospital.organizationName ||
      "Hospital Workspace",
    integrationStatus: hospital.integrationStatus || "PENDING",
    status: hospital.status || "ACTIVE",
    resolvedAt: new Date().toISOString(),
    source: "api",
  };
}

export async function resolveEllyHospitalId(ellyHospitalId) {
  const normalized = normalizeEllyHospitalId(ellyHospitalId);

  const response = await apiRequest("/hospitals/resolve-elly-id", {
    method: "POST",
    body: JSON.stringify({
      ellyHospitalId: normalized,
    }),
  });

  if (response?.success === false) {
    throw new Error(response.message || "ELLY ID could not be verified.");
  }

  return normalizeHospitalResponse(response, normalized);
}

function normalizeStaffAccessResponse(response, staffEllyId) {
  const payload = response?.data || response || {};
  const hospital = payload.hospital || {};
  const staff = payload.staff || {};

  return {
    workspace: normalizeHospitalResponse(
      { data: hospital },
      hospital.ellyHospitalId || "",
    ),
    profile: {
      ellyId: staff.ellyId || staffEllyId,
      fullName: staff.fullName || "Clinic Doctor",
      departmentId: staff.departmentId || null,
      departmentName: staff.departmentName || null,
      clinicId: staff.clinicId || staff.departmentId || null,
      clinicName: staff.clinicName || staff.departmentName || null,
      specialization: staff.specialization || null,
      status: staff.status || null,
    },
  };
}

export async function resolveStaffAccess(staffEllyId) {
  const normalizedStaffId = normalizeStaffEllyId(staffEllyId);

  const response = await apiRequest("/hospitals/resolve-staff-access", {
    method: "POST",
    body: JSON.stringify({
      staffEllyId: normalizedStaffId,
    }),
  });

  if (response?.success === false) {
    throw new Error(response.message || "Doctor access could not be verified.");
  }

  return normalizeStaffAccessResponse(response, normalizedStaffId);
}

export function getStoredHospitalWorkspace() {
  try {
    const stored = sessionStorage.getItem(HOSPITAL_WORKSPACE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveHospitalWorkspace(workspace) {
  sessionStorage.setItem(
    HOSPITAL_WORKSPACE_STORAGE_KEY,
    JSON.stringify(workspace),
  );
}

export function clearStoredHospitalWorkspace() {
  sessionStorage.removeItem(HOSPITAL_WORKSPACE_STORAGE_KEY);
}
