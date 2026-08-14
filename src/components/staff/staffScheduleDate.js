export function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(value) {
  if (value instanceof Date) return new Date(value);

  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getMonday(value) {
  const date = parseLocalDate(value);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addLocalDays(value, days) {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + days);
  return date;
}
