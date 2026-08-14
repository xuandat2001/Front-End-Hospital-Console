const DEFAULT_LOCALE = "en-AU";

/**
 * Converts common API date values into a valid Date instance.
 *
 * Supports:
 * - ISO date strings
 * - JavaScript Date objects
 * - Millisecond timestamps
 * - Unix timestamps in seconds
 */
function toValidDate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  let normalizedValue = value;

  // Convert a Unix timestamp in seconds to milliseconds.
  if (
    typeof normalizedValue === "number" &&
    Math.abs(normalizedValue) < 1_000_000_000_000
  ) {
    normalizedValue *= 1000;
  }

  const date = new Date(normalizedValue);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatWithIntl(value, options) {
  const date = toValidDate(value);

  if (!date) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, options).format(date);
  } catch {
    return "";
  }
}

/**
 * Example: 27 Jul 2026
 */
export function formatDate(value, options = {}) {
  return formatWithIntl(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  });
}

/**
 * Example: 10:45 am
 */
export function formatTime(value, options = {}) {
  return formatWithIntl(value, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...options,
  });
}

/**
 * Example: 27 Jul 2026, 10:45 am
 */
export function formatDateTime(value, options = {}) {
  return formatWithIntl(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...options,
  });
}

/**
 * Example: 27 Jul, 10:45 am
 */
export function formatShortDateTime(value, options = {}) {
  return formatWithIntl(value, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...options,
  });
}

/**
 * Human-readable relative time.
 *
 * Examples:
 * - just now
 * - 5 minutes ago
 * - in 2 hours
 */
export function formatRelative(value, nowValue = new Date()) {
  const date = toValidDate(value);
  const now = toValidDate(nowValue);

  if (!date || !now) {
    return "";
  }

  const differenceMs = date.getTime() - now.getTime();
  const absoluteMs = Math.abs(differenceMs);

  if (absoluteMs < 5_000) {
    return "just now";
  }

  const units = [
    {
      unit: "year",
      milliseconds: 365 * 24 * 60 * 60 * 1000,
    },
    {
      unit: "month",
      milliseconds: 30 * 24 * 60 * 60 * 1000,
    },
    {
      unit: "week",
      milliseconds: 7 * 24 * 60 * 60 * 1000,
    },
    {
      unit: "day",
      milliseconds: 24 * 60 * 60 * 1000,
    },
    {
      unit: "hour",
      milliseconds: 60 * 60 * 1000,
    },
    {
      unit: "minute",
      milliseconds: 60 * 1000,
    },
    {
      unit: "second",
      milliseconds: 1000,
    },
  ];

  const selectedUnit =
    units.find(({ milliseconds }) => absoluteMs >= milliseconds) ||
    units[units.length - 1];

  const amount = Math.round(
    differenceMs / selectedUnit.milliseconds,
  );

  try {
    return new Intl.RelativeTimeFormat(DEFAULT_LOCALE, {
      numeric: "auto",
    }).format(amount, selectedUnit.unit);
  } catch {
    return formatDateTime(date);
  }
}

/**
 * Uses relative time for recent values and a date-time for older values.
 */
export function formatSmart(value, nowValue = new Date()) {
  const date = toValidDate(value);
  const now = toValidDate(nowValue);

  if (!date || !now) {
    return "";
  }

  const differenceMs = Math.abs(now.getTime() - date.getTime());

  if (differenceMs < 7 * 24 * 60 * 60 * 1000) {
    return formatRelative(date, now);
  }

  return formatDateTime(date);
}

/**
 * Compact timestamp age for live operational widgets.
 *
 * Examples:
 * - now
 * - 35s ago
 * - 12m ago
 * - 3h ago
 */
export function formatAge(value, nowValue = new Date()) {
  const date = toValidDate(value);
  const now = toValidDate(nowValue);

  if (!date || !now) {
    return "";
  }

  const differenceMs = now.getTime() - date.getTime();

  if (differenceMs <= 5_000) {
    return "now";
  }

  const seconds = Math.floor(differenceMs / 1000);

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return formatShortDateTime(date);
}


