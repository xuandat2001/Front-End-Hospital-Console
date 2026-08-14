import {
  SAFE_AUTOMATIC_ACTIONS,
  getMeasurementConfig,
} from "./patientSystemClinicalConfig";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const FORBIDDEN_AUTOMATIC_DIAGNOSTIC_WORDING =
  /\b(you have|heart attack|heart failure|cardiac arrest risk|stroke|cancer|respiratory failure|suffocat(?:e|ing)|at risk of dying|you are dying|brain damage|liver failure|pancreatitis|dementia|seizure|immunodeficiency|hormonal disorder)\b/i;

export function isMissingClinicalValue(value) {
  if (value === null || value === undefined || value === "") return true;
  if (typeof value === "number") return !Number.isFinite(value);
  if (typeof value === "object") {
    const entries = Object.values(value);
    return entries.length === 0 || entries.every(isMissingClinicalValue);
  }
  return false;
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function ageAt(dateOfBirth, at = new Date()) {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return null;
  let age = at.getUTCFullYear() - birth.getUTCFullYear();
  const month = at.getUTCMonth() - birth.getUTCMonth();
  if (month < 0 || (month === 0 && at.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

function listText(values) {
  return (Array.isArray(values) ? values : [])
    .map((value) => (typeof value === "string" ? value : value?.name || value?.display || ""))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function contextText(context) {
  return [
    listText(context?.medicalProfile?.chronicConditions),
    listText(context?.medicalProfile?.pastMedicalHistory),
    listText(context?.medicalProfile?.currentMedications),
  ].join(" ");
}

function containsContext(context, terms) {
  const text = contextText(context);
  return terms.some((term) => text.includes(term));
}

function reportedRange(measurement) {
  const range = measurement?.reportedReferenceRange || measurement?.referenceRange;
  if (!range || typeof range === "string") return null;
  const low = asNumber(range.low);
  const high = asNumber(range.high);
  return {
    ...range,
    low,
    high,
  };
}

function statusForReportedRange(value, range) {
  if (!range || (range.low === null && range.high === null)) {
    return "clinician-review-required";
  }
  if (range.low !== null && value < range.low) return "abnormal";
  if (range.high !== null && value > range.high) return "abnormal";
  return range.kind === "target" ? "within-target" : "within-reference-range";
}

function classifyBloodPressure(value, context) {
  const systolic = asNumber(value?.systolic);
  const diastolic = asNumber(value?.diastolic);
  if (systolic === null || diastolic === null) return "insufficient-data";
  if (systolic > 180 || diastolic > 120) return "critical-review";
  if (systolic >= 140 || diastolic >= 90) return "abnormal";
  if (systolic >= 120 || diastolic >= 80) return "borderline";
  if (systolic < 90 || diastolic < 60) {
    return containsContext(context, ["symptomatic", "dizziness", "syncope"])
      ? "urgent-review"
      : "clinician-review-required";
  }
  return "within-reference-range";
}

function classifyHeartRate(value) {
  if (value < 40 || value > 150) return "critical-review";
  if (value < 50 || value > 110) return "abnormal";
  if ((value >= 50 && value <= 59) || (value >= 101 && value <= 110)) {
    return "borderline";
  }
  return "within-reference-range";
}

function classifyRespiratoryRate(value) {
  if (value < 8 || value > 30) return "critical-review";
  if (value > 24 || value < 12) return "abnormal";
  if (value >= 21) return "borderline";
  return "within-reference-range";
}

function comparableHistory(measurement, context) {
  return (context?.history || [])
    .filter(
      (item) =>
        item.id !== measurement.id &&
        item.measurementId === measurement.measurementId &&
        item.unit === measurement.unit &&
        item.collectionContext === measurement.collectionContext &&
        item.observedAt,
    )
    .sort((left, right) => new Date(left.observedAt) - new Date(right.observedAt));
}

function isSustainedLowOxygen(measurement, context) {
  if (measurement?.context?.sustained === true) return true;
  const currentTime = new Date(measurement.observedAt || 0).getTime();
  if (!currentTime) return false;
  return comparableHistory(measurement, context).some((item) => {
    const priorTime = new Date(item.observedAt).getTime();
    return (
      asNumber(item.value) !== null &&
      Number(item.value) < 88 &&
      currentTime - priorTime >= 0 &&
      currentTime - priorTime <= HOUR_MS
    );
  });
}

function classifyOxygenSaturation(measurement, context) {
  const value = asNumber(measurement.value);
  const hasIndividualizedContext = containsContext(context, ["copd", "altitude"]);
  const range = reportedRange(measurement);

  if (hasIndividualizedContext && !range) return "clinician-review-required";
  if (range) return statusForReportedRange(value, range);
  if (value < 88 && isSustainedLowOxygen(measurement, context)) {
    return "critical-review";
  }
  if (value < 90) return "abnormal";
  if (value <= 94) return "borderline";
  return "within-reference-range";
}

function classifyGcs(measurement, context) {
  const value = asNumber(measurement.value);
  const history = comparableHistory(measurement, context);
  const prior = history.at(-1);
  if (prior && asNumber(prior.value) - value >= 2) return "critical-review";
  if (value <= 8) return "critical-review";
  if (value <= 12) return "abnormal";
  if (value <= 14) return "borderline";
  return value === 15 ? "within-reference-range" : "clinician-review-required";
}

function classifyWeightChange(measurement, context) {
  const value = asNumber(measurement.value);
  const currentTime = new Date(measurement.observedAt || 0).getTime();
  if (!currentTime) return "insufficient-data";
  const recent = comparableHistory(measurement, context)
    .filter((item) => currentTime - new Date(item.observedAt).getTime() <= 3 * DAY_MS)
    .at(0);
  if (recent && value - asNumber(recent.value) > 2) return "clinician-review-required";
  return "insufficient-data";
}

function classifyByType(measurement, config, context) {
  const value = asNumber(measurement.value);
  const range = reportedRange(measurement);

  switch (config.rule.type) {
    case "blood-pressure":
      return classifyBloodPressure(measurement.value, context);
    case "heart-rate":
      return classifyHeartRate(value);
    case "ldl":
      if (value >= 190) return "critical-review";
      if (value >= 160) return "abnormal";
      if (value >= 100) return "borderline";
      return "within-reference-range";
    case "hdl": {
      const sex = normalizeText(context?.patient?.gender || context?.patient?.sex);
      if (!sex) return "outside-supported-population";
      const lowThreshold = sex.startsWith("f") ? 50 : 40;
      if (value < lowThreshold) return "abnormal";
      if (value < 60) return "borderline";
      return "within-reference-range";
    }
    case "reported-upper-limit":
      if (!range || range.high === null) return "clinician-review-required";
      return value > range.high ? "abnormal" : "within-reference-range";
    case "reported-lower-limit":
      if (!range || range.low === null) return "clinician-review-required";
      return value < range.low ? "abnormal" : "within-reference-range";
    case "reported-range":
      return statusForReportedRange(value, range);
    case "requires-applicable-rule":
    case "requires-clinician-interpretation":
      return "clinician-review-required";
    case "validated-result-only":
      return measurement.validatedImplementation
        ? "clinician-review-required"
        : "insufficient-data";
    case "respiratory-rate":
      return classifyRespiratoryRate(value);
    case "oxygen-saturation":
      return classifyOxygenSaturation(measurement, context);
    case "peak-flow-percent":
      if (!String(measurement.unit || "").includes("%")) {
        return "clinician-review-required";
      }
      if (value < 50) return "critical-review";
      if (value < 60) return "abnormal";
      if (value < 80) return "borderline";
      return "within-reference-range";
    case "alt":
      if (value > 1000) return "critical-review";
      if (value > 100) return "abnormal";
      if (value >= 57) return "borderline";
      return value >= 7 ? "within-reference-range" : "abnormal";
    case "ast":
      if (value > 1000) return "critical-review";
      if (value > 100) return "abnormal";
      if (value >= 41) return "borderline";
      return value >= 10 ? "within-reference-range" : "abnormal";
    case "total-bilirubin":
      if (value > 20) return "critical-review";
      if (value > 3) return "abnormal";
      if (value >= 1.3) return "borderline";
      return value >= 0.1 ? "within-reference-range" : "abnormal";
    case "lipase": {
      if (range?.high !== null && range?.high !== undefined && value > range.high * 3) {
        return "abnormal";
      }
      if (value > 420) return "abnormal";
      if (value >= 141) return "borderline";
      return value >= 10 ? "within-reference-range" : "abnormal";
    }
    case "bmi":
      if (value < 18.5) return "abnormal";
      if (value < 25) return "within-reference-range";
      if (value < 30) return "borderline";
      return "abnormal";
    case "gcs":
      return classifyGcs(measurement, context);
    case "pain-score":
      if (value === 0) return "within-target";
      if (value <= 3) return "borderline";
      if (value <= 6) return "abnormal";
      if (value <= 10) return "urgent-review";
      return "clinician-review-required";
    case "dexa-t-score":
      if (value >= -1) return "within-reference-range";
      if (value > -2.5) return "borderline";
      return "abnormal";
    case "wbc":
      if (value < 1 || value > 30) return "critical-review";
      if (value < 4 || value > 11) return "abnormal";
      return "within-reference-range";
    case "crp":
      if (value > 10) return "abnormal";
      if (value >= 3) return "borderline";
      return "within-reference-range";
    case "hba1c":
      if (range) return statusForReportedRange(value, range);
      if (value >= 6.5) return "abnormal";
      if (value >= 5.7) return "borderline";
      return "within-reference-range";
    case "fasting-glucose":
      if (value < 54 || value > 400) return "critical-review";
      if (value >= 126) return "abnormal";
      if (value >= 100) return "borderline";
      return "within-reference-range";
    case "tsh":
      if (range) return statusForReportedRange(value, range);
      return value < 0.4 || value > 4 ? "abnormal" : "within-reference-range";
    case "weight-change":
      return classifyWeightChange(measurement, context);
    default:
      return "clinician-review-required";
  }
}

function freshnessLimitMs(freshness = {}, isInpatient = false) {
  if (isInpatient) {
    if (freshness.inpatientHours !== undefined) {
      return freshness.inpatientHours * HOUR_MS;
    }
    if (freshness.inpatientDays !== undefined) return freshness.inpatientDays * DAY_MS;
  }
  if (freshness.outpatientHours !== undefined) {
    return freshness.outpatientHours * HOUR_MS;
  }
  if (freshness.outpatientDays !== undefined) return freshness.outpatientDays * DAY_MS;
  if (freshness.inpatientHours !== undefined) return freshness.inpatientHours * HOUR_MS;
  return null;
}

function statusMessage(status, config) {
  if (status === "within-reference-range") return "Within Reference Range";
  if (status === "within-target") return "Within Target";
  if (status === "borderline") return `${config.clinicianObservation} Borderline category.`;
  if (status === "abnormal") return config.clinicianObservation;
  if (status === "urgent-review" || status === "critical-review") {
    return `Clinician review required. ${config.clinicianObservation}`;
  }
  if (status === "insufficient-data") {
    return "Insufficient data for interpretation.";
  }
  if (status === "result-pending") {
    return "Result pending; no interpretation has been applied.";
  }
  if (status === "conflicting-data") {
    return "Conflicting data — clinician review required.";
  }
  if (status === "outside-supported-population") {
    return "Outside supported population; raw value shown without interpretation.";
  }
  return "Clinician review required.";
}

function unsupportedPopulationReason(measurement, config, context, now) {
  const age = ageAt(context?.patient?.dateOfBirth, now);
  if (age !== null && age < 18) {
    return "Pediatric interpretation rules are not configured.";
  }

  const pregnancyRelevant = config.contextualModifiers.includes("pregnancy");
  if (pregnancyRelevant && containsContext(context, ["pregnan", "gestation"])) {
    return "Pregnancy-specific interpretation rules are incomplete.";
  }

  if (
    config.id === "bmi" &&
    normalizeText(context?.patient?.ethnicity).match(/asian|south asia|east asia/)
  ) {
    return "Applicable ethnicity-specific BMI cutoffs are not configured.";
  }

  if (config.id === "dexa-t-score" && age !== null && age < 50) {
    return "A Z-score may be more appropriate for this age group.";
  }

  if (
    config.id === "hba1c" &&
    containsContext(context, ["diabetes", "frail"]) &&
    !reportedRange(measurement)
  ) {
    return "An individualized treatment target is required.";
  }

  if (
    config.id === "blood-pressure" &&
    containsContext(context, ["chronic kidney", "ckd", "diabetes"]) &&
    !reportedRange(measurement)
  ) {
    return "An individualized blood-pressure target is required.";
  }

  return null;
}

function effectiveReferenceRange(measurement, config) {
  const range = reportedRange(measurement);
  const requiresReportedRange = [
    "reported-upper-limit",
    "reported-lower-limit",
    "reported-range",
  ].includes(config.rule.type);
  const prefersReportedRange = [
    "oxygen-saturation",
    "hba1c",
    "tsh",
  ].includes(config.rule.type);

  if (range && (requiresReportedRange || prefersReportedRange)) {
    const text =
      range.text ||
      [
        range.low !== null ? `low ${range.low}` : "",
        range.high !== null ? `high ${range.high}` : "",
      ]
        .filter(Boolean)
        .join(", ");
    return {
      ...range,
      text: text || "Reference range unavailable",
      source: range.source || "Source report",
    };
  }
  if (requiresReportedRange || config.rule.type === "requires-applicable-rule") {
    return {
      text: "Reference range unavailable",
      requirement: config.referenceRange,
      low: null,
      high: null,
      source: "Applicable source range or rule not supplied",
    };
  }
  return {
    text: config.referenceRange || "Reference range unavailable",
    low: null,
    high: null,
    source: "Provisional clinical configuration",
    reportedAtTime: range,
  };
}

export function classifyMeasurement(measurement, context = {}, options = {}) {
  const config = getMeasurementConfig(measurement?.measurementId);
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());

  if (!config || isMissingClinicalValue(measurement?.value)) {
    return {
      ...measurement,
      status: "insufficient-data",
      classificationStatus: "insufficient-data",
      freshness: "unknown",
      referenceRange: config
        ? effectiveReferenceRange(measurement, config)
        : { text: "Reference range unavailable", source: "Unavailable" },
      contextApplied: [],
      clinicianMessage: "No data recorded.",
      patientMessage: null,
      recommendedAction: null,
      ruleGovernance: config?.rule?.governance || null,
    };
  }

  const base = {
    ...measurement,
    system: config.system,
    clinicalName: config.clinicalName,
    patientFriendlyName: config.patientFriendlyName,
    referenceRange: effectiveReferenceRange(measurement, config),
    contextApplied: [],
    patientMessage: config.patientMessage,
    ruleGovernance: config.rule.governance,
  };

  const sourceStatus = normalizeText(measurement.resultStatus);
  if (["registered", "preliminary", "partial", "pending"].includes(sourceStatus)) {
    return {
      ...base,
      status: "result-pending",
      classificationStatus: "result-pending",
      freshness: "unknown",
      clinicianMessage: statusMessage("result-pending", config),
      recommendedAction: null,
    };
  }

  if (measurement.conflicting === true) {
    return {
      ...base,
      status: "conflicting-data",
      classificationStatus: "conflicting-data",
      freshness: "unknown",
      clinicianMessage: statusMessage("conflicting-data", config),
      recommendedAction: SAFE_AUTOMATIC_ACTIONS["conflicting-data"],
    };
  }

  const unsupportedReason = unsupportedPopulationReason(measurement, config, context, now);
  if (unsupportedReason) {
    return {
      ...base,
      status: "outside-supported-population",
      classificationStatus: "outside-supported-population",
      freshness: "unknown",
      contextApplied: [unsupportedReason],
      clinicianMessage: statusMessage("outside-supported-population", config),
      patientMessage: null,
      recommendedAction: SAFE_AUTOMATIC_ACTIONS["outside-supported-population"],
    };
  }

  let classificationStatus = classifyByType(measurement, config, context);
  const contextApplied = [];
  if (config.id === "oxygen-saturation" && containsContext(context, ["copd"])) {
    contextApplied.push("Recorded respiratory condition requires an individualized oxygen target.");
  }
  if (config.id === "heart-rate" && containsContext(context, ["beta-blocker", "beta blocker"])) {
    contextApplied.push("A recorded beta-blocker may modify the expected heart-rate range.");
  }
  if (measurement.reportedReferenceRange) {
    contextApplied.push("The source report's reference range was used where the rule requires it.");
  }

  const observedAt = new Date(measurement.observedAt || "");
  const limit = freshnessLimitMs(config.freshness, context?.isInpatient === true);
  let freshness = "unknown";
  if (!Number.isNaN(observedAt.getTime())) {
    freshness =
      limit !== null && now.getTime() - observedAt.getTime() > limit
        ? "outdated"
        : "current";
  }

  const status = freshness === "outdated" ? "outdated" : classificationStatus;
  let clinicianMessage =
    status === "outdated"
      ? `May be outdated. Last recorded result: ${statusMessage(classificationStatus, config)}`
      : statusMessage(status, config);

  if (FORBIDDEN_AUTOMATIC_DIAGNOSTIC_WORDING.test(clinicianMessage)) {
    classificationStatus = "clinician-review-required";
    clinicianMessage = "Clinician review required.";
  }

  return {
    ...base,
    status,
    classificationStatus,
    freshness,
    contextApplied,
    clinicianMessage,
    recommendedAction: SAFE_AUTOMATIC_ACTIONS[status] ?? null,
  };
}

function displayTrendValue(value) {
  if (typeof value === "object") {
    return `${value.systolic}/${value.diastolic}`;
  }
  return String(value);
}

function trendNumber(value) {
  if (typeof value === "object") return asNumber(value.systolic);
  return asNumber(value);
}

export function buildMeasurementTrend(history, measurementConfig) {
  const dated = [...(history || [])]
    .filter(
      (item) =>
        item.observedAt &&
        !Number.isNaN(new Date(item.observedAt).getTime()) &&
        item.status !== "conflicting-data",
    )
    .sort((left, right) => new Date(left.observedAt) - new Date(right.observedAt));

  const latest = dated.at(-1);
  if (!latest) {
    return {
      available: false,
      summary: "Not enough history to calculate a trend.",
      points: [],
      excludedCount: 0,
    };
  }

  const compatible = dated.filter(
    (item) =>
      item.unit === latest.unit &&
      item.collectionContext === latest.collectionContext &&
      trendNumber(item.value) !== null,
  );
  const excludedCount = dated.length - compatible.length;
  if (compatible.length < 2) {
    return {
      available: false,
      summary: "Not enough history to calculate a trend.",
      points: [],
      excludedCount,
    };
  }

  const trendRule = measurementConfig?.trend || {};
  const last = compatible.at(-1);
  const lastTime = new Date(last.observedAt).getTime();
  const comparisonWindowMs = Number.isFinite(trendRule.meaningfulChangeDays)
    ? trendRule.meaningfulChangeDays * DAY_MS
    : null;
  const meaningfulComparison = comparisonWindowMs
    ? compatible.filter(
        (item) => lastTime - new Date(item.observedAt).getTime() <= comparisonWindowMs,
      )
    : compatible;
  const first = compatible[0];
  const comparisonFirst = meaningfulComparison[0] || first;
  const firstNumber = trendNumber(first.value);
  const lastNumber = trendNumber(last.value);
  const delta = lastNumber - firstNumber;
  const direction = delta > 0 ? "increased" : delta < 0 ? "decreased" : "was unchanged";
  const comparisonFirstNumber = trendNumber(comparisonFirst.value);
  const comparisonDelta = lastNumber - comparisonFirstNumber;
  const meaningfulThreshold = trendRule.meaningfulChange;
  const directionMatches =
    !trendRule.meaningfulDirection ||
    (trendRule.meaningfulDirection === "increase" && comparisonDelta > 0) ||
    (trendRule.meaningfulDirection === "decrease" && comparisonDelta < 0);
  let isMeaningful = false;
  if (
    typeof meaningfulThreshold === "object" &&
    typeof comparisonFirst.value === "object" &&
    typeof last.value === "object"
  ) {
    isMeaningful =
      Math.abs(last.value.systolic - comparisonFirst.value.systolic) >
        meaningfulThreshold.systolic ||
      Math.abs(last.value.diastolic - comparisonFirst.value.diastolic) >
        meaningfulThreshold.diastolic;
  } else if (Number.isFinite(meaningfulThreshold)) {
    isMeaningful =
      trendRule.meaningfulInclusive === false
        ? Math.abs(comparisonDelta) > meaningfulThreshold
        : Math.abs(comparisonDelta) >= meaningfulThreshold;
  } else if (
    Number.isFinite(trendRule.meaningfulFactor) &&
    comparisonFirstNumber !== 0
  ) {
    isMeaningful =
      lastNumber / comparisonFirstNumber > trendRule.meaningfulFactor;
  } else if (
    Number.isFinite(trendRule.meaningfulPercent) &&
    comparisonFirstNumber !== 0
  ) {
    isMeaningful =
      (Math.abs(comparisonDelta) / Math.abs(comparisonFirstNumber)) * 100 >
      trendRule.meaningfulPercent;
  }
  isMeaningful =
    isMeaningful &&
    directionMatches &&
    compatible.length >= (trendRule.minimumPointsForMeaningful || 2);
  const contextNote = excludedCount
    ? ` ${excludedCount} observation(s) with a different unit or collection context were excluded.`
    : "";

  return {
    available: true,
    summary:
      `${measurementConfig.clinicalName} ${direction} from ${displayTrendValue(first.value)} ${first.unit} to ${displayTrendValue(last.value)} ${last.unit}.` +
      (isMeaningful ? " This meets the configured meaningful-change threshold." : "") +
      contextNote,
    direction,
    delta,
    isMeaningful,
    excludedCount,
    points: compatible.map((item) => ({
      id: item.id,
      value: item.value,
      numericValue: trendNumber(item.value),
      unit: item.unit,
      observedAt: item.observedAt,
      sourceLabel: item.sourceLabel,
      collectionContext: item.collectionContext,
    })),
  };
}
