import { apiRequest } from "../config/config";
import { gatewayUrl, hospitalIdentity } from "../emergency/emergencyRealtimeApi";

const identityHeaders = {
  "x-elly-id": hospitalIdentity.ellyId,
  "x-elly-partner-id": hospitalIdentity.partnerId,
  "x-elly-role": hospitalIdentity.role,
};

function query(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

function icuRequest(path, options = {}) {
  return apiRequest(path, {
    ...options,
    headers: {
      ...identityHeaders,
      ...(options.headers || {}),
    },
  });
}

export const icuService = {
  gatewayUrl,
  hospitalIdentity,

  getOverview: () => icuRequest("/icu/overview"),
  getPatients: (filters = {}) => icuRequest(`/icu/patients${query(filters)}`),
  getPatient: (id) => icuRequest(`/icu/patients/${id}`),
  getLatestVitals: (id) => icuRequest(`/icu/patients/${id}/vitals/latest`),
  getVitalsHistory: (id, filters = {}) => icuRequest(`/icu/patients/${id}/vitals/history${query(filters)}`),

  createAdmission: (payload) =>
    icuRequest("/icu/admissions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateAdmissionStatus: (id, status) =>
    icuRequest(`/icu/admissions/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  updateAdmissionBed: (id, payload) =>
    icuRequest(`/icu/admissions/${id}/bed`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  bindDevice: (id, payload) =>
    icuRequest(`/icu/admissions/${id}/device-bindings`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  unbindDevice: (id, deviceId) =>
    icuRequest(`/icu/admissions/${id}/device-bindings/${deviceId}`, {
      method: "DELETE",
    }),

  ingestVitals: (payload) =>
    icuRequest("/icu/vitals/ingest", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getAlerts: (filters = {}) => icuRequest(`/icu/alerts${query(filters)}`),

  acknowledgeAlert: (id) =>
    icuRequest(`/icu/alerts/${id}/acknowledge`, {
      method: "PATCH",
      body: "{}",
    }),

  resolveAlert: (id) =>
    icuRequest(`/icu/alerts/${id}/resolve`, {
      method: "PATCH",
      body: "{}",
    }),

  getCurrentShiftSignoffs: () => icuRequest("/icu/signoffs/current-shift"),

  createSignoff: (payload) =>
    icuRequest("/icu/signoffs", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateSignoff: (id, payload) =>
    icuRequest(`/icu/signoffs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
