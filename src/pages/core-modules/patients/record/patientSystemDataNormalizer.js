import {
  PATIENT_SYSTEM_CLINICAL_CONFIG,
  PATIENT_SYSTEM_ORDER,
  getAllMeasurementConfigs,
} from "./patientSystemClinicalConfig";
import {
  buildMeasurementTrend,
  classifyMeasurement,
  isMissingClinicalValue,
} from "./patientSystemRuleEngine";

const MEASUREMENT_CONFIGS = getAllMeasurementConfigs();
const MEASUREMENT_BY_LOINC = new Map(
  MEASUREMENT_CONFIGS.flatMap((config) =>
    config.loincCodes.map((code) => [code, config]),
  ),
);

const REPORT_KEYWORDS = {
  cardiovascular: ["cardiac", "heart", "troponin", "bnp", "lipid", "cholesterol", "blood pressure"],
  respiratory: ["respirat", "pulmonary", "lung", "oxygen", "spirom", "peak flow"],
  digestive: ["liver", "hepatic", "bilirubin", "lipase", "pancre", "gastro", "abdom"],
  nervous: ["neuro", "brain", "cognitive", "gcs", "nihss", "moca", "mmse"],
  musculoskeletal: ["bone", "joint", "muscle", "dexa", "pain", "orthop"],
  immune: ["immune", "allerg", "vaccin", "immun", "wbc", "white blood", "crp", "esr", "inflamm"],
  endocrine: ["endocr", "glucose", "a1c", "hba1c", "thyroid", "tsh", "hormon"],
};

function canonicalText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9%/.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function dateValue(value) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function toIsoDate(value) {
  const time = dateValue(value);
  return time ? new Date(time).toISOString() : null;
}

function coding(resource) {
  return resource?.code?.coding || [];
}

function loincCode(resource) {
  return (
    coding(resource).find((item) => item.system === "http://loinc.org")?.code ||
    coding(resource)[0]?.code ||
    null
  );
}

function conceptDisplay(concept) {
  return (
    concept?.text ||
    concept?.coding?.find((item) => item.display)?.display ||
    concept?.coding?.[0]?.code ||
    null
  );
}

function resourceDisplay(resource) {
  return (
    resource?.code?.text ||
    resource?.code?.coding?.find((item) => item.display)?.display ||
    resource?.code?.coding?.[0]?.code ||
    null
  );
}

function observationDate(observation, record) {
  return toIsoDate(
    observation?.effectiveDateTime ||
      observation?.effectivePeriod?.start ||
      observation?.issued ||
      record?.recordDate ||
      record?.createdAt,
  );
}

function quantityValue(quantity) {
  const value = toFiniteNumber(quantity?.value);
  return value === null ? null : value;
}

function quantityUnit(quantity, fallback) {
  return quantity?.unit || quantity?.code || fallback || null;
}

function referenceRangeFromObservation(observation) {
  const sourceRange = observation?.referenceRange?.find(
    (range) => range?.low || range?.high || range?.text,
  );
  if (!sourceRange) return null;
  return {
    low: quantityValue(sourceRange.low),
    high: quantityValue(sourceRange.high),
    unit: quantityUnit(sourceRange.low) || quantityUnit(sourceRange.high) || null,
    text: sourceRange.text || null,
    kind: canonicalText(sourceRange.type?.text).includes("target")
      ? "target"
      : "reference",
    source: "Source report",
  };
}

function reportReference(record, resource) {
  const attachment =
    record?.attachments?.find((item) => item?.fileUrl) ||
    resource?.presentedForm?.find((item) => item?.url);
  if (attachment) {
    return {
      label: attachment.fileName || attachment.title || "Open complete report",
      href: attachment.fileUrl || attachment.url,
    };
  }

  const externalReference =
    resource?.derivedFrom?.[0]?.reference ||
    resource?.basedOn?.[0]?.reference ||
    record?.structuredData?.externalKey;
  return {
    label: externalReference || record?.title || "Complete report reference unavailable",
    href: null,
  };
}

function sourceTypeForObservation(observation, record, measurementConfig) {
  if (measurementConfig.id === "pain-score") return "patient-reported";
  if (record?.structuredData?.wearableDerived === true) return "wearable-derived";
  if (record?.structuredData?.manuallyEntered === true) return "manually-entered";
  const categories = (observation?.category || [])
    .flatMap((category) => category?.coding || [])
    .map((item) => canonicalText(item.code || item.display));
  if (categories.some((item) => item.includes("vital"))) return "vital-sign";
  if (categories.some((item) => item.includes("laboratory"))) return "laboratory";
  if (categories.some((item) => item.includes("survey"))) return "patient-reported";
  if (categories.some((item) => item.includes("imaging"))) return "imaging";
  return "FHIR observation";
}

