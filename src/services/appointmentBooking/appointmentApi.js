import { apiRequest } from "../config/config";

export const appointmentService = {
  getAllAppointments: async (filters = {}) => {
    const params = new URLSearchParams();

    if (filters.patientEllyId) {
      params.append("patientEllyId", filters.patientEllyId);
    }

    const queryString = params.toString();

    return await apiRequest(
      queryString ? `/bookings?${queryString}` : "/bookings",
    );
  },

  getAppointmentById: async (id) => {
    return await apiRequest(`/bookings/${id}`);
  },

  getDoctorAvailability: async ({ doctorId, date, durationMinutes }) => {
    const params = new URLSearchParams();

    params.append("doctorId", doctorId);
    params.append("date", date);
    params.append("durationMinutes", durationMinutes);

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
      body: JSON.stringify({
        cancellationReason,
      }),
    });
  },
  completeAppointment: async (id, payload = {}) => {
    return await apiRequest(`/bookings/${id}/complete`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};

