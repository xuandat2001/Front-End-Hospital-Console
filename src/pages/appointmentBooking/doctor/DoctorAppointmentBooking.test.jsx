/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dashboardHook = vi.fn();
const refreshMock = vi.fn();
const appointmentApi = vi.hoisted(() => ({
  getMyAppointmentById: vi.fn(),
  updateMyAppointmentStatus: vi.fn(),
}));

vi.mock("../../../services/appointmentBooking/appointmentApi", () => ({
  appointmentService: appointmentApi,
}));

vi.mock("./hooks/useDoctorAppointmentDashboard", () => ({
  default: dashboardHook,
}));

vi.mock("./components/TodaySchedule", () => ({
  default: ({ onView }) => <button type="button" onClick={() => onView("appointment-1")}>Today schedule</button>,
}));
vi.mock("./components/NextAppointmentCard", () => ({ default: () => <div>Next appointment</div> }));
vi.mock("./components/VisitStatusChart", () => ({ default: () => <div>Visit status</div> }));
vi.mock("./components/DoctorWeekSchedule", () => ({ default: () => <div>This week</div> }));
vi.mock("./components/CancelAppointmentModal", () => ({ default: () => null }));
vi.mock("./components/PatientRecordModal", () => ({
  default: ({ patient, onClose }) => patient ? (
    <div role="dialog" aria-label="Patient record">
      <span>{patient.name}</span>
      <span>{patient.ellyId}</span>
      <button type="button" onClick={onClose}>Close patient record</button>
    </div>
  ) : null,
}));
vi.mock("../../../components/appointment-booking/AppointmentBookingDetailModal", () => ({
  default: ({ appointment, footerActions }) => appointment ? <div role="dialog" aria-label="Appointment details">{footerActions}</div> : null,
}));

const { default: DoctorAppointmentBooking } = await import("./DoctorAppointmentBooking");

afterEach(cleanup);

beforeEach(() => {
  dashboardHook.mockReset();
  refreshMock.mockReset();
  appointmentApi.getMyAppointmentById.mockReset();
  dashboardHook.mockReturnValue({
    summary: null,
    todayAppointments: [],
    counts: { BOOKED: 0, IN_PROGRESS: 0, COMPLETED: 0, NO_SHOW: 0, CANCELED: 0 },
    weekRows: [],
    loading: false,
    updatingId: "",
    error: "",
    refresh: refreshMock,
    updateStatus: vi.fn(),
  });
});

describe("DoctorAppointmentBooking", () => {
  it("renders non-dashboard tabs as frontend prototype views without loading dashboard data", () => {
    render(<DoctorAppointmentBooking activeTab="performance" />);
    expect(screen.getByRole("heading", { name: "Appointment Performance" })).toBeInTheDocument();
    expect(screen.getAllByText("Completion rate").length).toBeGreaterThan(0);
    expect(dashboardHook).not.toHaveBeenCalled();
  });

  it("renders the doctor workspace header and refreshes dashboard data", () => {
    render(<DoctorAppointmentBooking activeTab="dashboard" />);
    expect(screen.queryByText("Summary cards")).not.toBeInTheDocument();
    expect(screen.getByText("Today schedule")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My Appointments" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(refreshMock).toHaveBeenCalledOnce();
    expect(dashboardHook).toHaveBeenCalledOnce();
  });

  it("opens the appointment patient record in a popup without navigating away", async () => {
    appointmentApi.getMyAppointmentById.mockResolvedValue({
      data: {
        _id: "appointment-1",
        status: "BOOKED",
        patient: { name: "Jane", ellyId: "ELLY-USR-01" },
      },
    });
    render(<DoctorAppointmentBooking activeTab="dashboard" />);

    fireEvent.click(screen.getByRole("button", { name: "Today schedule" }));
    fireEvent.click(await screen.findByRole("button", { name: "View Record" }));

    expect(screen.getByRole("dialog", { name: "Patient record" })).toBeInTheDocument();
    expect(screen.getByText("ELLY-USR-01")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Appointment details" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close patient record" }));
    expect(screen.queryByRole("dialog", { name: "Patient record" })).not.toBeInTheDocument();
  });

});