function sourceLabelForObservation(observation, record) {
  const performer = observation?.performer?.map((item) => item.display).filter(Boolean).join(", ");
  const device =
    observation?.device?.display ||
    observation?.device?.reference ||
    record?.structuredData?.deviceLabel;
  return [
    record?.structuredData?.source === "FHIR_R4" ? "FHIR R4" : null,
    performer || device || record?.title || "Clinical record",
  ]
    .filter(Boolean)
    .join(" · ");
}

function verificationFor(record) {
  const reviewedBy =
    record?.structuredData?.reviewedBy ||
    record?.structuredData?.reviewer ||
    record?.reviewedBy ||
    null;
  return {
    verificationStatus: reviewedBy ? "reviewed" : "unreviewed",
    reviewedBy,
  };
}

function measurementConfigForObservation(observation) {
  const byCode = MEASUREMENT_BY_LOINC.get(loincCode(observation));
  if (byCode) return byCode;

  const display = canonicalText(resourceDisplay(observation));
  return MEASUREMENT_CONFIGS.find((config) =>
    [...config.aliases]
      .sort((left, right) => right.length - left.length)
      .some((alias) => display.includes(canonicalText(alias))),
  );
}

function componentByCodeOrName(observation, codes, names) {
  return observation?.component?.find((component) => {
    const componentCodes = component?.code?.coding?.map((item) => item.code) || [];
    const display = canonicalText(conceptDisplay(component?.code));
    return (
      componentCodes.some((code) => codes.includes(code)) ||
      names.some((name) => display.includes(name))
    );
  });
}

function observationValue(observation, measurementConfig) {
  if (measurementConfig.id === "blood-pressure") {
    const systolic = componentByCodeOrName(
      observation,
      ["8480-6"],
      ["systolic"],
    );
    const diastolic = componentByCodeOrName(
      observation,
      ["8462-4"],
      ["diastolic"],
    );
    const systolicValue = quantityValue(systolic?.valueQuantity);
    const diastolicValue = quantityValue(diastolic?.valueQuantity);
    return {
      value:
        systolicValue === null || diastolicValue === null
          ? null
          : { systolic: systolicValue, diastolic: diastolicValue },
      unit:
        quantityUnit(systolic?.valueQuantity) ||
        quantityUnit(diastolic?.valueQuantity) ||
        "mmHg",
    };
  }

  const value =
    quantityValue(observation?.valueQuantity) ??
    toFiniteNumber(observation?.valueInteger) ??
    toFiniteNumber(observation?.valueDecimal);
  return {
    value,
    unit: quantityUnit(observation?.valueQuantity, measurementConfig.unit),
  };
}

function normalizeFhirObservation(observation, record, suffix = "") {
  const measurementConfig = measurementConfigForObservation(observation);
  if (!measurementConfig) return null;
  const { value, unit } = observationValue(observation, measurementConfig);
  if (isMissingClinicalValue(value)) return null;

  const verification = verificationFor(record);
  return {
    id: `${record?._id || record?.structuredData?.fhirId || "fhir"}${suffix}`,
    measurementId: measurementConfig.id,
    system: measurementConfig.system,
    clinicalName: measurementConfig.clinicalName,
    patientFriendlyName: measurementConfig.patientFriendlyName,
    value,
    unit: unit || measurementConfig.unit,
    observedAt: observationDate(observation, record),
    sourceType: sourceTypeForObservation(observation, record, measurementConfig),
    sourceLabel: sourceLabelForObservation(observation, record),
    reportedReferenceRange: referenceRangeFromObservation(observation),
    resultStatus: observation?.status || "unknown",
    ...verification,
    collectionContext:
      record?.structuredData?.collectionContext ||
      observation?.encounter?.display ||
      "unknown",
    completeReportReference: reportReference(record, observation),
    manuallyEntered: record?.structuredData?.manuallyEntered === true,
    wearableDerived: record?.structuredData?.wearableDerived === true,
    validatedImplementation:
      record?.structuredData?.validatedImplementation === true &&
      Boolean(record?.structuredData?.implementationVersion),
    validationMetadata:
      record?.structuredData?.validatedImplementation === true
        ? {
            implementation: record.structuredData.implementationName || "Approved implementation",
            version: record.structuredData.implementationVersion,
          }
        : null,
  };
}

