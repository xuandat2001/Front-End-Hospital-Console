/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PatientRecordView from "./PatientRecordView";

const mocks = vi.hoisted(() => ({
  getPatientByEllyId: vi.fn(),
  getMedicalRecordsByEllyId: vi.fn(),
  getAdmissionsByPatient: vi.fn(),
  getSurgeriesByPatient: vi.fn(),
  getRegistrationsByEllyId: vi.fn(),
  getIcuPatients: vi.fn(),
  getVitalsHistory: vi.fn(),
}));

vi.mock("../../../../services/core-modules/patientApi", () => ({
  patientService: {
    getPatientByEllyId: mocks.getPatientByEllyId,
    getMedicalRecordsByEllyId: mocks.getMedicalRecordsByEllyId,
  },
}));

vi.mock("../../../../services/core-modules/icuApi", () => ({
  icuService: {
    getPatients: mocks.getIcuPatients,
    getVitalsHistory: mocks.getVitalsHistory,
  },
}));

vi.mock("../../../../services/core-modules/hospitalApi", () => ({
  admissionService: {
    getAdmissionsByPatient: mocks.getAdmissionsByPatient,
  },
  surgeryService: {
    getSurgeriesByPatient: mocks.getSurgeriesByPatient,
  },
}));

vi.mock("../../../../services/registration/registrationQueueApi", () => ({
  getRegistrationsByEllyId: mocks.getRegistrationsByEllyId,
}));

vi.mock("./PatientRiskMonitorPanel", () => ({
  default: () => <div>Risk Monitor Content</div>,
}));

vi.mock("./PatientBodyModelSlot", () => ({
  default: ({ activeSystem, onSystemChange, patientGender }) => (
    <div aria-label="Mock body model">
      <span>Selected model system: {activeSystem}</span>
      <span>Selected model gender: {patientGender}</span>
      {["overview", "cardiovascular", "respiratory", "digestive"].map((systemId) => (
        <button
          key={systemId}
          type="button"
          onClick={() => onSystemChange(systemId)}
        >
          Select {systemId}
        </button>
      ))}
    </div>
  ),
}));

const workspace = {
  id: "hospital-object-id",
  ellyHospitalId: "HOSP-1",
  hospitalName: "Test Hospital",
};

