/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdmissionManagement from "./AdmissionManagement";

const serviceMocks = vi.hoisted(() => ({
  assignAdmission: vi.fn(),
  dischargePatient: vi.fn(),
  getAllAdmissions: vi.fn(),
  getAllPatients: vi.fn(),
  getAllRooms: vi.fn(),
  updateAdmissionStatus: vi.fn(),
}));

vi.mock("../../../services/core-modules/hospitalApi", () => ({
  admissionService: {
    assignAdmission: serviceMocks.assignAdmission,
    dischargePatient: serviceMocks.dischargePatient,
    getAllAdmissions: serviceMocks.getAllAdmissions,
    updateAdmissionStatus: serviceMocks.updateAdmissionStatus,
  },
}));

vi.mock("../../../services/core-modules/patientApi", () => ({
  patientService: { getAllPatients: serviceMocks.getAllPatients },
}));

vi.mock("../../../services/core-modules/roomApi", () => ({
  roomService: { getAllRooms: serviceMocks.getAllRooms },
}));

const admission = {
  _id: "admission-1",
  admittedAt: "2026-07-31T06:00:00.000Z",
  assignedNurseIds: ["NURSE-1"],
  bedId: "BED-1",
  currentStatus: "ADMITTED",
  department: { id: "DEPT-1", name: "Emergency" },
  doctor: { id: "DOCTOR-1", name: "Demo Doctor" },
  patientId: "PATIENT-1",
  roomId: "ROOM-1",
};

function arrangeServices() {
  serviceMocks.getAllAdmissions.mockResolvedValue({ data: [admission] });
  serviceMocks.getAllPatients.mockResolvedValue({
    data: [{ _id: "PATIENT-1", fullName: "Demo Patient" }],
  });
  serviceMocks.getAllRooms.mockResolvedValue({
    data: [{ _id: "ROOM-1", roomNumber: "101" }],
  });
  serviceMocks.updateAdmissionStatus.mockResolvedValue({});
  serviceMocks.assignAdmission.mockResolvedValue({});
}

async function renderAdmissionManagement() {
  arrangeServices();
  render(<AdmissionManagement />);
  await screen.findByText("Demo Patient");
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AdmissionManagement edit modes", () => {
  it("updates admission status through the status edit mode", async () => {
    const user = userEvent.setup();
    await renderAdmissionManagement();

    await user.click(screen.getByRole("button", { name: "Status" }));
    await user.selectOptions(screen.getByLabelText("New Status"), "UNDER_TREATMENT");
    await user.click(screen.getByRole("button", { name: "Update Status" }));

    await waitFor(() =>
      expect(serviceMocks.updateAdmissionStatus).toHaveBeenCalledWith(
        "admission-1",
        "UNDER_TREATMENT",
      ),
    );
  });

  it("saves the supported assignment edit mode without exposing a dead full edit", async () => {
    const user = userEvent.setup();
    await renderAdmissionManagement();

    await user.click(screen.getByRole("button", { name: "Assign" }));
    const modal = screen
      .getByRole("heading", { name: "Update Assignments" })
      .closest(".w-full");

    expect(modal).not.toBeNull();
    expect(within(modal).queryByRole("button", { name: "Update" })).not.toBeInTheDocument();

    await user.clear(within(modal).getByLabelText("Doctor ID"));
    await user.type(within(modal).getByLabelText("Doctor ID"), "DOCTOR-2");
    await user.click(within(modal).getByRole("button", { name: "Assign" }));

    await waitFor(() =>
      expect(serviceMocks.assignAdmission).toHaveBeenCalledWith(
        "admission-1",
        expect.objectContaining({ doctor: "DOCTOR-2" }),
      ),
    );
  });
});
