import { describe, expect, it } from "vitest";
import {
  buildWeekRows,
  getWeekRange,
  sortDoctorScheduleAppointments,
  statusCounts,
} from "./doctorAppointmentUtils";

describe("doctor appointment dashboard helpers", () => {
  it("counts only supported visit statuses", () => {
    expect(statusCounts([
      { status: "BOOKED" },
      { status: "in_progress" },
      { status: "completed" },
      { status: "NO_SHOW" },
      { status: "CANCELED" },
      { status: "UNKNOWN" },
    ])).toEqual({ BOOKED: 2, COMPLETED: 1, NO_SHOW: 1, CANCELED: 1 });
  });

  it("builds a Monday-to-Sunday workload preview", () => {
    const value = new Date(2026, 7, 7, 12);
    const { start } = getWeekRange(value);
    const monday = new Date(start);
    const friday = new Date(start);
    friday.setDate(start.getDate() + 4);

    const rows = buildWeekRows([
      { appointmentDateTime: monday.toISOString() },
      { appointmentDateTime: monday.toISOString() },
      { appointmentDateTime: friday.toISOString() },
    ], value);

    expect(rows).toHaveLength(7);
    expect(rows[0].count).toBe(2);
    expect(rows[4].count).toBe(1);
  });

  it("places final appointments below active and booked appointments", () => {
    const appointments = [
      { _id: "no-show", status: "NO_SHOW", appointmentDateTime: "2026-08-11T10:30:00Z" },
      { _id: "completed", status: "COMPLETED", appointmentDateTime: "2026-08-11T16:15:00Z" },
      { _id: "booked-later", status: "BOOKED", appointmentDateTime: "2026-08-11T16:45:00Z" },
      { _id: "in-progress", status: "IN_PROGRESS", appointmentDateTime: "2026-08-11T16:30:00Z" },
      { _id: "booked-earlier", status: "BOOKED", appointmentDateTime: "2026-08-11T15:45:00Z" },
      { _id: "canceled", status: "CANCELED", appointmentDateTime: "2026-08-11T09:00:00Z" },
    ];

    expect(sortDoctorScheduleAppointments(appointments).map(({ _id }) => _id)).toEqual([
      "in-progress",
      "booked-earlier",
      "booked-later",
      "canceled",
      "no-show",
      "completed",
    ]);
    expect(appointments[0]._id).toBe("no-show");
  });
});
