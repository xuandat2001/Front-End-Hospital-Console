/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DepartmentManagement from "./DepartmentManagement";
import { hospitalService } from "../../../services/core-modules/hospitalApi";

const departmentRows = [
  {
    _id: "dept-card",
    ellyDepartmentId: "CARD",
    name: "Cardiology",
    specialty: "Cardiac Care",
    hospitalId: "HOSP-1",
    status: "ACTIVE",
    floor: "4",
    roomPrefix: "C",
  },
  {
    _id: "dept-emer",
    ellyDepartmentId: "EMER",
    name: "Emergency",
    specialty: "Emergency Medicine",
    hospitalId: { hospitalName: "City Hospital" },
    status: "INACTIVE",
    floor: "1",
    roomPrefix: "E",
  },
];

function makeDepartmentRows(count) {
  return Array.from({ length: count }, (_, index) => ({
    _id: `dept-${index + 1}`,
    ellyDepartmentId: `DEPT-${index + 1}`,
    name: `Department ${index + 1}`,
    specialty: "General",
    hospitalId: "HOSP-1",
    status: "ACTIVE",
    floor: String(index + 1),
    roomPrefix: `D${index + 1}`,
  }));
}

vi.mock("../../../services/core-modules/hospitalApi", () => ({
  hospitalService: {
    getAllDepartmentsList: vi.fn(),
    getAllHospitals: vi.fn(),
    createDepartment: vi.fn(),
    updateDepartment: vi.fn(),
    deleteDepartment: vi.fn(),
  },
}));

beforeEach(() => {
  hospitalService.getAllDepartmentsList.mockResolvedValue(departmentRows);
  hospitalService.getAllHospitals.mockResolvedValue({
    data: [{ ellyHospitalId: "HOSP-1", hospitalName: "City Hospital" }],
  });
  hospitalService.createDepartment.mockResolvedValue({ success: true });
  hospitalService.updateDepartment.mockResolvedValue({ success: true });
  hospitalService.deleteDepartment.mockResolvedValue({ success: true });
  vi.spyOn(window, "alert").mockImplementation(() => {});
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DepartmentManagement", () => {
  it("loads departments and renders hospital/location details", async () => {
    render(<DepartmentManagement />);

    expect(await screen.findByText("Cardiology")).toBeInTheDocument();
    expect(screen.getByText("Emergency")).toBeInTheDocument();
    expect(screen.getByText("HOSP-1")).toBeInTheDocument();
    expect(screen.getByText("City Hospital")).toBeInTheDocument();
    expect(screen.getByText("4 - C")).toBeInTheDocument();
  });

  it("handles empty department results without pagination", async () => {
    hospitalService.getAllDepartmentsList.mockResolvedValueOnce([]);
    render(<DepartmentManagement />);

    await waitFor(() => expect(hospitalService.getAllDepartmentsList).toHaveBeenCalled());

    expect(screen.queryByRole("row", { name: /Cardiology/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("departments pagination")).not.toBeInTheDocument();
  });

  it("paginates departments at the page boundary", async () => {
    hospitalService.getAllDepartmentsList.mockResolvedValueOnce(makeDepartmentRows(7));
    const user = userEvent.setup();
    render(<DepartmentManagement />);

    expect(await screen.findByText("Department 1")).toBeInTheDocument();
    expect(screen.queryByText("Department 7")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next departments page" }));

    expect(screen.getByText("Department 7")).toBeInTheDocument();
    expect(screen.queryByText("Department 1")).not.toBeInTheDocument();
  });

  it("creates a department with active status and hospital assignment", async () => {
    const user = userEvent.setup();
    render(<DepartmentManagement />);

    await user.click(await screen.findByRole("button", { name: "+ Add Department" }));
    const dialog = screen.getByRole("dialog", { name: "Create Department" });

    await user.type(within(dialog).getByPlaceholderText("Department Name"), "Radiology");
    await user.type(within(dialog).getByPlaceholderText("Specialty"), "Imaging");
    await user.selectOptions(within(dialog).getByRole("combobox"), "HOSP-1");
    await user.type(within(dialog).getByPlaceholderText("Floor"), "2");
    await user.type(within(dialog).getByPlaceholderText("Room Prefix"), "R");
    await user.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(hospitalService.createDepartment).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Radiology",
          specialty: "Imaging",
          hospitalId: "HOSP-1",
          floor: "2",
          roomPrefix: "R",
        }),
      ),
    );
    expect(hospitalService.getAllDepartmentsList.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("updates and deletes departments", async () => {
    const user = userEvent.setup();
    render(<DepartmentManagement />);

    await screen.findByText("Cardiology");
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);

    const dialog = screen.getByRole("dialog", { name: "Edit Department" });
    const nameInput = within(dialog).getByPlaceholderText("Department Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Cardiac Center");
    await user.click(within(dialog).getByRole("button", { name: "Update" }));

    await waitFor(() =>
      expect(hospitalService.updateDepartment).toHaveBeenCalledWith(
        "dept-card",
        expect.objectContaining({ name: "Cardiac Center" }),
      ),
    );

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    expect(window.confirm).toHaveBeenCalledWith("Delete this department?");
    await waitFor(() => expect(hospitalService.deleteDepartment).toHaveBeenCalledWith("dept-card"));
  });

  it("alerts when department creation fails", async () => {
    hospitalService.createDepartment.mockRejectedValueOnce(new Error("Hospital was not found."));
    const user = userEvent.setup();
    render(<DepartmentManagement />);

    await user.click(await screen.findByRole("button", { name: "+ Add Department" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Hospital was not found."));
  });

  it.each([
    ["update", "Edit", () => hospitalService.updateDepartment.mockRejectedValueOnce(new Error("status is invalid"))],
    ["delete", "Delete", () => hospitalService.deleteDepartment.mockRejectedValueOnce(new Error("Department has assigned staff"))],
  ])("alerts when department %s fails", async (flow, openerName, rejectOnce) => {
    rejectOnce();
    const user = userEvent.setup();
    render(<DepartmentManagement />);

    await screen.findByText("Cardiology");
    await user.click(screen.getAllByRole("button", { name: openerName })[0]);

    if (flow === "update") {
      await user.click(screen.getByRole("button", { name: "Update" }));
      await waitFor(() => expect(window.alert).toHaveBeenCalledWith("status is invalid"));
      return;
    }

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Department has assigned staff"));
  });
});
