/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StaffManagement from "./StaffManagement";
import { staffService } from "../../../services/core-modules/staffApi";
import { hospitalService } from "../../../services/core-modules/hospitalApi";

const staffRows = [
  {
    _id: "staff-maya",
    ellyId: "ELLY-STAFF-1",
    fullName: "Dr Maya Chen",
    role: "doctor",
    departmentId: "CARD",
    specialization: "Cardiology",
    status: "AVAILABLE",
    schedule: [{ day: "MONDAY", startTime: "08:00", endTime: "16:00" }],
  },
  {
    _id: "staff-ivy",
    ellyId: "ELLY-STAFF-2",
    fullName: "Ivy Nguyen",
    role: "nurse",
    departmentId: "EMER",
    specialization: "Trauma",
    status: "BUSY",
    schedule: [],
  },
];

const departments = [
  { _id: "dept-card", ellyDepartmentId: "CARD", name: "Cardiology" },
  { _id: "dept-emer", ellyDepartmentId: "EMER", name: "Emergency" },
];

function makeStaffRows(count) {
  return Array.from({ length: count }, (_, index) => ({
    _id: `staff-${index + 1}`,
    ellyId: `ELLY-STAFF-${index + 1}`,
    fullName: `Staff Member ${index + 1}`,
    role: index % 2 ? "nurse" : "doctor",
    departmentId: index % 2 ? "EMER" : "CARD",
    specialization: index % 2 ? "Trauma" : "Cardiology",
    status: index % 2 ? "BUSY" : "AVAILABLE",
    schedule: [],
  }));
}

vi.mock("../../../services/core-modules/staffApi", () => ({
  staffService: {
    getAllStaff: vi.fn(),
    createStaff: vi.fn(),
    updateStaff: vi.fn(),
    deleteStaff: vi.fn(),
    assignDepartment: vi.fn(),
    updateSchedule: vi.fn(),
  },
}));

vi.mock("../../../services/core-modules/hospitalApi", () => ({
  hospitalService: {
    getAllHospitals: vi.fn(),
    getAllDepartmentsList: vi.fn(),
  },
}));