function normalizeStructuredMeasurements(record) {
  const structured = record?.structuredData || {};
  const candidates = [
    ...(Array.isArray(structured.measurements) ? structured.measurements : []),
    ...(structured.observation ? [structured.observation] : []),
  ];

  return candidates
    .map((item, index) => {
      const measurementConfig =
        getConfigByIdentifier(item.measurementId || item.code || item.clinicalName);
      if (!measurementConfig || isMissingClinicalValue(item.value)) return null;
      const verification = verificationFor(record);
      return {
        id: `${record?._id || "record"}-structured-${index}`,
        measurementId: measurementConfig.id,
        system: measurementConfig.system,
        clinicalName: measurementConfig.clinicalName,
        patientFriendlyName: measurementConfig.patientFriendlyName,
        value: item.value,
        unit: item.unit || measurementConfig.unit,
        observedAt: toIsoDate(item.observedAt || record.recordDate || record.createdAt),
        sourceType:
          item.wearableDerived === true || structured.wearableDerived === true
            ? "wearable-derived"
            : item.manuallyEntered === true || structured.manuallyEntered === true
              ? "manually-entered"
              : item.sourceType || "clinical-record",
        sourceLabel: item.sourceLabel || record.title || "Clinical record",
        reportedReferenceRange: item.referenceRange || null,
        resultStatus: item.resultStatus || structured.status || "unknown",
        ...verification,
        verificationStatus:
          item.verificationStatus ||
          structured.verificationStatus ||
          verification.verificationStatus,
        collectionContext: item.collectionContext || structured.collectionContext || "unknown",
        context: item.context || null,
        completeReportReference: reportReference(record, structured),
        manuallyEntered: item.manuallyEntered === true || structured.manuallyEntered === true,
        wearableDerived: item.wearableDerived === true || structured.wearableDerived === true,
        conflicting: item.conflicting === true,
        conflictGroupId: item.conflictGroupId || null,
        validatedImplementation:
          structured.validatedImplementation === true &&
          Boolean(structured.implementationVersion),
        validationMetadata:
          structured.validatedImplementation === true
            ? {
                implementation: structured.implementationName || "Approved implementation",
                version: structured.implementationVersion,
              }
            : null,
      };
    })
    .filter(Boolean);
}

function getConfigByIdentifier(identifier) {
  const key = canonicalText(identifier);
  return MEASUREMENT_CONFIGS.find(
    (config) =>
      config.id === key ||
      canonicalText(config.clinicalName) === key ||
      config.loincCodes.includes(identifier) ||
      config.aliases.some((alias) => canonicalText(alias) === key),
  );
}

function normalizeMedicalRecords(medicalRecords) {
  const measurements = [];
  for (const record of medicalRecords || []) {
    const payload = record?.structuredData?.payload;
    if (payload?.resourceType === "Observation") {
      const normalized = normalizeFhirObservation(payload, record);
      if (normalized) measurements.push(normalized);
    }
    if (payload?.resourceType === "DiagnosticReport") {
      (payload.contained || [])
        .filter((resource) => resource?.resourceType === "Observation")
        .forEach((observation, index) => {
          const normalized = normalizeFhirObservation(
            observation,
            record,
            `-contained-${index}`,
          );
          if (normalized) measurements.push(normalized);
        });
    }
    measurements.push(...normalizeStructuredMeasurements(record));
  }
  return measurements;
}

function makeIcuMeasurement(reading, icuPatient, measurementId, value, unit) {
  if (isMissingClinicalValue(value)) return null;
  const id =
    reading?._id ||
    `${icuPatient?.id || icuPatient?._id || "icu"}-${measurementId}-${reading?.recordedAt || "latest"}`;
  const deviceId = reading?.deviceId || reading?.sourceDeviceId;
  return {
    id: `${id}-${measurementId}`,
    measurementId,
    value,
    unit,
    observedAt: toIsoDate(reading?.recordedAt || icuPatient?.latestUpdateAt),
    sourceType: "device",
    sourceLabel: deviceId
      ? `ICU bedside monitor · ${deviceId}`
      : "ICU bedside monitor",
    reportedReferenceRange: null,
    resultStatus: "final",
    verificationStatus: "unreviewed",
    reviewedBy: null,
    collectionContext: "inpatient",
    completeReportReference: {
      label: `ICU admission ${icuPatient?.id || icuPatient?._id || "record"}`,
      href: null,
    },
  };
}

