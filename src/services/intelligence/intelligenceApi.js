import { apiRequest, apiRequestBlob } from "../config/config";

const DEFAULT_HOSPITAL_ID =
  import.meta.env.VITE_INTELLIGENCE_HOSPITAL_ID ||
  import.meta.env.VITE_ELLY_PARTNER_ID ||
  "HOSP-001";

function withHospital(path, hospitalId = DEFAULT_HOSPITAL_ID, extraParams = {}) {
  const params = new URLSearchParams({
    hospitalId,
    ...Object.entries(extraParams).reduce((result, [key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        result[key] = value;
      }
      return result;
    }, {}),
  });

  return `${path}?${params.toString()}`;
}

function hospitalHeaders(hospitalId = DEFAULT_HOSPITAL_ID) {
  return {
    "x-hospital-id": hospitalId,
    "x-elly-partner-id": hospitalId,
  };
}

async function intelligenceRequest(path, hospitalId, options = {}) {
  return apiRequest(path, {
    ...options,
    headers: {
      ...hospitalHeaders(hospitalId),
      ...(options.headers || {}),
    },
  });
}

export const intelligenceService = {
  defaultHospitalId: DEFAULT_HOSPITAL_ID,

  getPatientCensus(hospitalId) {
    return intelligenceRequest(
      withHospital("/intelligence/patient-census", hospitalId),
      hospitalId,
    );
  },

  getAnalyticsOverview(hospitalId) {
    return intelligenceRequest(
      withHospital("/intelligence/analytics/overview", hospitalId),
      hospitalId,
    );
  },

  getCapacityAnalytics(hospitalId) {
    return intelligenceRequest(
      withHospital("/intelligence/analytics/capacity", hospitalId),
      hospitalId,
    );
  },

  getEmergencyAnalytics(hospitalId) {
    return intelligenceRequest(
      withHospital("/intelligence/analytics/emergency", hospitalId),
      hospitalId,
    );
  },

  getStaffWorkloadAnalytics(hospitalId) {
    return intelligenceRequest(
      withHospital("/intelligence/analytics/staff-workload", hospitalId),
      hospitalId,
    );
  },

  getInventoryAnalytics(hospitalId) {
    return intelligenceRequest(
      withHospital("/intelligence/analytics/inventory", hospitalId),
      hospitalId,
    );
  },

  getEquipmentAnalytics(hospitalId) {
    return intelligenceRequest(
      withHospital("/intelligence/analytics/equipment", hospitalId),
      hospitalId,
    );
  },

  getActiveInsights(hospitalId, refresh = true) {
    return intelligenceRequest(
      withHospital("/intelligence/insights/active", hospitalId, { refresh }),
      hospitalId,
    );
  },

  getInsights(hospitalId) {
    return intelligenceRequest(
      withHospital("/intelligence/insights", hospitalId),
      hospitalId,
    );
  },

  acknowledgeInsight(id, hospitalId) {
    return intelligenceRequest(`/intelligence/insights/${id}/acknowledge`, hospitalId, {
      method: "POST",
      body: JSON.stringify({ actorId: "hospital-console" }),
    });
  },

  resolveInsight(id, hospitalId) {
    return intelligenceRequest(`/intelligence/insights/${id}/resolve`, hospitalId, {
      method: "POST",
      body: JSON.stringify({ actorId: "hospital-console" }),
    });
  },

  dismissInsight(id, hospitalId) {
    return intelligenceRequest(`/intelligence/insights/${id}/dismiss`, hospitalId, {
      method: "POST",
      body: JSON.stringify({ actorId: "hospital-console" }),
    });
  },

  getRecommendations(hospitalId) {
    return intelligenceRequest(
      withHospital("/intelligence/recommendations", hospitalId),
      hospitalId,
    );
  },

  acceptRecommendation(id, hospitalId) {
    return intelligenceRequest(`/intelligence/recommendations/${id}/accept`, hospitalId, {
      method: "POST",
      body: JSON.stringify({ actorId: "hospital-console" }),
    });
  },

  rejectRecommendation(id, hospitalId) {
    return intelligenceRequest(`/intelligence/recommendations/${id}/reject`, hospitalId, {
      method: "POST",
      body: JSON.stringify({ actorId: "hospital-console" }),
    });
  },

  // Logic-based patient performance: ALOS vs. target, discharge velocity /
  // throughput, and on-time discharge rate. The AI-based Readmission Risk
  // Tracker is returned as a disabled placeholder until that layer is built.
  getPatientPerformance: async ({ days } = {}) => {
    const query = days ? `?days=${encodeURIComponent(days)}` : '';
    return await apiRequest(`/intelligence/patient-performance${query}`);
  },

  // Logic-based patient registration performance: door-to-bed time vs. target,
  // intake abandonment rate, per-step dwell-time distribution by triage
  // priority, and a deterministic bottleneck ranking. The AI-based Workflow
  // Analysis (hidden-bottleneck detection + efficiency suggestions) is returned
  // as a disabled placeholder (bottleneck.aiAnalysis) until that layer is built.
  getRegistrationPerformance: async ({ days } = {}) => {
    const query = days ? `?days=${encodeURIComponent(days)}` : '';
    return await apiRequest(`/intelligence/registration-performance${query}`);
  },

  // Logic-based patient reports: automated daily census generation, population
  // health demographics (age/gender by department), incident logs (grounded in
  // surgical complications and cancelled procedures), and a compliance audit
  // readiness score. Pure querying, formatting, and aggregation — no AI/ML.
  getPatientReports: async ({ days } = {}) => {
    const query = days ? `?days=${encodeURIComponent(days)}` : '';
    return await apiRequest(`/intelligence/patient-reports${query}`);
  },

  // Download a generated census report PDF by report id.
  downloadPatientReportPdf: async (reportId, { days } = {}) => {
    const query = days ? `?days=${encodeURIComponent(days)}` : '';
    return await apiRequestBlob(`/intelligence/patient-reports/${encodeURIComponent(reportId)}/download${query}`);
  },
};
