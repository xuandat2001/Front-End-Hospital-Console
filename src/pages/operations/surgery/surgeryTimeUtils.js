import { formatDate, formatTime, formatDateTime } from "../../../utils/dateFormat";

const TIME_ONLY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

const parseScheduledDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === "string") {
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      const [, year, month, day] = dateOnly;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const parseSurgeryDateTime = (value, scheduledDate) => {
  if (!value) return null;

  if (typeof value === "string") {
    const timeOnly = value.match(TIME_ONLY_PATTERN);
    if (timeOnly) {
      const baseDate = parseScheduledDate(scheduledDate);
      if (!baseDate) return null;

      const [, hour, minute, second = "0"] = timeOnly;
      const result = new Date(baseDate);
      result.setHours(Number(hour), Number(minute), Number(second), 0);
      return result;
    }
  }

  return parseScheduledDate(value);
};

export const getSurgeryStart = (booking) =>
  parseSurgeryDateTime(booking?.startTime, booking?.scheduledDate) ||
  parseSurgeryDateTime(booking?.scheduledDate);

export const getSurgeryEnd = (booking, start = getSurgeryStart(booking)) => {
  if (!start) return null;

  const end = parseSurgeryDateTime(booking?.endTime, booking?.scheduledDate);
  if (end) {
    if (end <= start) end.setDate(end.getDate() + 1);
    return end;
  }

  return new Date(start.getTime() + 60 * 60 * 1000);
};

export const getSurgeryCalendarSlot = (booking) => {
  const start = getSurgeryStart(booking);
  if (!start) return null;

  const end = getSurgeryEnd(booking, start);
  const dayIdx = (start.getDay() + 6) % 7;
  const startHour = start.getHours();
  const sameDay = start.toDateString() === end.toDateString();
  const endBoundary = sameDay
    ? end.getHours() + end.getMinutes() / 60 + end.getSeconds() / 3600
    : startHour + (end.getTime() - start.getTime()) / (60 * 60 * 1000);
  const rowSpan = Math.max(1, Math.min(24 - startHour, Math.ceil(endBoundary) - startHour));

  return { start, end, dayIdx, startHour, rowSpan };
};

export const formatSurgeryDate = (value, fallbackDate) => {
  const date = parseSurgeryDateTime(value, fallbackDate);
  return date ? formatDate(date) : "-";
};

export const formatSurgeryTime = (value, fallbackDate) => {
  const date = parseSurgeryDateTime(value, fallbackDate);
  return date ? formatTime(date) : "-";
};

export const formatSurgeryDateTime = (value, fallbackDate) => {
  const date = parseSurgeryDateTime(value, fallbackDate);
  return date ? formatDateTime(date) : "-";
};
