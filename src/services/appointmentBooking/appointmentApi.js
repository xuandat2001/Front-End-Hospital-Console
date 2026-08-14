import { apiRequest } from "../config/config";

function appendQuery(params, filters = {}) {
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  });
  return params;
}

function withQuery(path, filters = {}) {
  const query = appendQuery(new URLSearchParams(), filters).toString();
  return query ? `${path}?${query}` : path;
}

export const appointmentService = {
  getAppointments: async (filters = {}) => {
    return await apiRequest(withQuery("/bookings", filters));
  },

  getAllAppointments: async (filters = {}) => {
    return await apiRequest(withQuery("/bookings", { ...filters, page: 1, limit: 100 }));
  },

  getAppointmentDashboard: async (filters = {}) => apiRequest(withQuery("/bookings/admin/dashboard", filters)),
  getAppointmentPerformance: async (filters = {}) => apiRequest(withQuery("/bookings/admin/performance", filters)),
  getAppointmentPlanning: async (filters = {}) => apiRequest(withQuery("/bookings/admin/planning", filters)),
  getAppointmentReports: async (filters = {}) => apiRequest(withQuery("/bookings/admin/reports", filters)),

  getAppointmentById: async (id) => {
    return await apiRequest(`/bookings/${id}`);
  },

  getMyAppointments: async (filters = {}) => {
    return await apiRequest(withQuery("/bookings/me", filters));
  },

  getMyTodayAppointments: async (filters = {}) => {
    return await apiRequest(withQuery("/bookings/me/today", filters));
  },

  getMyAppointmentSummary: async (date) => {
    return await apiRequest(
      withQuery("/bookings/me/summary", date ? { date } : {}),
    );
  },

  getMyAppointmentById: async (id) => {
    return await apiRequest(`/bookings/me/${encodeURIComponent(id)}`);
  },

  updateMyAppointmentStatus: async (id, payload) => {
    return await apiRequest(
      `/bookings/me/${encodeURIComponent(id)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },

  getDoctorAvailability: async ({ doctorId, date, durationMinutes }) => {
    const params = appendQuery(new URLSearchParams(), {
      doctorId,
      date,
      durationMinutes,
    });
    return await apiRequest(`/bookings/availability?${params.toString()}`);
  },

  createAppointment: async (appointmentData) => {
    return await apiRequest("/bookings", {
      method: "POST",
      body: JSON.stringify(appointmentData),
    });
  },

  updateAppointment: async (id, appointmentData) => {
    return await apiRequest(`/bookings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(appointmentData),
    });
  },

  cancelAppointment: async (id, cancellationReason = "") => {
    return await apiRequest(`/bookings/${id}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ cancellationReason }),
    });
  },

  completeAppointment: async (id, payload = {}) => {
    return await apiRequest(`/bookings/${id}/complete`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  updateAppointmentStatus: async (id, status, payload = {}) => apiRequest(`/bookings/${id}/status`, {
    method: "PATCH", body: JSON.stringify({ ...payload, status }),
  }),
};
