import { apiRequest } from "../config/config";

const BASE = "/intelligence/surgery-performance";

export const surgeryPerformanceService = {
  getAllPerformances: async () => {
    return await apiRequest(BASE);
  },
  getPerformanceById: async (id) => {
    return await apiRequest(`${BASE}/${id}`);
  },
  getPerformancesBySurgery: async (surgeryId) => {
    return await apiRequest(`${BASE}/surgery/${surgeryId}`);
  },
  getPerformancesByDoctor: async (doctorId) => {
    return await apiRequest(`${BASE}/doctor/${doctorId}`);
  },
  createPerformance: async (data) => {
    return await apiRequest(BASE, { method: "POST", body: data });
  },
  updatePerformance: async (id, data) => {
    return await apiRequest(`${BASE}/${id}`, { method: "PUT", body: data });
  },
  deletePerformance: async (id) => {
    return await apiRequest(`${BASE}/${id}`, { method: "DELETE" });
  },
};
