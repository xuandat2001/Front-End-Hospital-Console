import { apiRequest } from '../config/config';

export const surgeryRequestService = {
  getAll: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return await apiRequest(`/surgery-requests${qs ? `?${qs}` : ''}`);
  },

  create: async (data) => {
    return await apiRequest('/surgery-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getById: async (id) => {
    return await apiRequest(`/surgery-requests/${id}`);
  },

  getByPatient: async (patientId, hospitalId) => {
    const qs = hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : '';
    return await apiRequest(`/surgery-requests/patient/${patientId}${qs}`);
  },

  update: async (id, data) => {
    return await apiRequest(`/surgery-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateStatus: async (id, status) => {
    return await apiRequest(`/surgery-requests/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  delete: async (id) => {
    return await apiRequest(`/surgery-requests/${id}`, {
      method: 'DELETE',
    });
  },
};