beforeEach(() => {
  mocks.getPatientByEllyId.mockResolvedValue({
    data: {
      patient: {
        fullName: "Test Patient",
        ellyId: "ELLY-1",
        dateOfBirth: "1980-01-01",
        gender: "female",
        registeredHospitals: ["HOSP-1"],
      },
      medicalProfile: {
        allergies: ["Penicillin"],
        currentMedications: ["Medication A"],
      },
    },
  });
  mocks.getMedicalRecordsByEllyId.mockResolvedValue({ data: [] });
  mocks.getAdmissionsByPatient.mockResolvedValue([]);
  mocks.getSurgeriesByPatient.mockResolvedValue({ data: [] });
  mocks.getRegistrationsByEllyId.mockResolvedValue({ data: [] });
  mocks.getIcuPatients.mockResolvedValue({ data: [] });
  mocks.getVitalsHistory.mockResolvedValue({ data: [] });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PatientRecordView system insights integration", () => {
  it("places one compact identity block in the shared model and record workspace", async () => {
    render(<PatientRecordView ellyId="ELLY-1" workspace={workspace} />);

    const patientHeading = await screen.findByRole("heading", { name: "Test Patient" });
    const identity = screen.getByTestId("patient-record-identity");
    const workspaceRegion = screen.getByTestId("patient-record-workspace");
    const modelPanel = screen.getByTestId("patient-model-panel");
    const recordPanel = screen.getByTestId("patient-record-panel");
    const selectorHeader = recordPanel.firstElementChild;
    const sectionSelect = within(recordPanel).getByRole("combobox", {
      name: "Record section",
    });

    expect(identity).toContainElement(patientHeading);
    expect(within(identity).getByText("ELLY-1")).toBeInTheDocument();
    expect(workspaceRegion).toContainElement(identity);
    expect(recordPanel).not.toContainElement(identity);
    expect(modelPanel.parentElement).toBe(workspaceRegion);
    expect(recordPanel.parentElement).toBe(workspaceRegion);
    expect(identity.parentElement).toBe(workspaceRegion);
    expect(identity.compareDocumentPosition(modelPanel)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(modelPanel.nextElementSibling).toBe(recordPanel);
    expect(selectorHeader).toContainElement(sectionSelect);
    expect(within(selectorHeader).getByText("Record section")).toBeInTheDocument();
    expect(screen.getAllByTestId("patient-record-identity")).toHaveLength(1);
    expect(screen.getAllByRole("heading", { name: "Test Patient" })).toHaveLength(1);
  });

  it("synchronizes body-system selection with the System Insights panel", async () => {
    const user = userEvent.setup();
    render(<PatientRecordView ellyId="ELLY-1" workspace={workspace} />);

    expect(await screen.findByRole("heading", { name: "Test Patient" })).toBeInTheDocument();
    expect(screen.queryByText("Care priority")).not.toBeInTheDocument();
    const identity = screen.getByTestId("patient-record-identity");
    expect(within(identity).getByText("Inactive")).toBeInTheDocument();
    expect(within(identity).getByText("Outpatient")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Select cardiovascular" }));

    expect(screen.getByRole("combobox", { name: "Record section" })).toHaveValue(
      "system-insights",
    );
    expect(screen.getByTestId("patient-system-insights-panel")).toHaveAttribute(
      "data-active-system",
      "cardiovascular",
    );
    expect(screen.getByRole("heading", { name: "Cardiovascular" })).toBeInTheDocument();
    expect(screen.getByText("Selected model system: cardiovascular")).toBeInTheDocument();
    expect(screen.getByText("Selected model gender: female")).toBeInTheDocument();
  });

  it("shows whole-body priorities when the body Overview icon is selected", async () => {
    const user = userEvent.setup();
    render(<PatientRecordView ellyId="ELLY-1" workspace={workspace} />);

    await screen.findByRole("heading", { name: "Test Patient" });
    await user.click(screen.getByRole("button", { name: "Select cardiovascular" }));
    await user.click(screen.getByRole("button", { name: "Select overview" }));

    expect(screen.getByRole("heading", { name: "Whole-body Overview" })).toBeInTheDocument();
    expect(screen.getByText("Clinical alerts")).toBeInTheDocument();
    expect(screen.getByText("Selected model system: overview")).toBeInTheDocument();
  });

  it("preserves every existing patient-record section", async () => {
    const user = userEvent.setup();
    render(<PatientRecordView ellyId="ELLY-1" workspace={workspace} />);

    await screen.findByRole("heading", { name: "Test Patient" });
    const sectionSelect = screen.getByRole("combobox", { name: "Record section" });
    const labels = Array.from(sectionSelect.options).map((option) => option.textContent);

    expect(labels).toEqual([
      "Overview",
      "System Insights",
      "Medical Profile",
      "Clinical History",
      "Lab & Radiology Results",
      "Registration",
      "Admission & Discharge",
      "Surgery",
      "Risk Monitor",
    ]);

    await user.selectOptions(sectionSelect, "medical-profile");
    expect(screen.getByRole("heading", { name: "Medical Profile" })).toBeInTheDocument();
    await user.selectOptions(sectionSelect, "clinical");
    expect(screen.getByRole("heading", { name: "Clinical History" })).toBeInTheDocument();
  });

  it("resets only the internal record content when the section changes", async () => {
    const user = userEvent.setup();
    render(<PatientRecordView ellyId="ELLY-1" workspace={workspace} />);

    await screen.findByRole("heading", { name: "Test Patient" });
    const recordContent = screen.getByTestId("patient-record-content");
    const sectionSelect = screen.getByRole("combobox", { name: "Record section" });

    recordContent.scrollTop = 180;
    await user.selectOptions(sectionSelect, "medical-profile");

    expect(recordContent.scrollTop).toBe(0);

    recordContent.scrollTop = 120;
    await user.selectOptions(sectionSelect, "overview");

    expect(recordContent.scrollTop).toBe(0);

    await user.click(screen.getByRole("button", { name: "Select cardiovascular" }));
    recordContent.scrollTop = 90;
    await user.click(screen.getByRole("button", { name: "Select respiratory" }));

    expect(recordContent.scrollTop).toBe(0);
  });
});
