import { apiRequest } from '../config/config';

const BASE = '/intelligence/admission-performance';

export const admissionPerformanceService = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.hospitalId) query.set('hospitalId', params.hospitalId);
    if (params.departmentId) query.set('departmentId', params.departmentId);
    if (params.doctorId) query.set('doctorId', params.doctorId);
    if (params.admissionType) query.set('admissionType', params.admissionType);
    if (params.dischargeOutcome) query.set('dischargeOutcome', params.dischargeOutcome);
    const qs = query.toString();
    return await apiRequest(`${BASE}${qs ? `?${qs}` : ''}`);
  },

  getById: async (id) => {
    return await apiRequest(`${BASE}/${id}`);
  },

  getStats: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.hospitalId) query.set('hospitalId', params.hospitalId);
    if (params.departmentId) query.set('departmentId', params.departmentId);
    const qs = query.toString();
    return await apiRequest(`${BASE}/stats${qs ? `?${qs}` : ''}`);
  },

  create: async (data) => {
    return await apiRequest(BASE, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return await apiRequest(`${BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return await apiRequest(`${BASE}/${id}`, {
      method: 'DELETE',
    });
  },
};
