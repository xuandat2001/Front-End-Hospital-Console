const COLLECTION_KEYS = ["records", "items", "results", "rows", "list", "values"];

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function extractCollection(response, keys = COLLECTION_KEYS) {
  if (Array.isArray(response)) return response;

  const data = response?.data ?? response;
  if (Array.isArray(data)) return data;

  if (data && typeof data === "object") {
    for (const key of keys) {
      if (Array.isArray(data[key])) return data[key];
    }
  }

  return [];
}

export function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function safeAverage(rows, selector, fallback = 0) {
  const values = asArray(rows)
    .map((row) => finiteNumber(typeof selector === "function" ? selector(row) : row?.[selector], NaN))
    .filter(Number.isFinite);

  if (!values.length) return fallback;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function safePercent(numerator, denominator, fallback = 0) {
  const top = finiteNumber(numerator, NaN);
  const bottom = finiteNumber(denominator, NaN);
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom === 0) return fallback;
  return (top / bottom) * 100;
}

export function clampPercent(value) {
  return Math.max(0, Math.min(100, finiteNumber(value)));
}