function normalizeIcuVitals(icuPatient, icuVitalsHistory) {
  const readings = Array.isArray(icuVitalsHistory) ? [...icuVitalsHistory] : [];
  const latest = icuPatient?.latestVitals;
  if (
    latest?.recordedAt &&
    !readings.some(
      (reading) => toIsoDate(reading.recordedAt) === toIsoDate(latest.recordedAt),
    )
  ) {
    readings.push({
      ...latest,
      deviceId: latest.sourceDeviceId,
    });
  }

  return readings.flatMap((reading) => {
    const bloodPressure =
      isMissingClinicalValue(reading?.systolic) ||
      isMissingClinicalValue(reading?.diastolic)
        ? null
        : {
            systolic: Number(reading.systolic),
            diastolic: Number(reading.diastolic),
          };
    return [
      makeIcuMeasurement(reading, icuPatient, "blood-pressure", bloodPressure, "mmHg"),
      makeIcuMeasurement(reading, icuPatient, "heart-rate", reading?.heartRate, "bpm"),
      makeIcuMeasurement(
        reading,
        icuPatient,
        "respiratory-rate",
        reading?.respiratoryRate,
        "breaths/min",
      ),
      makeIcuMeasurement(
        reading,
        icuPatient,
        "oxygen-saturation",
        reading?.oxygenSaturation,
        "%",
      ),
    ].filter(Boolean);
  });
}

function normalizeMedicalProfileMeasurements(profile, existingMeasurements) {
  if (!profile) return [];
  const results = [];
  const observedAt = toIsoDate(profile.updatedAt || profile.createdAt);
  const common = {
    observedAt,
    sourceType: "medical-profile",
    sourceLabel: "Medical profile",
    reportedReferenceRange: null,
    resultStatus: "unknown",
    verificationStatus: "unreviewed",
    reviewedBy: null,
    collectionContext: "outpatient",
    completeReportReference: {
      label: "Medical profile",
      href: null,
    },
  };

  if (
    !isMissingClinicalValue(profile.weightKg) &&
    !existingMeasurements.some((item) => item.measurementId === "weight")
  ) {
    results.push({
      ...common,
      id: `medical-profile-weight-${observedAt || "undated"}`,
      measurementId: "weight",
      value: Number(profile.weightKg),
      unit: "kg",
    });
  }

  if (
    !existingMeasurements.some((item) => item.measurementId === "bmi") &&
    !isMissingClinicalValue(profile.heightCm) &&
    !isMissingClinicalValue(profile.weightKg)
  ) {
    const heightMeters = Number(profile.heightCm) / 100;
    if (heightMeters > 0) {
      results.push({
        ...common,
        id: `medical-profile-bmi-${observedAt || "undated"}`,
        measurementId: "bmi",
        value: Math.round((Number(profile.weightKg) / heightMeters ** 2) * 10) / 10,
        unit: "kg/m2",
        sourceType: "calculated",
        sourceLabel: "Calculated from medical-profile height and weight",
        derivation: "weightKg / heightMeters^2",
      });
    }
  }

  return results;
}

