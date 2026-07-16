import { apiRequest } from "../config/config";

const BASE = "/intelligence/staff-performance";

export const performanceService = {
  getAllPerformances: async () => {
    return await apiRequest(BASE);
  },
  getPerformanceById: async (id) => {
    return await apiRequest(`${BASE}/${id}`);
  },
  getPerformancesByStaff: async (staffId) => {
    return await apiRequest(`${BASE}/staff/${staffId}`);
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
