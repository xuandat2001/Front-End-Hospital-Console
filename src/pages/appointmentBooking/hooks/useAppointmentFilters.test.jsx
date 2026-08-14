/* @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import useAppointmentFilters from "./useAppointmentFilters";

const appointments = [
  {
    _id: "latest-appointment",
    createdAt: "2026-08-09T10:00:00.000Z",
    appointmentDateTime: "2026-08-20T10:00:00.000Z",
  },
  {
    _id: "newest-booking",
    createdAt: "2026-08-10T10:00:00.000Z",
    appointmentDateTime: "2026-08-15T10:00:00.000Z",
  },
];

describe("useAppointmentFilters ordering", () => {
  it("orders bookings by newest creation date by default", () => {
    const { result } = renderHook(() => useAppointmentFilters(appointments));

    act(() => result.current.clearFilters());
    expect(result.current.filteredAppointments.map(({ _id }) => _id)).toEqual([
      "newest-booking",
      "latest-appointment",
    ]);

  });
});
