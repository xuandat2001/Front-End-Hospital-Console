import { describe, expect, it } from "vitest";
import {
  displayMeasurementValue,
  normalizePatientSystemData,
} from "./patientSystemDataNormalizer";

const NOW = new Date("2026-07-30T12:00:00.000Z");

function fhirObservationRecord({
  id,
  code,
  display,
  value,
  unit,
  observedAt = "2026-07-30T10:00:00.000Z",
  performer = "Central laboratory",
  category = "laboratory",
  referenceRange,
}) {
  return {
    _id: id,
    title: `Observation: ${display}`,
    recordDate: observedAt,
    attachments: [
      {
        fileName: `${id}.pdf`,
        fileUrl: `/reports/${id}.pdf`,
      },
    ],
    structuredData: {
      source: "FHIR_R4",
      fhirResourceType: "Observation",
      fhirId: id,
      externalKey: `FHIR_R4:Observation:${id}`,
      payload: {
        resourceType: "Observation",
        id,
        status: "final",
        category: [{ coding: [{ code: category }] }],
        code: {
          coding: [{ system: "http://loinc.org", code, display }],
        },
        valueQuantity: { value, unit, code: unit },
        effectiveDateTime: observedAt,
        performer: [{ display: performer }],
        referenceRange: referenceRange ? [referenceRange] : undefined,
      },
    },
  };
}

