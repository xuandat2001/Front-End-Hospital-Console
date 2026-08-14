/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import PatientSystemInsightsPanel, { StatusBadge } from "./PatientSystemInsightsPanel";
import { normalizePatientSystemData } from "./patientSystemDataNormalizer";

const NOW = new Date("2026-07-30T12:00:00.000Z");

function normalizedData(overrides = {}) {
  return normalizePatientSystemData(
    {
      patient: {
        fullName: "Panel Test",
        dateOfBirth: "1980-01-01",
        gender: "female",
      },
      medicalProfile: overrides.medicalProfile || null,
      medicalRecords: overrides.medicalRecords || [],
      admissions: overrides.admissions || [],
      icuPatient: overrides.icuPatient || null,
      icuVitalsHistory: overrides.icuVitalsHistory || [],
      isInpatient: overrides.isInpatient || false,
    },
    { now: NOW },
  );
}

afterEach(cleanup);

describe("PatientSystemInsightsPanel", () => {
  it("renders the ranked whole-body overview", () => {
    const data = normalizedData({
      medicalProfile: {
        currentMedications: ["Medication A"],
        allergies: ["Allergy A"],
      },
    });
    render(<PatientSystemInsightsPanel activeSystem="overview" data={data} />);

    expect(
      screen.getByRole("heading", { name: "Whole-body Overview" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Clinical alerts")).toBeInTheDocument();
    expect(screen.getByText("Current medications")).toBeInTheDocument();
    expect(screen.getByText("Allergies")).toBeInTheDocument();
    expect(screen.getByText("Upcoming tests or appointments")).toBeInTheDocument();
  });

  it("shows explicit no-data states for configured measurements", () => {
    const data = normalizedData();
    render(<PatientSystemInsightsPanel activeSystem="cardiovascular" data={data} />);

    expect(
      screen.getByRole("heading", { name: "Cardiovascular" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("No data recorded.").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "LDL cholesterol" })).toBeInTheDocument();
  });

  it("reveals wearable provenance through keyboard-accessible details", async () => {
    const user = userEvent.setup();
    const data = normalizedData({
      medicalRecords: [
        {
          _id: "wearable-reading",
          title: "Wearable reading",
          structuredData: {
            wearableDerived: true,
            measurements: [
              {
                measurementId: "heart-rate",
                value: 75,
                unit: "bpm",
                observedAt: "2026-07-30T10:00:00.000Z",
                sourceType: "wearable-derived",
                sourceLabel: "Connected watch",
              },
            ],
          },
        },
      ],
    });
    render(<PatientSystemInsightsPanel activeSystem="cardiovascular" data={data} />);

    await user.click(
      screen.getByLabelText(
        "Show trend, provenance, and interpretation details for Resting heart rate",
      ),
    );

    expect(screen.getByText("Wearable-derived (unverified)")).toBeInTheDocument();
    expect(screen.getByText("Connected watch")).toBeInTheDocument();
    expect(screen.getByText("Unreviewed")).toBeInTheDocument();
  });

  it("pairs status color with visible text and an icon", () => {
    const { container } = render(<StatusBadge status="abnormal" />);
    const badge = screen.getByRole("status", { name: "Status: Abnormal" });

    expect(badge).toHaveTextContent("Abnormal");
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("shows text-only anatomy states and immune safety context", () => {
    const data = normalizedData({
      medicalProfile: {
        allergies: ["Penicillin"],
      },
    });
    render(<PatientSystemInsightsPanel activeSystem="immune" data={data} />);

    expect(
      screen.getByText(
        "This system is not yet represented in the 3D model. Clinical information is shown in text.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Penicillin")).toBeInTheDocument();
    expect(screen.getByText("Vaccinations")).toBeInTheDocument();
  });

  it("reports the real brain as a partial Nervous representation", () => {
    const data = normalizedData();
    render(
      <PatientSystemInsightsPanel
        activeSystem="nervous"
        data={data}
        patientGender="female"
      />,
    );

    expect(
      screen.getByText(
        "Partial 3D representation: the brain mesh is available; the spinal cord and peripheral nerves are not yet modeled.",
      ),
    ).toBeInTheDocument();
  });

  it("uses model-specific Digestive availability without inventing a female gallbladder", () => {
    const data = normalizedData();
    render(
      <PatientSystemInsightsPanel
        activeSystem="digestive"
        data={data}
        patientGender="female"
      />,
    );

    expect(
      screen.getByText(
        "Partial 3D representation: stomach/intestine and liver meshes are available; a gallbladder mesh is not present in this model.",
      ),
    ).toBeInTheDocument();
  });

  it("uses responsive summary and safety-context grids", () => {
    const data = normalizedData();
    const { container } = render(
      <PatientSystemInsightsPanel activeSystem="immune" data={data} />,
    );
    const availableLabel = screen.getByText("Available");
    const summaryGrid = availableLabel.parentElement.parentElement;

    expect(summaryGrid.className).toContain("grid-cols-2");
    expect(summaryGrid.className).toContain("sm:grid-cols-4");
    expect(container.innerHTML).toContain("sm:grid-cols-2");
  });

  it("renders critical findings as clinician review without autonomous treatment advice", () => {
    const data = normalizedData({
      medicalRecords: [
        {
          _id: "critical-glucose",
          title: "Fasting glucose",
          structuredData: {
            measurements: [
              {
                measurementId: "fasting-glucose",
                value: 450,
                unit: "mg/dL",
                observedAt: "2026-07-30T10:00:00.000Z",
                sourceType: "laboratory",
                sourceLabel: "Central laboratory",
              },
            ],
          },
        },
      ],
    });
    render(<PatientSystemInsightsPanel activeSystem="endocrine" data={data} />);

    expect(screen.getByText("Safe next step: Clinician review required")).toBeInTheDocument();
    expect(screen.queryByText(/seek emergency|call emergency/i)).not.toBeInTheDocument();
  });
});
