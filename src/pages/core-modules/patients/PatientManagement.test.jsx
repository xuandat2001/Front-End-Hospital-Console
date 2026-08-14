/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import PatientManagement from "./PatientManagement";

vi.mock("../../../services/core-modules/patientApi", () => ({
  patientService: {
    getAllPatients: vi.fn().mockResolvedValue({
      data: [{
        _id: "patient-1",
        ellyId: "ELLY-PAT-001",
        fullName: "Jane Patient",
        gender: "FEMALE",
        dateOfBirth: "1990-01-15T00:00:00.000Z",
        registeredHospitals: [],
      }],
    }),
    updatePatient: vi.fn(),
    deletePatient: vi.fn(),
    getPatientByEllyId: vi.fn(),
  },
}));

describe("PatientManagement edit dialog", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("portals the tinted edit dialog above the dashboard and closes it", async () => {
    const user = userEvent.setup();
    render(<PatientManagement />);

    await user.click(await screen.findByRole("button", { name: "Edit" }));

    const dialog = screen.getByRole("dialog", { name: "Edit Patient" });
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog).toHaveClass("z-[12000]", "console-tinted-popup-layer");
    expect(dialog.firstElementChild).toHaveClass("console-tinted-popup");

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Edit Patient" })).not.toBeInTheDocument();
    });
  });
});
