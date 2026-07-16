export function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export function round(v) { return Math.round(v); }

export function standardDeviation(values) {
  if (values.length < 2) return 0;
  const mean = avg(values);
  return Math.sqrt(avg(values.map((value) => (value - mean) ** 2)));
}

export function monthKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(mk) {
  if (!mk) return "";
  const [y, m] = mk.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[parseInt(m, 10) - 1]} ${y}`;
}

export function recordTimestamp(record) {
  const value = record?.calculatedAt || record?.createdAt;
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

export function buildWindowedSeries(records, deriveValue) {
  const dated = records
    .map((record) => ({ record, time: recordTimestamp(record) }))
    .filter((entry) => entry.time != null)
    .sort((a, b) => a.time - b.time);

  if (dated.length < 4) return [];

  const bucketCount = dated.length >= 12 ? 4 : dated.length >= 8 ? 3 : 2;
  const bucketSize = Math.ceil(dated.length / bucketCount);
  const labels = bucketCount === 2
    ? ["Earlier records", "Recent records"]
    : bucketCount === 3
      ? ["Earlier", "Middle", "Recent"]
      : ["Early", "Mid 1", "Mid 2", "Recent"];

  return Array.from({ length: bucketCount }, (_, index) => {
    const slice = dated.slice(index * bucketSize, (index + 1) * bucketSize).map((entry) => entry.record);
    if (!slice.length) return null;
    const value = deriveValue(slice);
    return value == null ? null : { label: labels[index], value: round(value) };
  }).filter(Boolean);
}

/* ── Forecasting ── */

// Weighted Moving Average — linear weights (most recent gets highest weight)
export function weightedMovingAverage(values, periods = 3) {
  if (values.length < periods) return null;
  const recent = values.slice(-periods);
  const weights = Array.from({ length: periods }, (_, i) => i + 1);
  const weightSum = weights.reduce((s, w) => s + w, 0);
  return recent.reduce((sum, v, i) => sum + v * weights[i], 0) / weightSum;
}

// Exponential Smoothing — Sₜ = α·Yₜ + (1−α)·Sₜ₋₁
export function exponentialSmoothing(values, alpha = 0.3) {
  if (values.length < 2) return null;
  let smoothed = values[0];
  for (let i = 1; i < values.length; i++) {
    smoothed = alpha * values[i] + (1 - alpha) * smoothed;
  }
  return smoothed;
}

// Linear Regression — fit y = mx + b via least squares, predict next period
export function linearRegressionForecast(values) {
  const n = values.length;
  if (n < 2) return null;
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((s, v) => s + v, 0);
  const sumY = values.reduce((s, v) => s + v, 0);
  const sumXY = x.reduce((s, xi, i) => s + xi * values[i], 0);
  const sumXX = x.reduce((s, xi) => s + xi * xi, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return intercept + slope * n;
}

// MAPE — Mean Absolute Percentage Error
export function meanAbsolutePercentageError(actual, predicted) {
  if (!actual.length || !predicted.length || actual.length !== predicted.length) return null;
  const errors = actual.map((a, i) => (a ? Math.abs((a - predicted[i]) / a) * 100 : 0));
  return avg(errors);
}

export function pearsonCorr(x, y) {
  const n = x.length;
  if (n < 3) return null;
  const sx = x.reduce((a, b) => a + b, 0);
  const sy = y.reduce((a, b) => a + b, 0);
  const sxx = x.reduce((a, b) => a + b * b, 0);
  const syy = y.reduce((a, b) => a + b * b, 0);
  const sxy = x.reduce((a, b, i) => a + b * y[i], 0);
  const denom = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  if (denom === 0) return null;
  return (n * sxy - sx * sy) / denom;
}
