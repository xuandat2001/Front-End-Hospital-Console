import { formatDate, formatTime } from "../../../utils/dateFormat";

export const STATUS_META = {
  BOOKED: { label: "Booked", color: "#06b6d4", badge: "bg-cyan-500/15 text-cyan-300 border-cyan-400/20" },
  IN_PROGRESS: { label: "In progress", color: "#a855f7", badge: "bg-violet-500/15 text-violet-200 border-violet-400/25" },
  COMPLETED: { label: "Completed", color: "#22c55e", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20" },
  NO_SHOW: { label: "No-show", color: "#f97316", badge: "bg-orange-500/15 text-orange-300 border-orange-400/20" },
  CANCELED: { label: "Canceled", color: "#ec476f", badge: "bg-rose-500/15 text-rose-300 border-rose-400/20" },
};

export function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase();
}

export function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function getWeekRange(value = new Date()) {
  const date = new Date(value);
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function buildWeekRows(appointments = [], value = new Date()) {
  const { start } = getWeekRange(value);
  const counts = new Map();
  appointments.forEach((appointment) => {
    const key = localDateKey(appointment.appointmentDateTime);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = localDateKey(date);
    return {
      key,
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      count: counts.get(key) || 0,
    };
  });
}

export function appointmentPatientName(appointment) {
  return appointment?.patient?.name || appointment?.patient?.fullName || "Unknown patient";
}

export function appointmentPatientEllyId(appointment) {
  return appointment?.patient?.ellyId || "Not available";
}

export function appointmentDepartment(appointment) {
  return appointment?.department?.name || appointment?.department?.specialty || "Not assigned";
}

export function formatAppointmentTime(value) {
  return formatTime(value) || "N/A";
}

export function formatAppointmentDate(value) {
  return formatDate(value) || "N/A";
}

export function statusCounts(appointments = []) {
  const counts = { BOOKED: 0, COMPLETED: 0, NO_SHOW: 0, CANCELED: 0 };
  appointments.forEach((appointment) => {
    const status = normalizeStatus(appointment.status);
    if (status === "IN_PROGRESS") {
      counts.BOOKED += 1;
    } else if (Object.hasOwn(counts, status)) {
      counts[status] += 1;
    }
  });
  return counts;
}

const FINAL_APPOINTMENT_STATUSES = new Set(["COMPLETED", "NO_SHOW", "CANCELED"]);

export function sortDoctorScheduleAppointments(appointments = []) {
  const statusRank = (appointment) => {
    const status = normalizeStatus(appointment.status);
    if (status === "IN_PROGRESS") return 0;
    if (status === "BOOKED") return 1;
    if (FINAL_APPOINTMENT_STATUSES.has(status)) return 2;
    return 1;
  };

  return appointments
    .map((appointment, index) => ({ appointment, index }))
    .sort((left, right) => {
      const rankDifference = statusRank(left.appointment) - statusRank(right.appointment);
      if (rankDifference !== 0) return rankDifference;

      const leftTime = new Date(left.appointment.appointmentDateTime).getTime();
      const rightTime = new Date(right.appointment.appointmentDateTime).getTime();
      if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime) && leftTime !== rightTime) {
        return leftTime - rightTime;
      }
      return left.index - right.index;
    })
    .map(({ appointment }) => appointment);
}
