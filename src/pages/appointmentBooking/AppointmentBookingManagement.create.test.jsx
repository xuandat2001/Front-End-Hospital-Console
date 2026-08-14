/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(), getAppointments: vi.fn(), getDashboard: vi.fn(), toast: vi.fn(),
  departments: vi.fn(), doctors: vi.fn(), availability: vi.fn(), connect: vi.fn(),
}));

vi.mock("../../store/useSessionStore", () => ({ default: (selector) => selector({ workspace: { id: "6a259915b8327403156d2922", ellyHospitalId: "ELLY-HOSP-1" } }) }));
vi.mock("../../components/Toast", () => ({ toast: mocks.toast }));
vi.mock("../../services/appointmentBooking/appointmentApi", () => ({ appointmentService: {
  getAppointments: mocks.getAppointments, getAppointmentDashboard: mocks.getDashboard,
  createAppointment: mocks.create, getDoctorAvailability: mocks.availability,
} }));
vi.mock("../../services/appointmentBooking/appointmentRealtimeApi", () => ({ connectAppointmentRealtime: mocks.connect }));
vi.mock("../../services/core-modules/hospitalApi", () => ({ hospitalService: { getDepartmentsForHospital: mocks.departments } }));
vi.mock("../../services/core-modules/staffApi", () => ({ staffService: { getDoctors: mocks.doctors } }));
vi.mock("../../components/appointment-booking/AppointmentBookingDetailModal", () => ({ default: () => null }));
vi.mock("./components/AppointmentUpdateModal", () => ({ default: () => null }));
vi.mock("./tabs/PerformanceTab", () => ({ default: () => null }));
vi.mock("./tabs/PlanningTab", () => ({ default: () => null }));
vi.mock("./tabs/ResourcesTab", () => ({ default: () => null }));
vi.mock("./tabs/ReportsTab", () => ({ default: () => null }));
vi.mock("./tabs/DashboardTab", () => ({ default: ({ appointments, onAddBooking }) => <><button onClick={onAddBooking}>Add Booking</button><output data-testid="rows">{appointments.map((row) => row._id).join(",")}</output></> }));
vi.mock("./components/AppointmentCreateModal", () => ({ default: ({ onChange, onCreate, creating }) => <div role="dialog" aria-label="Create Appointment Booking">
  <button onClick={() => {
    const date = new Date();
    date.setHours(10, 0, 0, 0);
    const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    onChange({ target: { name: "patientEllyId", value: "ELLY-PAT-1" } });
    onChange({ target: { name: "departmentId", value: "6a259915b8327403156d2944" } });
    onChange({ target: { name: "doctorId", value: "6a259915b8327403156d2933" } });
    onChange({ target: { name: "appointmentDateTime", value: localDateTime } });
  }}>Fill</button>
  <button disabled={creating} onClick={onCreate}>Create</button>
</div> }));

import AppointmentBookingManagement from "./AppointmentBookingManagement";

beforeEach(() => {
  mocks.getAppointments.mockResolvedValue({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
  mocks.getDashboard.mockResolvedValue({ data: {} });
  mocks.departments.mockResolvedValue({ data: [] });
  mocks.doctors.mockResolvedValue({ data: [] });
  mocks.availability.mockResolvedValue({ data: { slots: [] } });
  mocks.connect.mockReturnValue({ disconnect: vi.fn() });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("optimized appointment creation", () => {
  it("submits once, closes, toasts, and inserts locally without reloading the list", async () => {
    let resolveCreate;
    mocks.create.mockReturnValue(new Promise((resolve) => { resolveCreate = resolve; }));
    const user = userEvent.setup();
    render(<AppointmentBookingManagement />);
    await user.click(screen.getByRole("button", { name: "Add Booking" }));
    await user.click(screen.getByRole("button", { name: "Fill" }));
    const createButton = screen.getByRole("button", { name: "Create" });
    await user.dblClick(createButton);
    expect(mocks.create).toHaveBeenCalledOnce();
    resolveCreate({ data: { _id: "created-1", status: "BOOKED", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), patient: { ellyId: "ELLY-PAT-1" }, doctor: { id: "6a259915b8327403156d2933" }, department: { id: "6a259915b8327403156d2944" }, appointmentDateTime: mocks.create.mock.calls[0][0].appointmentDateTime } });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Create Appointment Booking" })).not.toBeInTheDocument());
    expect(mocks.toast).toHaveBeenCalledWith("Appointment created successfully.", "success");
    expect(screen.getByTestId("rows")).toHaveTextContent("created-1");
    expect(mocks.getAppointments).toHaveBeenCalledOnce();
  });

  it("keeps the modal open and does not show success after a failed POST", async () => {
    mocks.create.mockRejectedValue(new Error("Slot unavailable"));
    vi.spyOn(window, "alert").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<AppointmentBookingManagement />);
    await user.click(screen.getByRole("button", { name: "Add Booking" }));
    await user.click(screen.getByRole("button", { name: "Fill" }));
    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    expect(screen.getByRole("dialog", { name: "Create Appointment Booking" })).toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalled();
  });
});
