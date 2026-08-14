import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_AUTOMATIC_DIAGNOSTIC_WORDING,
  classifyMeasurement,
  isMissingClinicalValue,
} from "./patientSystemRuleEngine";

const ADULT_CONTEXT = {
  patient: {
    dateOfBirth: "1980-01-01",
    gender: "male",
  },
  medicalProfile: {},
  isInpatient: false,
  history: [],
};

function measurement(measurementId, value, overrides = {}) {
  return {
    id: `${measurementId}-1`,
    measurementId,
    value,
    unit: overrides.unit || "unit",
    observedAt: "2026-07-29T10:00:00.000Z",
    sourceType: "laboratory",
    sourceLabel: "Test laboratory",
    verificationStatus: "unreviewed",
    collectionContext: "outpatient",
    resultStatus: "final",
    ...overrides,
  };
}

describe("patientSystemRuleEngine", () => {
  it("treats zero as a real clinical value", () => {
    expect(isMissingClinicalValue(0)).toBe(false);
    const result = classifyMeasurement(
      measurement("pain-score", 0, {
        unit: "0-10",
        sourceType: "patient-reported",
      }),
      ADULT_CONTEXT,
      { now: new Date("2026-07-30T10:00:00.000Z") },
    );

    expect(result.status).toBe("within-target");
    expect(result.clinicianMessage).toBe("Within Target");
  });

  it("flags values beyond the configured freshness window as outdated", () => {
    const result = classifyMeasurement(
      measurement("heart-rate", 72, {
        unit: "bpm",
        observedAt: "2025-01-01T00:00:00.000Z",
      }),
      ADULT_CONTEXT,
      { now: new Date("2026-07-30T10:00:00.000Z") },
    );

    expect(result.status).toBe("outdated");
    expect(result.classificationStatus).toBe("within-reference-range");
    expect(result.clinicianMessage).toContain("May be outdated");
  });

  it("suppresses interpretation outside the supported population", () => {
    const result = classifyMeasurement(
      measurement("heart-rate", 120, { unit: "bpm" }),
      {
        ...ADULT_CONTEXT,
        patient: { dateOfBirth: "2015-01-01", gender: "male" },
      },
      { now: new Date("2026-07-30T10:00:00.000Z") },
    );

    expect(result.status).toBe("outside-supported-population");
    expect(result.clinicianMessage).toContain("raw value shown without interpretation");
  });

  it("does not classify pending results", () => {
    const result = classifyMeasurement(
      measurement("fasting-glucose", 500, {
        unit: "mg/dL",
        resultStatus: "preliminary",
      }),
      ADULT_CONTEXT,
      { now: new Date("2026-07-30T10:00:00.000Z") },
    );

    expect(result.status).toBe("result-pending");
    expect(result.classificationStatus).toBe("result-pending");
  });

  it("uses clinician-review wording for critical values without autonomous care advice", () => {
    const result = classifyMeasurement(
      measurement("blood-pressure", { systolic: 190, diastolic: 125 }, {
        unit: "mmHg",
      }),
      ADULT_CONTEXT,
      { now: new Date("2026-07-30T10:00:00.000Z") },
    );

    expect(result.status).toBe("critical-review");
    expect(result.recommendedAction).toBe("Clinician review required");
    expect(result.clinicianMessage).toContain("Clinician review required");
    expect(result.clinicianMessage).not.toMatch(/seek emergency|call emergency/i);
  });

  it("requires an assay reference limit before interpreting troponin", () => {
    const withoutRange = classifyMeasurement(
      measurement("troponin", 12, { unit: "ng/L" }),
      ADULT_CONTEXT,
      { now: new Date("2026-07-30T10:00:00.000Z") },
    );
    const withRange = classifyMeasurement(
      measurement("troponin", 12, {
        unit: "ng/L",
        reportedReferenceRange: { high: 10, text: "<=10 ng/L" },
      }),
      ADULT_CONTEXT,
      { now: new Date("2026-07-30T10:00:00.000Z") },
    );

    expect(withoutRange.status).toBe("clinician-review-required");
    expect(withRange.status).toBe("abnormal");
  });

  it("never generates forbidden diagnostic wording", () => {
    const scenarios = [
      measurement("oxygen-saturation", 82, {
        unit: "%",
        context: { sustained: true },
      }),
      measurement("gcs", 7, { unit: "3-15" }),
      measurement("crp", 20, { unit: "mg/L" }),
      measurement("hba1c", 7, { unit: "%" }),
      measurement("alt", 1200, { unit: "U/L" }),
    ];

    const messages = scenarios.map(
      (item) =>
        classifyMeasurement(item, ADULT_CONTEXT, {
          now: new Date("2026-07-30T10:00:00.000Z"),
        }).clinicianMessage,
    );

    expect(messages.join(" ")).not.toMatch(FORBIDDEN_AUTOMATIC_DIAGNOSTIC_WORDING);
  });
});
