import {apiRequest} from '../config/config';

export const staffService = {
  // GET ALL
  getAllStaff: async (role) => {
    const params = role ? `?role=${role}` : "";
    return await apiRequest(`/staff${params}`);
  },

  getDoctors: async ({ hospitalId, departmentId } = {}) => {
    const params = new URLSearchParams({ role: "DOCTOR" });
    if (hospitalId) params.set("hospitalId", hospitalId);
    if (departmentId) params.set("departmentId", departmentId);
    return apiRequest(`/staff?${params.toString()}`);
  },

  // GET ONE
  getStaffById: async (id) => {
    return await apiRequest(`/staff/${id}`);
  },

  // CREATE
  createStaff: async (data) => {
    return await apiRequest("/staff", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // UPDATE
  updateStaff: async (id, data) => {
    return await apiRequest(`/staff/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // DELETE
  deleteStaff: async (id) => {
    return await apiRequest(`/staff/${id}`, {
      method: "DELETE",
    });
  },

  // ASSIGN DEPARTMENT
  assignDepartment: async (
    staffId,
    departmentId
  ) => {
    return await apiRequest(
      `/staff/${staffId}/department`,
      {
        method: "PUT",
        body: JSON.stringify({
          departmentId,
        }),
      }
    );
  },

  // UPDATE SCHEDULE
  getScheduleByWeek: async (staffId, weekStart) => {
    return await apiRequest(`/staff/${staffId}/schedule${weekStart ? `?weekStart=${weekStart}` : ""}`);
  },

  updateSchedule: async (staffId, schedule, weekStart) => {
    return await apiRequest(
      `/staff/${staffId}/schedule`,
      {
        method: "PUT",
        body: JSON.stringify({ schedule, weekStart })
      }
    );
  },
};
