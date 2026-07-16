import { apiRequest } from "../config/config";

export const HOSPITAL_WORKSPACE_STORAGE_KEY = "ellyHospitalWorkspace";

const ELLY_HOSPITAL_ID_PATTERN = /^ELLY-(ORG|HOSP)-[A-Z0-9][A-Z0-9-]*$/i;

export function normalizeEllyHospitalId(value = "") {
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
