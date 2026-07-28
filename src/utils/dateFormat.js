function pad(n) {
  return String(n).padStart(2, "0");
}

function toDDMMYYYY(date) {
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

function parse(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatRelative(value) {
  const date = parse(value);
  if (!date) return "\u2014";

  const diff = Date.now() - date.getTime();
  const seconds = Math.max(0, Math.floor(diff / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function formatSmart(value) {
  const date = parse(value);
  if (!date) return "\u2014";

  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 7) return formatRelative(value);
  return `${toDDMMYYYY(date)}, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`;
}

export function formatDate(value) {
  const date = parse(value);
  if (!date) return "\u2014";
  return toDDMMYYYY(date);
}

export function formatTime(value) {
  const date = parse(value);
  if (!date) return "\u2014";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function formatDateTime(value) {
  const date = parse(value);
  if (!date) return "\u2014";
  return `${toDDMMYYYY(date)}, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`;
}

export function formatShortDateTime(value) {
  const date = parse(value);
  if (!date) return "\u2014";
  return `${toDDMMYYYY(date)}, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`;
}

export function formatAge(value) {
  const date = parse(value);
  if (!date) return "\u2014";
  const diff = Date.now() - date.getTime();
  const seconds = Math.max(0, Math.floor(diff / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
