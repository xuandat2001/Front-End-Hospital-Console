/**
 * Determines whether a patient is registered at the hospital of the current
 * session workspace. The patient identity can carry the hospital in several
 * shapes (single `hospitalId`, an enriched `registeredHospitals` list of
 * strings or objects), and the workspace exposes multiple identifiers
 * (`ellyHospitalId`, internal `id`, and `hospitalName`), so we normalise all
 * known keys to a comparable set.
 */

function addKey(set, value) {
  if (value === undefined || value === null) return;
  const normalized = String(value).trim().toUpperCase();
  if (normalized) set.add(normalized);
}

function collectHospitalKeys(source, set) {
  if (!source) return;

  if (typeof source === "string" || typeof source === "number") {
    addKey(set, source);
    return;
  }

  if (typeof source === "object") {
    [
      "hospitalId",
      "ellyHospitalId",
      "hospitalEllyId",
      "ellyId",
      "_id",
      "id",
      "hospitalName",
      "name",
    ].forEach((key) => addKey(set, source[key]));
  }
}

export function getSessionHospitalKeys(workspace) {
  const keys = new Set();
  if (!workspace) return keys;
  ["ellyHospitalId", "id", "hospitalName"].forEach((key) =>
    addKey(keys, workspace[key]),
  );
  return keys;
}

export function getPatientHospitalKeys(patient) {
  const keys = new Set();
  if (!patient) return keys;

  collectHospitalKeys(patient.hospitalId, keys);
  collectHospitalKeys(patient.ellyHospitalId, keys);

  if (Array.isArray(patient.registeredHospitals)) {
    patient.registeredHospitals.forEach((item) => collectHospitalKeys(item, keys));
  }

  return keys;
}

export function isPatientRegisteredAtHospital(patient, workspace) {
  const sessionKeys = getSessionHospitalKeys(workspace);
  if (sessionKeys.size === 0) return false;

  const patientKeys = getPatientHospitalKeys(patient);
  for (const key of patientKeys) {
    if (sessionKeys.has(key)) return true;
  }
  return false;
}
