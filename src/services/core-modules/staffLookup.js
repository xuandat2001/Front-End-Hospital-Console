import { staffService } from './staffApi';

let cache = null;
let promise = null;

const ROLE_PREFIX = {
  doctor: 'Dr. ',
  technician: 'Technician ',
  nurse: 'Nurse ',
  RADIOLOGIST: 'Dr. ',
  LAB_DOCTOR: 'Dr. ',
  PATHOLOGIST: 'Dr. ',
  ATTENDING_DOCTOR: 'Dr. ',
  TECHNICIAN: 'Technician ',
  NURSE: 'Nurse ',
};

function buildLookup(staffList) {
  const map = {};
  for (const s of staffList) {
    const prefix = ROLE_PREFIX[s.role] || '';
    map[s.ellyId] = prefix + s.fullName;
  }
  return map;
}

export async function ensureStaffLoaded() {
  if (cache) return cache;
  if (promise) return promise;
  promise = (async () => {
    try {
      const res = await staffService.getAllStaff();
      const list = res.data || [];
      cache = buildLookup(list);
      return cache;
    } catch {
      cache = {};
      return cache;
    }
  })();
  return promise;
}

export function staffName(ellyId) {
  if (!ellyId) return '';
  return cache?.[ellyId] || ellyId;
}
