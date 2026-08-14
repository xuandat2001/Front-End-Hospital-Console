import { apiRequest } from '../config/config';

export const patientAccessService = {
  getAll: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return await apiRequest(`/patient-access-requests${qs ? `?${qs}` : ''}`);
  },

  create: async (data) => {
    return await apiRequest('/patient-access-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getById: async (id) => {
    return await apiRequest(`/patient-access-requests/${id}`);
  },

  updateStatus: async (id, status) => {
    return await apiRequest(`/patient-access-requests/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  revoke: async (id) => {
    return await apiRequest(`/patient-access-requests/${id}/revoke`, {
      method: 'PUT',
    });
  },

  getMedicalHistory: async (doctorId, patientEllyId) => {
    const qs = new URLSearchParams({ doctorId }).toString();
    return await apiRequest(
      `/patient-access-requests/history/${encodeURIComponent(patientEllyId)}?${qs}`,
    );
  },
};
