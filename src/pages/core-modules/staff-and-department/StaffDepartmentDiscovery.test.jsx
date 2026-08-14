/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StaffDepartmentDiscovery from "./StaffDepartmentDiscovery";
import { hospitalService } from "../../../services/core-modules/hospitalApi";
import { staffService } from "../../../services/core-modules/staffApi";

vi.mock("../../../services/core-modules/hospitalApi", () => ({
  hospitalService: {
    getAllDepartmentsList: vi.fn(),
    getAllHospitals: vi.fn(),
  },
}));

vi.mock("../../../services/core-modules/staffApi", () => ({
  staffService: {
    getAllStaff: vi.fn(),
  },
}));

vi.mock("../../../components/graphs/MiniPieChart", () => ({
  default: () => <div data-testid="mini-pie-chart" />,
}));

vi.mock("../../../components/graphs/BarChart", () => ({
  default: () => <div data-testid="bar-chart" />,
}));

beforeEach(() => {
  staffService.getAllStaff.mockResolvedValue({ data: [] });
  hospitalService.getAllHospitals.mockResolvedValue({
    data: [{ _id: "hospital-1", ellyHospitalId: "HOSP-1", hospitalName: "Central Hospital" }],
  });
  hospitalService.getAllDepartmentsList.mockResolvedValue([
    {
      _id: "dept-1",
      ellyDepartmentId: "CARD-202",
      name: "Cardiology",
      specialty: "Heart medicine",
      description: "Cardiac care",
      hospital: { ellyHospitalId: "HOSP-1", hospitalName: "Central Hospital" },
      status: "ACTIVE",
    },
    {
      _id: "dept-2",
      ellyDepartmentId: "NEURO-100",
      name: "Neurology",
      specialty: "Brain care",
      description: "Neurological care",
      hospital: { ellyHospitalId: "HOSP-1", hospitalName: "Central Hospital" },
      status: "ACTIVE",
    },
  ]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("StaffDepartmentDiscovery", () => {
  it("finds departments by department id in department search mode", async () => {
    const user = userEvent.setup();

    render(<StaffDepartmentDiscovery defaultMode="department" />);

    await user.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(screen.getByText("Cardiology")).toBeInTheDocument());

    expect(screen.getByRole("option", { name: "Staff Name/ID" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Department/Specialty" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Hospital" })).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Cardiology, neurology, emergency..."), "CARD-202");

    expect(screen.getByText("Cardiology")).toBeInTheDocument();
    expect(screen.queryByText("Neurology")).not.toBeInTheDocument();
    expect(screen.getByText("1 matches")).toBeInTheDocument();
  });
});
