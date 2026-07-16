import { apiRequest } from "../config/config";

const BASE = "/intelligence/room-performance";

export const roomPerformanceService = {
  getAllPerformances: async () => {
    return await apiRequest(BASE);
  },
  getPerformanceById: async (id) => {
    return await apiRequest(`${BASE}/${id}`);
  },
  getPerformancesByRoom: async (roomId) => {
    return await apiRequest(`${BASE}/room/${roomId}`);
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
