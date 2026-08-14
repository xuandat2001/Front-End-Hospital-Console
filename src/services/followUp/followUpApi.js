import { apiRequest } from "../config/config";

function queryString(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const followUpApi = {
  getMyFollowUps(filters) {
    return apiRequest(`/follow-ups/me${queryString(filters)}`);
  },
  getMyFollowUpSummary() {
    return apiRequest("/follow-ups/me/summary");
  },
  getMyFollowUpById(id) {
    return apiRequest(`/follow-ups/me/${encodeURIComponent(id)}`);
  },
  createFromAppointment(appointmentId, payload) {
    return apiRequest(`/follow-ups/from-appointment/${encodeURIComponent(appointmentId)}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateMyFollowUp(id, payload) {
    return apiRequest(`/follow-ups/me/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  completeMyFollowUp(id, payload) {
    return apiRequest(`/follow-ups/me/${encodeURIComponent(id)}/complete`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  cancelMyFollowUp(id, payload) {
    return apiRequest(`/follow-ups/me/${encodeURIComponent(id)}/cancel`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};

export default followUpApi;
