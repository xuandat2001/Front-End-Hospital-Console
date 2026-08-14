/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppointmentCreateModal from "./AppointmentCreateModal";

afterEach(cleanup);

describe("AppointmentCreateModal", () => {
  it("portals the tinted booking form above the dashboard", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <AppointmentCreateModal
        formData={{
          patientEllyId: "",
          departmentId: "",
          doctorId: "",
          appointmentDate: "",
          durationMinutes: "30",
          appointmentDateTime: "",
          consultationType: "IN_PERSON",
          reason: "",
          notes: "",
        }}
        departments={[]}
        doctors={[]}
        onChange={vi.fn()}
        onClose={onClose}
        onCreate={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Create Appointment Booking" });
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog).toHaveClass("z-[12000]", "console-tinted-popup-layer");
    expect(dialog.firstElementChild).toHaveClass("console-tinted-popup");

    const patientId = screen.getByPlaceholderText("Patient ELLY ID");
    const reason = screen.getByPlaceholderText("Reason");
    expect(patientId).toHaveClass("appointment-create-field", "bg-slate-800", "text-white");
    expect(reason).toHaveClass("appointment-create-field", "bg-slate-800", "text-white");
    expect(patientId).toHaveAttribute("autocomplete", "off");
    expect(reason).toHaveAttribute("autocomplete", "off");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps the original Create button but disables it during submission", () => {
    render(
      <AppointmentCreateModal
        formData={{ patientEllyId: "", departmentId: "", doctorId: "", appointmentDate: "", durationMinutes: "30", appointmentDateTime: "", consultationType: "IN_PERSON", reason: "", notes: "" }}
        departments={[]}
        doctors={[]}
        creating
        onChange={vi.fn()}
        onClose={vi.fn()}
        onCreate={vi.fn()}
      />,
    );
    const button = screen.getByRole("button", { name: "Create" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("rounded", "bg-teal-600");
  });
});
