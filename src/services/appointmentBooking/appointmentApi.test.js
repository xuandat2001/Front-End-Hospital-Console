import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
vi.mock("../config/config", () => ({ apiRequest }));

const { appointmentService } = await import("./appointmentApi");

describe("doctor appointment API", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    apiRequest.mockResolvedValue({ success: true, data: [] });
  });

  it("uses the authenticated /me endpoint without identity filters", async () => {
    await appointmentService.getMyAppointments({
      status: "BOOKED",
      page: 1,
      limit: 20,
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/bookings/me?status=BOOKED&page=1&limit=20",
    );
  });

  it("loads doctor dashboard summary for an explicit local date", async () => {
    await appointmentService.getMyAppointmentSummary("2026-08-07");
    expect(apiRequest).toHaveBeenCalledWith(
      "/bookings/me/summary?date=2026-08-07",
    );
  });

  it("updates status through the doctor-scoped endpoint", async () => {
    await appointmentService.updateMyAppointmentStatus("appointment 1", {
      status: "CANCELED",
      cancellationReason: "Doctor unavailable",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/bookings/me/appointment%201/status",
      {
        method: "PATCH",
        body: JSON.stringify({
          status: "CANCELED",
          cancellationReason: "Doctor unavailable",
        }),
      },
    );
  });
});
