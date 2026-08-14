/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AppointmentStatusOverview from "./AppointmentStatusOverview";

function todayAt(hour) {
  const value = new Date();
  value.setHours(hour, 0, 0, 0);
  return value.toISOString();
}

describe("AppointmentStatusOverview", () => {
  it("counts in-progress appointments under booked", () => {
    render(
      <AppointmentStatusOverview
        appointments={[
          { _id: "booked", status: "BOOKED", appointmentDateTime: todayAt(9) },
          { _id: "started", status: "IN_PROGRESS", appointmentDateTime: todayAt(10) },
        ]}
        aiSummarySlot={null}
        typeSummarySlot={null}
      />,
    );

    expect(screen.getByText("Booked")).toBeInTheDocument();
    expect(screen.getByText("2 (100%)")).toBeInTheDocument();
    expect(screen.queryByText("In progress")).not.toBeInTheDocument();
  });
});
