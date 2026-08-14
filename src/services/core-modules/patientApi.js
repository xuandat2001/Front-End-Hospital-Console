import { apiRequest } from '../config/config';

export const patientService = {
  searchPatients: async (search, limit = 20) => apiRequest(`/patients/search?q=${encodeURIComponent(search)}&limit=${limit}`),
  getAllPatients: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.ellyId) params.append("ellyId", filters.ellyId);
    if (filters.search) params.append("search", filters.search);
    const qs = params.toString();
    return await apiRequest(qs ? `/patients?${qs}` : '/patients');
  },

  getPatientById: async (id) => {
    return await apiRequest(`/patients/${id}`);
  },

  getPatientByEllyId: async (ellyId) => {
    return await apiRequest(`/patients/elly/${ellyId}`);
  },

  getMedicalRecordsByEllyId: async (ellyId) => {
    return await apiRequest(`/patients/elly/${ellyId}/medical-records`);
  },

  createPatient: async (patientData) => {
    return await apiRequest('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData),
    });
  },

  updatePatient: async (id, patientData) => {
    return await apiRequest(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patientData),
    });
  },

  deletePatient: async (id) => {
    return await apiRequest(`/patients/${id}`, {
      method: 'DELETE',
    });
  },
};
