/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import TodaySchedule from "./TodaySchedule";

const appointments = Array.from({ length: 6 }, (_, index) => ({
  _id: `appointment-${index + 1}`,
  appointmentDateTime: `2026-08-07T${String(9 + index).padStart(2, "0")}:00:00.000Z`,
  patient: { name: `Patient ${index + 1}` },
  consultationType: index % 2 ? "PHONE" : "IN_PERSON",
  reason: `Reason ${index + 1}`,
  status: "BOOKED",
}));

afterEach(cleanup);

describe("TodaySchedule", () => {
  it("shows five rows in the card and all rows in the popup", async () => {
    const user = userEvent.setup();
    render(<TodaySchedule appointments={appointments} loading={false} onView={vi.fn()} />);

    expect(screen.queryByRole("columnheader", { name: "View" })).not.toBeInTheDocument();
    expect(screen.getByText("Patient 1")).toBeInTheDocument();
    expect(screen.getByText("Patient 5")).toBeInTheDocument();
    expect(screen.queryByText("Patient 6")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /view all appointments/i }));

    const dialog = screen.getByRole("dialog", { name: "Today's Appointments" });
    expect(within(dialog).getByText("6 appointments scheduled today")).toBeInTheDocument();
    expect(within(dialog).getByText("Patient 5")).toBeInTheDocument();
    expect(within(dialog).getByText("Patient 6")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Today's Appointments" })).not.toBeInTheDocument();
  });

  it("keeps the full-list popup open while appointment details are displayed", async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    render(<TodaySchedule appointments={appointments} loading={false} onView={onView} />);

    await user.click(screen.getByRole("button", { name: /view all appointments/i }));
    const dialog = screen.getByRole("dialog", { name: "Today's Appointments" });
    await user.click(within(dialog).getByRole("button", { name: "View Patient 6 appointment" }));

    expect(onView).toHaveBeenCalledWith("appointment-6");
    expect(screen.getByRole("dialog", { name: "Today's Appointments" })).toBeInTheDocument();
  });
});
