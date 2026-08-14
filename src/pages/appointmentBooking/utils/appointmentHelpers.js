import { formatDateTime as dfFormatDateTime, formatTime } from "../../../utils/dateFormat";

export function normalizeStatus(status) {
  return String(status || "").trim().toUpperCase();
}

export function getLocalDateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayDateKey() {
  return getLocalDateKey(new Date());
}

export function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function convertToDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export function formatDateTime(value) {
  return dfFormatDateTime(value) === "—" ? "N/A" : dfFormatDateTime(value);
}

export function formatAppointmentDateTime(value) {
  return dfFormatDateTime(value) === "—" ? "N/A" : dfFormatDateTime(value);
}

export function formatShortTime(value) {
  return formatTime(value) === "—" ? "N/A" : formatTime(value);
}

export function getPatientName(appointment) {
  return appointment.patient?.name || appointment.patient?.fullName || [appointment.patient?.firstName, appointment.patient?.lastName].filter(Boolean).join(" ") || appointment.patientName || appointment.patientFullName || "N/A";
}

export function getPatientEllyId(appointment) {
  return appointment.patient?.ellyId || appointment.patient?.patientEllyId || appointment.patient?.ellyPatientId || appointment.patient?.patientId || (typeof appointment.patient === "string" ? appointment.patient : null) || appointment.patientEllyId || appointment.patientEllyID || appointment.ellyPatientId || appointment.patientId || "N/A";
}

export function getDoctorName(appointment) {
  return appointment.doctor?.name || appointment.doctor?.fullName || appointment.doctorName || "N/A";
}

export function getDepartmentName(appointment) {
  return appointment.department?.name || appointment.department?.departmentName || appointment.departmentName || "N/A";
}

export function getHospitalName(appointment) {
  return appointment.hospital?.name || appointment.hospital?.hospitalName || appointment.hospitalName || "N/A";
}

export function getEntityId(entity, fallbackId) {
  return entity?._id || entity?.id || fallbackId || "";
}

export function getInitials(name) {
  if (!name || name === "N/A") return "NA";
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function getPatientSubText(appointment) {
  const age = appointment.patient?.age;
  const gender = appointment.patient?.gender;
  if (age && gender) return `${age} years, ${gender}`;
  if (age) return `${age} years`;
  if (gender) return gender;
  return "Patient";
}

export function percentage(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