beforeEach(() => {
  staffService.getAllStaff.mockResolvedValue({ data: staffRows });
  staffService.createStaff.mockResolvedValue({ success: true });
  staffService.updateStaff.mockResolvedValue({ success: true });
  staffService.deleteStaff.mockResolvedValue({ success: true });
  staffService.assignDepartment.mockResolvedValue({ success: true });
  staffService.updateSchedule.mockResolvedValue({ success: true });
  hospitalService.getAllHospitals.mockResolvedValue({
    data: [{ ellyHospitalId: "HOSP-1", hospitalName: "City Hospital" }],
  });
  hospitalService.getAllDepartmentsList.mockResolvedValue(departments);
  vi.spyOn(window, "alert").mockImplementation(() => {});
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("StaffManagement", () => {
  it("loads staff with department names and filters by staff name", async () => {
    const user = userEvent.setup();
    render(<StaffManagement />);

    expect(await screen.findByText("Dr Maya Chen")).toBeInTheDocument();
    expect(screen.getByText(/CARD -/)).toBeInTheDocument();
    expect(screen.getByText("Cardiology")).toBeInTheDocument();
    expect(screen.getByText("Ivy Nguyen")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/search/i), "ivy");

    expect(screen.queryByText("Dr Maya Chen")).not.toBeInTheDocument();
    expect(screen.getByText("Ivy Nguyen")).toBeInTheDocument();
  });

  it("handles empty staff results and search misses without pagination", async () => {
    staffService.getAllStaff.mockResolvedValueOnce({ data: [] });
    const user = userEvent.setup();
    render(<StaffManagement />);

    await waitFor(() => expect(staffService.getAllStaff).toHaveBeenCalled());

    expect(screen.queryByRole("row", { name: /ELLY-STAFF/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("staff pagination")).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/search/i), "nobody");
    expect(screen.queryByText("Dr Maya Chen")).not.toBeInTheDocument();
  });

  it("paginates staff at the page boundary", async () => {
    staffService.getAllStaff.mockResolvedValueOnce({ data: makeStaffRows(7) });
    const user = userEvent.setup();
    render(<StaffManagement />);

    expect(await screen.findByText("Staff Member 1")).toBeInTheDocument();
    expect(screen.queryByText("Staff Member 7")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next staff page" }));

    expect(screen.getByText("Staff Member 7")).toBeInTheDocument();
    expect(screen.queryByText("Staff Member 1")).not.toBeInTheDocument();
  });

  it("creates a staff member from the modal", async () => {
    const user = userEvent.setup();
    render(<StaffManagement />);

    await user.click(await screen.findByRole("button", { name: "+ Add Staff" }));
    const dialog = screen.getByRole("dialog", { name: "Create Staff" });

    await user.type(within(dialog).getByPlaceholderText("Staff ID (unique)"), "ELLY-STAFF-9");
    await user.type(within(dialog).getByPlaceholderText("Staff Name"), "Dr Arun Patel");
    await user.type(within(dialog).getByPlaceholderText("Email"), "arun@example.test");
    await user.selectOptions(within(dialog).getAllByRole("combobox")[0], "HOSP-1");

    await user.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(staffService.createStaff).toHaveBeenCalledWith(
        expect.objectContaining({
          ellyId: "ELLY-STAFF-9",
          fullName: "Dr Arun Patel",
          email: "arun@example.test",
          hospitalId: "HOSP-1",
        }),
      ),
    );
    expect(staffService.getAllStaff.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("updates and deletes staff without changing production behavior", async () => {
    const user = userEvent.setup();
    render(<StaffManagement />);

    await screen.findByText("Dr Maya Chen");
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);

    const dialog = screen.getByRole("dialog", { name: "Edit Staff" });
    const nameInput = within(dialog).getByPlaceholderText("Staff Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Dr Maya Chen-Li");
    await user.click(within(dialog).getByRole("button", { name: "Update" }));

    await waitFor(() =>
      expect(staffService.updateStaff).toHaveBeenCalledWith(
        "ELLY-STAFF-1",
        expect.objectContaining({ fullName: "Dr Maya Chen-Li" }),
      ),
    );

    await user.click(screen.getAllByRole("button", { name: "Del" })[0]);

    expect(window.confirm).toHaveBeenCalledWith("Delete this staff member?");
    await waitFor(() => expect(staffService.deleteStaff).toHaveBeenCalledWith("ELLY-STAFF-1"));
  });

  it("assigns a department and saves a cleaned schedule", async () => {
    const user = userEvent.setup();
    render(<StaffManagement />);

    await screen.findByText("Dr Maya Chen");
    await user.click(screen.getAllByRole("button", { name: "Dept" })[0]);
    const assignDialog = screen.getByRole("dialog", { name: "Assign Department" });
    await user.selectOptions(within(assignDialog).getByRole("combobox"), "EMER");
    await user.click(within(assignDialog).getByRole("button", { name: "Assign" }));

    await waitFor(() =>
      expect(staffService.assignDepartment).toHaveBeenCalledWith("ELLY-STAFF-1", "EMER"),
    );

    await user.click(screen.getAllByRole("button", { name: "Sched" })[0]);
    const scheduleDialog = screen.getByRole("dialog", { name: "Schedule" });
    await user.click(within(scheduleDialog).getByRole("button", { name: "Save Schedule" }));

    await waitFor(() =>
      expect(staffService.updateSchedule).toHaveBeenCalledWith("ELLY-STAFF-1", [
        { day: "MONDAY", startTime: "08:00", endTime: "16:00" },
      ]),
    );
  });

  it("alerts when staff creation fails", async () => {
    staffService.createStaff.mockRejectedValueOnce(new Error("email must be unique"));
    const user = userEvent.setup();
    render(<StaffManagement />);

    await user.click(await screen.findByRole("button", { name: "+ Add Staff" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("email must be unique"));
  });

  it.each([
    ["update", "Edit", () => staffService.updateStaff.mockRejectedValueOnce(new Error("role is invalid"))],
    ["delete", "Del", () => staffService.deleteStaff.mockRejectedValueOnce(new Error("Cannot delete active staff"))],
    ["assign", "Dept", () => staffService.assignDepartment.mockRejectedValueOnce(new Error("Department not found"))],
    ["schedule", "Sched", () => staffService.updateSchedule.mockRejectedValueOnce(new Error("Schedule overlaps existing shift"))],
  ])("alerts when staff %s fails", async (flow, openerName, rejectOnce) => {
    rejectOnce();
    const user = userEvent.setup();
    render(<StaffManagement />);

    await screen.findByText("Dr Maya Chen");
    await user.click(screen.getAllByRole("button", { name: openerName })[0]);

    if (flow === "update") {
      await user.click(screen.getByRole("button", { name: "Update" }));
      await waitFor(() => expect(window.alert).toHaveBeenCalledWith("role is invalid"));
      return;
    }

    if (flow === "delete") {
      await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Cannot delete active staff"));
      return;
    }

    if (flow === "assign") {
      await user.click(screen.getByRole("button", { name: "Assign" }));
      await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Department not found"));
      return;
    }

    await user.click(screen.getByRole("button", { name: "Save Schedule" }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Schedule overlaps existing shift"));
  });
});
