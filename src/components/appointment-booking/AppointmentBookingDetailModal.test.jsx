/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppointmentBookingDetailModal from "./AppointmentBookingDetailModal";

afterEach(cleanup);

describe("AppointmentBookingDetailModal", () => {
  it("portals above the booking list with a readable dense surface", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <AppointmentBookingDetailModal
        appointment={{
          _id: "appointment-1",
          status: "BOOKED",
          appointmentDateTime: "2026-07-30T08:00:00.000Z",
          durationMinutes: 30,
          patient: { fullName: "Jane Patient", ellyId: "ELLY-PAT-001" },
        }}
        onClose={onClose}
        formatDateTime={(value) => String(value)}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Appointment Booking Details" });
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog).toHaveClass("z-[13000]", "appointment-booking-detail-layer");
    expect(dialog.firstElementChild).toHaveClass("appointment-booking-detail-popup");
    expect(dialog.firstElementChild).toHaveAttribute("data-tone", "detail-popup");

    const closeButton = screen.getByRole("button", { name: "Close" });
    expect(closeButton).toHaveClass("min-h-10", "min-w-16");
    await user.click(closeButton);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