function serializedValue(value) {
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function markConflicts(measurements) {
  const groups = new Map();
  for (const item of measurements) {
    const key = item.conflictGroupId
      ? `${item.measurementId}|explicit|${item.conflictGroupId}`
      : `${item.measurementId}|${item.unit}|${item.observedAt || "undated"}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  return measurements.map((item) => {
    const key = item.conflictGroupId
      ? `${item.measurementId}|explicit|${item.conflictGroupId}`
      : `${item.measurementId}|${item.unit}|${item.observedAt || "undated"}`;
    const group = groups.get(key) || [];
    const values = new Set(group.map((entry) => serializedValue(entry.value)));
    const sources = new Set(group.map((entry) => entry.sourceLabel));
    const conflicting =
      item.conflicting === true ||
      (group.length > 1 && values.size > 1 && sources.size > 1);
    return { ...item, conflicting };
  });
}

function resourceRecords(medicalRecords, resourceType) {
  return (medicalRecords || []).filter(
    (record) => record?.structuredData?.payload?.resourceType === resourceType,
  );
}

function provenanceItem(text, record, extra = {}) {
  if (!text) return null;
  const verification = verificationFor(record);
  return {
    text,
    observedAt: observationDate(record?.structuredData?.payload, record),
    sourceLabel:
      record?.structuredData?.source === "FHIR_R4"
        ? `FHIR R4 · ${record.title || "Clinical record"}`
        : record?.title || "Medical profile",
    ...verification,
    completeReportReference: reportReference(
      record,
      record?.structuredData?.payload || record?.structuredData,
    ),
    ...extra,
  };
}

function uniqueByText(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.text) return false;
    const key = canonicalText(item.text);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeContextCollections(medicalProfile, medicalRecords, now) {
  const allergies = (medicalProfile?.allergies || []).map((item) => ({
    text: typeof item === "string" ? item : item?.name || item?.display,
    observedAt: toIsoDate(medicalProfile?.updatedAt),
    sourceLabel: "Medical profile",
    verificationStatus: "unreviewed",
    reviewedBy: null,
    completeReportReference: { label: "Medical profile", href: null },
    statusLabel: "Reported",
  }));
  for (const record of resourceRecords(medicalRecords, "AllergyIntolerance")) {
    const resource = record.structuredData.payload;
    allergies.push(
      provenanceItem(conceptDisplay(resource.code), record, {
        statusLabel:
          canonicalText(conceptDisplay(resource.verificationStatus)) === "confirmed"
            ? "Confirmed"
            : "Reported",
      }),
    );
  }

  const conditions = (medicalProfile?.chronicConditions || []).map((item) => ({
    text: typeof item === "string" ? item : item?.name || item?.display,
    observedAt: toIsoDate(medicalProfile?.updatedAt),
    sourceLabel: "Medical profile",
    verificationStatus: "unreviewed",
    reviewedBy: null,
    completeReportReference: { label: "Medical profile", href: null },
    statusLabel:
      typeof item === "object" && canonicalText(item.verificationStatus) === "confirmed"
        ? "Confirmed"
        : "Reported",
  }));
  for (const record of resourceRecords(medicalRecords, "Condition")) {
    const resource = record.structuredData.payload;
    const verification = canonicalText(conceptDisplay(resource.verificationStatus));
    const clinicalStatus = canonicalText(conceptDisplay(resource.clinicalStatus));
    if (clinicalStatus && !["active", "recurrence", "relapse"].includes(clinicalStatus)) {
      continue;
    }
    conditions.push(
      provenanceItem(conceptDisplay(resource.code), record, {
        statusLabel:
          verification === "confirmed"
            ? "Confirmed"
            : verification === "provisional" || verification === "differential"
              ? "Suspected"
              : "Reported",
      }),
    );
  }

  const medications = (medicalProfile?.currentMedications || []).map((item) => ({
    text: typeof item === "string" ? item : item?.name || item?.display,
    observedAt: toIsoDate(medicalProfile?.updatedAt),
    sourceLabel: "Medical profile",
    verificationStatus: "unreviewed",
    reviewedBy: null,
    completeReportReference: { label: "Medical profile", href: null },
    statusLabel: "Recorded",
  }));
  for (const resourceType of ["MedicationStatement", "MedicationRequest"]) {
    for (const record of resourceRecords(medicalRecords, resourceType)) {
      const resource = record.structuredData.payload;
      const status = canonicalText(resource.status);
      if (status && !["active", "intended", "on-hold", "unknown"].includes(status)) continue;
      medications.push(
        provenanceItem(
          conceptDisplay(resource.medicationCodeableConcept) ||
            resource.medicationReference?.display,
          record,
          { statusLabel: status === "on-hold" ? "On hold" : "Recorded" },
        ),
      );
    }
  }

  const vaccinations = resourceRecords(medicalRecords, "Immunization").map((record) => {
    const resource = record.structuredData.payload;
    return provenanceItem(conceptDisplay(resource.vaccineCode), record, {
      statusLabel: resource.status || "Recorded",
    });
  });

  const upcoming = [];
  for (const resourceType of ["Appointment", "ServiceRequest"]) {
    for (const record of resourceRecords(medicalRecords, resourceType)) {
      const resource = record.structuredData.payload;
      const startsAt =
        resource.start ||
        resource.occurrenceDateTime ||
        resource.occurrencePeriod?.start;
      if (!startsAt || dateValue(startsAt) < now.getTime()) continue;
      upcoming.push(
        provenanceItem(
          resource.description ||
            conceptDisplay(resource.serviceType?.[0]) ||
            conceptDisplay(resource.code) ||
            record.title,
          record,
          {
            observedAt: toIsoDate(startsAt),
            statusLabel: resource.status || "Scheduled",
          },
        ),
      );
    }
  }

  return {
    allergies: uniqueByText(allergies),
    conditions: uniqueByText(conditions),
    medications: uniqueByText(medications),
    vaccinations: uniqueByText(vaccinations),
    upcoming: uniqueByText(upcoming).sort(
      (left, right) => dateValue(left.observedAt) - dateValue(right.observedAt),
    ),
  };
}

function relatedReports(medicalRecords, systemId) {
  const keywords = REPORT_KEYWORDS[systemId] || [];
  return (medicalRecords || [])
    .filter((record) => {
      const resourceType = record?.structuredData?.payload?.resourceType;
      if (resourceType === "Observation") return false;
      const text = canonicalText(
        [
          record?.title,
          record?.description,
          record?.structuredData?.testType,
          conceptDisplay(record?.structuredData?.payload?.code),
        ].join(" "),
      );
      return keywords.some((keyword) => text.includes(keyword));
    })
    .map((record) => ({
      id: record._id,
      title: record.title,
      observedAt: observationDate(record?.structuredData?.payload, record),
      sourceLabel:
        record?.structuredData?.source === "FHIR_R4"
          ? "FHIR R4 medical record"
          : record?.structuredData?.department || "Clinical record",
      verificationStatus: verificationFor(record).verificationStatus,
      completeReportReference: reportReference(
        record,
        record?.structuredData?.payload || record?.structuredData,
      ),
    }));
}

function createSystemData(classifiedMeasurements, medicalRecords) {
  const byMeasurement = new Map();
  for (const item of classifiedMeasurements) {
    if (!byMeasurement.has(item.measurementId)) byMeasurement.set(item.measurementId, []);
    byMeasurement.get(item.measurementId).push(item);
  }

  return Object.fromEntries(
    PATIENT_SYSTEM_ORDER.filter((systemId) => systemId !== "overview").map((systemId) => {
      const config = PATIENT_SYSTEM_CLINICAL_CONFIG[systemId];
      const measurements = config.measurements.map((measurementConfig) => {
        const history = [...(byMeasurement.get(measurementConfig.id) || [])].sort(
          (left, right) => dateValue(right.observedAt) - dateValue(left.observedAt),
        );
        const latest = history[0] || {
          id: `missing-${measurementConfig.id}`,
          measurementId: measurementConfig.id,
          system: systemId,
          clinicalName: measurementConfig.clinicalName,
          patientFriendlyName: measurementConfig.patientFriendlyName,
          value: null,
          unit: measurementConfig.unit,
          observedAt: null,
          sourceType: null,
          sourceLabel: null,
          referenceRange: {
            text: measurementConfig.referenceRange || "Reference range unavailable",
            source: "Provisional clinical configuration",
          },
          verificationStatus: null,
          reviewedBy: null,
          status: "insufficient-data",
          classificationStatus: "insufficient-data",
          freshness: "unknown",
          contextApplied: [],
          clinicianMessage: "No data recorded.",
          patientMessage: null,
          completeReportReference: null,
          recommendedAction: null,
          ruleGovernance: measurementConfig.rule.governance,
        };
        const sameLatestTime = latest.observedAt
          ? history.filter(
              (item) =>
                item.status === "conflicting-data" &&
                item.observedAt === latest.observedAt,
            )
          : [];
        return {
          config: measurementConfig,
          latest,
          currentRecords: sameLatestTime.length > 1 ? sameLatestTime : [latest],
          history,
          trend: buildMeasurementTrend(history, measurementConfig),
          hasData: history.length > 0,
        };
      });
      return [
        systemId,
        {
          config,
          measurements,
          relatedReports: relatedReports(medicalRecords, systemId),
          availableCount: measurements.filter((item) => item.hasData).length,
          reviewCount: measurements.filter((item) =>
            [
              "abnormal",
              "urgent-review",
              "critical-review",
              "conflicting-data",
              "clinician-review-required",
            ].includes(item.latest.classificationStatus),
          ).length,
          outdatedCount: measurements.filter((item) => item.latest.status === "outdated")
            .length,
        },
      ];
    }),
  );
}

function latestIcuVitals(classifiedMeasurements) {
  const ids = new Set([
    "blood-pressure",
    "heart-rate",
    "respiratory-rate",
    "oxygen-saturation",
  ]);
  const latest = new Map();
  classifiedMeasurements
    .filter((item) => ids.has(item.measurementId) && item.sourceType === "device")
    .sort((left, right) => dateValue(right.observedAt) - dateValue(left.observedAt))
    .forEach((item) => {
      if (!latest.has(item.measurementId)) latest.set(item.measurementId, item);
    });
  return [...latest.values()];
}

function makeOverviewData({
  classifiedMeasurements,
  contextCollections,
  icuPatient,
  admissions,
  now,
}) {
  const reviewStatuses = new Set([
    "urgent-review",
    "critical-review",
    "conflicting-data",
  ]);
  const measurementAlerts = classifiedMeasurements
    .filter((item) => reviewStatuses.has(item.classificationStatus))
    .map((item) => ({
      text: `${item.clinicalName}: ${item.clinicianMessage}`,
      observedAt: item.observedAt,
      sourceLabel: item.sourceLabel,
      status: item.classificationStatus,
    }));
  const connectedAlerts = (icuPatient?.activeAlerts || []).map((alert) => ({
    text: alert.title || alert.message,
    observedAt: toIsoDate(alert.createdAt),
    sourceLabel: "ICU alert service",
    statusLabel: alert.status === "ACKNOWLEDGED" ? "Acknowledged" : "Active",
    status: canonicalText(alert.severity).includes("critical")
      ? "critical-review"
      : "urgent-review",
  }));
  const alerts = [...connectedAlerts, ...measurementAlerts].sort(
    (left, right) => dateValue(right.observedAt) - dateValue(left.observedAt),
  );

  const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const recentAbnormal = classifiedMeasurements
    .filter(
      (item) =>
        dateValue(item.observedAt) >= thirtyDaysAgo &&
        ["abnormal", "urgent-review", "critical-review", "conflicting-data"].includes(
          item.classificationStatus,
        ),
    )
    .sort((left, right) => dateValue(right.observedAt) - dateValue(left.observedAt));
  const vitals = latestIcuVitals(classifiedMeasurements);

  const confirmedConditions = contextCollections.conditions.filter(
    (item) => item.statusLabel === "Confirmed",
  );
  const recordedConditions = contextCollections.conditions.filter(
    (item) => item.statusLabel !== "Confirmed",
  );
  const conditionItems = confirmedConditions.length
    ? confirmedConditions
    : recordedConditions;

  const priorities = [
    {
      id: "clinical-alerts",
      rank: 1,
      label: "Clinical alerts",
      status: alerts.length ? "clinician-review-required" : "insufficient-data",
      items: alerts.slice(0, 4),
      emptyMessage: icuPatient
        ? "No active connected alerts were returned."
        : "Connected clinical-alert data is unavailable.",
    },
    {
      id: "diagnoses",
      rank: 2,
      label: confirmedConditions.length
        ? "Active clinician-confirmed diagnoses"
        : "Recorded conditions",
      status: conditionItems.length ? "recorded" : "insufficient-data",
      items: conditionItems.slice(0, 4),
      emptyMessage: "No data recorded.",
      note:
        !confirmedConditions.length && recordedConditions.length
          ? "Confirmation status was not supplied; entries are labeled Reported or Suspected."
          : null,
    },
    {
      id: "medications",
      rank: 3,
      label: "Current medications",
      status: contextCollections.medications.length ? "recorded" : "insufficient-data",
      items: contextCollections.medications.slice(0, 4),
      emptyMessage: "No data recorded.",
    },
    {
      id: "allergies",
      rank: 4,
      label: "Allergies",
      status: contextCollections.allergies.length ? "recorded" : "insufficient-data",
      items: contextCollections.allergies.slice(0, 4),
      emptyMessage: "No data recorded.",
    },
    {
      id: "recent-abnormal",
      rank: 5,
      label: "Recent abnormal results (30 days)",
      status: recentAbnormal.length ? "abnormal" : "insufficient-data",
      items: recentAbnormal.slice(0, 4).map((item) => ({
        text: `${item.clinicalName}: ${displayMeasurementValue(item)}`,
        observedAt: item.observedAt,
        sourceLabel: item.sourceLabel,
        statusLabel: item.classificationStatus,
      })),
      emptyMessage: "No recent abnormal result data recorded.",
    },
    {
      id: "vital-snapshot",
      rank: 6,
      label: "Latest vital-sign snapshot",
      status: vitals.length ? "recorded" : "insufficient-data",
      items: vitals.map((item) => ({
        text: `${item.clinicalName}: ${displayMeasurementValue(item)}`,
        observedAt: item.observedAt,
        sourceLabel: item.sourceLabel,
        statusLabel: item.status,
      })),
      emptyMessage: "No connected ICU vital-sign snapshot is available.",
    },
    {
      id: "upcoming",
      rank: 7,
      label: "Upcoming tests or appointments",
      status: contextCollections.upcoming.length ? "recorded" : "unavailable",
      items: contextCollections.upcoming.slice(0, 4),
      emptyMessage: "No upcoming test or appointment data is available from connected records.",
    },
  ];

  return {
    priorities,
    secondary: {
      symptoms: {
        supported: false,
        items: [],
        emptyMessage:
          "A structured current-symptoms source is not connected; narrative notes are not converted into symptoms.",
      },
      admissions: [...(admissions || [])]
        .sort((left, right) => dateValue(right.admittedAt) - dateValue(left.admittedAt))
        .map((admission) => ({
          text:
            admission.admissionReason ||
            admission.department?.name ||
            "Hospital admission",
          observedAt: toIsoDate(admission.admittedAt),
          sourceLabel: "Admission record",
          statusLabel: admission.currentStatus || "Recorded",
        })),
    },
  };
}

export function displayMeasurementValue(measurement) {
  if (isMissingClinicalValue(measurement?.value)) return "No data recorded.";
  if (typeof measurement.value === "object") {
    return `${measurement.value.systolic}/${measurement.value.diastolic} ${measurement.unit}`;
  }
  return `${measurement.value} ${measurement.unit || ""}`.trim();
}

export function normalizePatientSystemData(input = {}, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const medicalRecords = Array.isArray(input.medicalRecords) ? input.medicalRecords : [];
  const fhirAndStructured = normalizeMedicalRecords(medicalRecords);
  const icuMeasurements = normalizeIcuVitals(input.icuPatient, input.icuVitalsHistory);
  const profileMeasurements = normalizeMedicalProfileMeasurements(
    input.medicalProfile,
    [...fhirAndStructured, ...icuMeasurements],
  );
  const rawMeasurements = markConflicts([
    ...fhirAndStructured,
    ...icuMeasurements,
    ...profileMeasurements,
  ]).filter((item) => {
    const config = getConfigByIdentifier(item.measurementId);
    return !config?.validatedResultOnly || item.validatedImplementation === true;
  });

  const context = {
    patient: input.patient || {},
    medicalProfile: input.medicalProfile || {},
    isInpatient: input.isInpatient === true,
    history: rawMeasurements,
  };
  const classifiedMeasurements = rawMeasurements
    .map((item) => classifyMeasurement(item, context, { now }))
    .sort((left, right) => dateValue(right.observedAt) - dateValue(left.observedAt));
  const contextCollections = normalizeContextCollections(
    input.medicalProfile,
    medicalRecords,
    now,
  );
  const systems = createSystemData(classifiedMeasurements, medicalRecords);
  const overview = makeOverviewData({
    classifiedMeasurements,
    contextCollections,
    icuPatient: input.icuPatient,
    admissions: input.admissions,
    now,
  });

  return {
    generatedAt: now.toISOString(),
    measurements: classifiedMeasurements,
    systems,
    overview,
    allergies: contextCollections.allergies,
    vaccinations: contextCollections.vaccinations,
    medications: contextCollections.medications,
    conditions: contextCollections.conditions,
    upcoming: contextCollections.upcoming,
    riskScores: classifiedMeasurements
      .filter(
        (item) =>
          item.measurementId === "frax" &&
          item.validatedImplementation === true &&
          item.validationMetadata?.version,
      )
      .map((item) => ({
        ...item,
        limitation:
          "Displayed from a validated external implementation; this interface does not calculate the score.",
      })),
    dataSources: {
      patientDemographics: Boolean(input.patient),
      medicalProfile: Boolean(input.medicalProfile),
      medicalRecords: medicalRecords.length > 0,
      fhirObservations: fhirAndStructured.some(
        (item) => item.sourceLabel?.startsWith("FHIR R4"),
      ),
      diagnosticReports: medicalRecords.some(
        (record) =>
          record?.structuredData?.payload?.resourceType === "DiagnosticReport" ||
          record?.structuredData?.diagnosticId,
      ),
      icuVitals: icuMeasurements.length > 0,
      admissions: Array.isArray(input.admissions) && input.admissions.length > 0,
    },
  };
}
