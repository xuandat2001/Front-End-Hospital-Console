import { apiRequest } from "../config/config";

const DEFAULT_QUESTION =
  "What risks should I monitor for this patient, given connected care context and data limitations?";

/**
 * Patient-scoped intelligence-brain features via API gateway /ai/intelligence.
 * Distinct from hospital-intelligence census/performance routes under /intelligence.
 */
export const patientIntelligenceService = {
  syncPatientContextGraph({ patientEllyId, hospitalEllyId } = {}) {
    if (!patientEllyId) {
      throw new Error("patientEllyId is required");
    }

    return apiRequest("/ai/intelligence/patient-context-graph", {
      method: "POST",
      body: JSON.stringify({
        patientEllyId,
        ...(hospitalEllyId ? { hospitalEllyId } : {}),
      }),
    });
  },

  getPatientRiskMonitor({
    patientEllyId,
    hospitalEllyId,
    question,
    userId,
    userRole,
  } = {}) {
    if (!patientEllyId) {
      throw new Error("patientEllyId is required");
    }

    return apiRequest("/ai/intelligence/patient-risk-monitor", {
      method: "POST",
      body: JSON.stringify({
        patientEllyId,
        ...(hospitalEllyId ? { hospitalEllyId } : {}),
        question: question || DEFAULT_QUESTION,
        ...(userId ? { userId } : {}),
        ...(userRole ? { userRole } : {}),
      }),
    });
  },
};

export { DEFAULT_QUESTION };