function normalize(overrides = {}) {
  return normalizePatientSystemData(
    {
      patient: {
        fullName: "Test Patient",
        dateOfBirth: "1980-01-01",
        gender: "male",
        ...overrides.patient,
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

describe("patientSystemDataNormalizer", () => {
  it("creates explicit no-data entries instead of manufacturing values", () => {
    const data = normalize();
    const ldl = data.systems.cardiovascular.measurements.find(
      (item) => item.config.id === "ldl-cholesterol",
    );

    expect(ldl.hasData).toBe(false);
    expect(ldl.latest.value).toBeNull();
    expect(ldl.latest.clinicianMessage).toBe("No data recorded.");
  });

  it("preserves a zero patient-reported pain score with provenance", () => {
    const data = normalize({
      medicalRecords: [
        fhirObservationRecord({
          id: "pain-zero",
          code: "72514-3",
          display: "Pain severity",
          value: 0,
          unit: "0-10",
          category: "survey",
          performer: "Patient questionnaire",
        }),
      ],
    });
    const pain = data.systems.musculoskeletal.measurements.find(
      (item) => item.config.id === "pain-score",
    );

    expect(pain.latest.value).toBe(0);
    expect(pain.latest.status).toBe("within-target");
    expect(pain.latest.sourceType).toBe("patient-reported");
    expect(displayMeasurementValue(pain.latest)).toBe("0 0-10");
  });

  it("retains conflicting observations and both sources", () => {
    const observedAt = "2026-07-30T10:00:00.000Z";
    const data = normalize({
      medicalRecords: [
        fhirObservationRecord({
          id: "hr-lab-a",
          code: "8867-4",
          display: "Heart rate",
          value: 72,
          unit: "bpm",
          observedAt,
          performer: "Bedside device A",
          category: "vital-signs",
        }),
        fhirObservationRecord({
          id: "hr-lab-b",
          code: "8867-4",
          display: "Heart rate",
          value: 104,
          unit: "bpm",
          observedAt,
          performer: "Bedside device B",
          category: "vital-signs",
        }),
      ],
    });
    const heartRate = data.systems.cardiovascular.measurements.find(
      (item) => item.config.id === "heart-rate",
    );

    expect(heartRate.currentRecords).toHaveLength(2);
    expect(heartRate.currentRecords.every((item) => item.status === "conflicting-data")).toBe(
      true,
    );
    expect(heartRate.currentRecords.map((item) => item.sourceLabel).join(" ")).toContain(
      "Bedside device A",
    );
    expect(heartRate.latest.clinicianMessage).toBe(
      "Conflicting data — clinician review required.",
    );
  });

  it("labels wearable-derived values as unverified", () => {
    const data = normalize({
      medicalRecords: [
        {
          _id: "wearable-hr",
          title: "Imported wearable reading",
          recordDate: "2026-07-30T09:00:00.000Z",
          structuredData: {
            wearableDerived: true,
            measurements: [
              {
                measurementId: "heart-rate",
                value: 68,
                unit: "bpm",
                observedAt: "2026-07-30T09:00:00.000Z",
                sourceType: "wearable-derived",
                sourceLabel: "Connected watch",
                wearableDerived: true,
              },
            ],
          },
        },
      ],
    });
    const wearable = data.measurements.find((item) => item.id.includes("wearable-hr"));

    expect(wearable).toMatchObject({
      sourceType: "wearable-derived",
      verificationStatus: "unreviewed",
      wearableDerived: true,
    });
  });

  it("retains structured collection context used by safety rules", () => {
    const data = normalize({
      medicalRecords: [
        {
          _id: "sustained-oxygen",
          title: "Bedside oxygen observation",
          structuredData: {
            measurements: [
              {
                measurementId: "oxygen-saturation",
                value: 86,
                unit: "%",
                observedAt: "2026-07-30T11:30:00.000Z",
                sourceLabel: "Bedside monitor",
                collectionContext: "inpatient",
                context: { sustained: true },
              },
            ],
          },
        },
      ],
    });

    expect(data.measurements[0].context).toEqual({ sustained: true });
    expect(data.measurements[0].status).toBe("critical-review");
    expect(data.measurements[0].clinicianMessage).toContain(
      "Clinician review required",
    );
  });

  it("suppresses interpretation for unsupported populations", () => {
    const data = normalize({
      patient: { dateOfBirth: "2015-01-01" },
      medicalRecords: [
        fhirObservationRecord({
          id: "child-hr",
          code: "8867-4",
          display: "Heart rate",
          value: 115,
          unit: "bpm",
          category: "vital-signs",
        }),
      ],
    });

    expect(data.measurements[0].status).toBe("outside-supported-population");
    expect(data.measurements[0].contextApplied[0]).toContain("Pediatric");
  });

  it("ranks no more than eight whole-body priorities in the specified order", () => {
    const data = normalize({
      medicalProfile: {
        allergies: ["Penicillin"],
        chronicConditions: ["Recorded condition"],
        currentMedications: ["Recorded medication"],
      },
    });

    expect(data.overview.priorities).toHaveLength(7);
    expect(data.overview.priorities.map((item) => item.id)).toEqual([
      "clinical-alerts",
      "diagnoses",
      "medications",
      "allergies",
      "recent-abnormal",
      "vital-snapshot",
      "upcoming",
    ]);
    expect(data.overview.priorities[1].note.toLowerCase()).toContain(
      "confirmation status",
    );
  });

  it("omits risk scores without approved implementation metadata", () => {
    const unvalidated = normalize({
      medicalRecords: [
        {
          _id: "frax-unvalidated",
          title: "FRAX result",
          structuredData: {
            measurements: [
              {
                measurementId: "frax",
                value: 12,
                unit: "%",
                observedAt: "2026-07-29T10:00:00.000Z",
              },
            ],
          },
        },
      ],
    });
    const validated = normalize({
      medicalRecords: [
        {
          _id: "frax-validated",
          title: "FRAX result",
          structuredData: {
            validatedImplementation: true,
            implementationName: "Approved FRAX service",
            implementationVersion: "2026.1",
            measurements: [
              {
                measurementId: "frax",
                value: 12,
                unit: "%",
                observedAt: "2026-07-29T10:00:00.000Z",
              },
            ],
          },
        },
      ],
    });

    expect(unvalidated.riskScores).toEqual([]);
    expect(validated.riskScores).toHaveLength(1);
    expect(validated.riskScores[0].validationMetadata.version).toBe("2026.1");
  });

  it("connects real dated ICU readings and calculates trends chronologically", () => {
    const data = normalize({
      isInpatient: true,
      icuPatient: {
        id: "icu-1",
        latestUpdateAt: "2026-07-30T11:00:00.000Z",
      },
      icuVitalsHistory: [
        {
          _id: "reading-new",
          heartRate: 90,
          recordedAt: "2026-07-30T11:00:00.000Z",
          deviceId: "monitor-1",
        },
        {
          _id: "reading-old",
          heartRate: 70,
          recordedAt: "2026-07-30T09:00:00.000Z",
          deviceId: "monitor-1",
        },
      ],
    });
    const heartRate = data.systems.cardiovascular.measurements.find(
      (item) => item.config.id === "heart-rate",
    );

    expect(heartRate.trend.available).toBe(true);
    expect(heartRate.trend.points.map((point) => point.numericValue)).toEqual([70, 90]);
    expect(heartRate.trend.summary).toContain("increased");
    expect(heartRate.trend.summary).toContain("meaningful-change threshold");
  });
});
