/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import CancelAppointmentModal from "./CancelAppointmentModal";

afterEach(cleanup);

const appointment = {
  _id: "appointment-1",
  appointmentDateTime: "2026-08-07T03:00:00.000Z",
  patient: { name: "John Doe" },
};

describe("CancelAppointmentModal", () => {
  it("requires a reason before cancellation", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <CancelAppointmentModal
        appointment={appointment}
        submitting={false}
        onBack={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    const submit = screen.getByRole("button", { name: "Cancel Appointment" });
    expect(submit).toBeDisabled();

    await user.type(
      screen.getByLabelText("Cancellation reason"),
      "Doctor unavailable",
    );
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(onConfirm).toHaveBeenCalledWith("Doctor unavailable");
  });
});
