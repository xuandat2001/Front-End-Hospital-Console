/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StaffSchedule from "./StaffSchedule";
import { hospitalService } from "../../../services/core-modules/hospitalApi";
import { staffService } from "../../../services/core-modules/staffApi";

vi.mock("../../../services/core-modules/hospitalApi", () => ({
  hospitalService: {
    getAllDepartmentsList: vi.fn(),
  },
}));

vi.mock("../../../services/core-modules/staffApi", () => ({
  staffService: {
    getAllStaff: vi.fn(),
    getScheduleByWeek: vi.fn(),
    updateSchedule: vi.fn(),
  },
}));

vi.mock("../../../components/staff/StaffCalendar", () => ({
  default: ({ onShiftDelete }) => (
    <button
      type="button"
      data-testid="staff-calendar"
      onClick={() =>
        onShiftDelete?.(
          {
            _id: "staff-1",
            ellyId: "ELLY-STAFF-1",
            fullName: "Dr Amelia Stone",
            schedule: [
              { day: "THURSDAY", weekStart: "2026-08-10", startTime: "08:00", endTime: "16:00" },
              { day: "FRIDAY", weekStart: "2026-08-10", startTime: "09:00", endTime: "17:00" },
            ],
          },
          { day: "THURSDAY", weekStart: "2026-08-10", startTime: "08:00", endTime: "16:00" },
          new Date("2026-08-13T00:00:00"),
        )
      }
    >
      Delete calendar shift
    </button>
  ),
}));

beforeEach(() => {
  hospitalService.getAllDepartmentsList.mockResolvedValue([]);
  staffService.getAllStaff.mockResolvedValue({
    data: [
      { _id: "staff-1", ellyId: "ELLY-STAFF-1", fullName: "Dr Amelia Stone", role: "DOCTOR" },
      { _id: "staff-2", ellyId: "ELLY-STAFF-2", fullName: "Nurse Ben Carter", role: "NURSE" },
    ],
  });
  staffService.getScheduleByWeek.mockResolvedValue({
    data: [{ day: "MONDAY", startTime: "08:00", endTime: "16:00" }],
  });
  staffService.updateSchedule.mockResolvedValue({ success: true });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("StaffSchedule", () => {
  it("selects a staff member from search results to view shifts", async () => {
    const user = userEvent.setup();

    render(<StaffSchedule />);

    await waitFor(() => expect(screen.getByText("Dr Amelia Stone")).toBeInTheDocument());

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search staff name or ID..."), "amelia");

    expect(screen.getByText("Dr Amelia Stone")).toBeInTheDocument();
    expect(screen.queryByText("Nurse Ben Carter")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Dr Amelia Stone/i }));

    await waitFor(() =>
      expect(staffService.getScheduleByWeek).toHaveBeenCalledWith(
        "ELLY-STAFF-1",
        expect.any(String),
      ),
    );

    expect(screen.getByText(/Viewing shifts for/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search staff name or ID...")).toHaveValue("");
    expect(screen.queryByRole("button", { name: /View shifts/i })).not.toBeInTheDocument();
    expect(screen.getByText("MON")).toBeInTheDocument();
    expect(screen.getByDisplayValue("08:00")).toBeInTheDocument();
  });

  it("clears a shift when marking the day as off", async () => {
    const user = userEvent.setup();

    render(<StaffSchedule />);

    await waitFor(() => expect(screen.getByText("Dr Amelia Stone")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Dr Amelia Stone/i }));
    await waitFor(() => expect(screen.getByDisplayValue("08:00")).toBeInTheDocument());

    const offDayCheckbox = screen.getAllByRole("checkbox", { name: "Off" })[0];
    expect(offDayCheckbox).not.toBeChecked();

    await user.click(offDayCheckbox);

    expect(screen.queryByDisplayValue("08:00")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("16:00")).not.toBeInTheDocument();
    expect(offDayCheckbox).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Save Schedule" }));

    await waitFor(() =>
      expect(staffService.updateSchedule).toHaveBeenCalledWith(
        "ELLY-STAFF-1",
        [],
        expect.any(String),
      ),
    );
  });

  it("deletes a shift from the monthly calendar split view", async () => {
    const user = userEvent.setup();

    render(<StaffSchedule />);

    await user.click(screen.getByRole("button", { name: "Delete calendar shift" }));

    await waitFor(() =>
      expect(staffService.updateSchedule).toHaveBeenCalledWith(
        "ELLY-STAFF-1",
        [{ day: "FRIDAY", weekStart: "2026-08-10", startTime: "09:00", endTime: "17:00" }],
        "2026-08-10",
      ),
    );

    expect(screen.getByText("Shift deleted.")).toBeInTheDocument();
  });
});
