import {
  addDays,
  getDepartmentName,
  getDoctorName,
  getLocalDateKey,
  getPatientEllyId,
  getPatientName,
  percentage,
} from "../utils/appointmentHelpers";
import { formatDateTime } from "../../../utils/dateFormat";

function statusCounts(row = {}) {
  const completed = Number(row.completed || 0);
  const cancelled = Number(row.canceled ?? row.cancelled ?? 0);
  const noShow = Number(row.noShow || 0);
  const total = Number(row.total || 0);
  return { total, completed, cancelled, noShow, booked: Math.max(0, total - completed - cancelled - noShow) };
}

function trendRows(data, range) {
  const counts = new Map((data.dailyTrend || []).map((row) => [String(row._id), Number(row.count || 0)]));
  const rows = [];
  let cursor = new Date(`${range.start}T00:00:00`);
  const end = new Date(`${range.end}T00:00:00`);
  while (cursor <= end) {
    const key = getLocalDateKey(cursor);
    rows.push({
      key,
      label: cursor.toLocaleDateString("en-US", { day: "numeric" }),
      tooltipLabel: cursor.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      count: counts.get(key) || 0,
    });
    cursor = addDays(cursor, 1);
  }
  if (rows.length <= 15) return { mode: "daily", scrollable: rows.length > 7, rows };
  if (rows.length <= 31) {
    const weekly = [];
    for (let index = 0; index < rows.length; index += 7) {
      const chunk = rows.slice(index, index + 7);
      weekly.push({ key: `${chunk[0].key}-${chunk.at(-1).key}`, label: `W${weekly.length + 1}`, tooltipLabel: `${chunk[0].tooltipLabel} to ${chunk.at(-1).tooltipLabel}`, count: chunk.reduce((sum, row) => sum + row.count, 0) });
    }
    return { mode: "weekly", scrollable: false, rows: weekly };
  }
  return { mode: "monthly", scrollable: false, rows };
}

export function adaptPerformanceResponse(data = {}, range) {
  const summary = data.summary || {};
  const previousSummary = data.previousSummary || {};
  const trend = trendRows(data, range);
  const departmentRows = (data.departmentPerformance || []).map((row) => {
    const counts = statusCounts(row);
    return { department: row.name || "N/A", ...counts, completionRate: percentage(counts.completed, counts.total), cancellationRate: percentage(counts.cancelled, counts.total), noShowRate: percentage(counts.noShow, counts.total) };
  });
  const doctorRows = (data.doctorPerformance || []).map((row) => {
    const counts = statusCounts(row);
    return { doctor: row.name || "N/A", department: row.specialization || "N/A", ...counts, completionRate: percentage(counts.completed, counts.total), cancellationRate: percentage(counts.cancelled, counts.total), noShowRate: percentage(counts.noShow, counts.total) };
  });
  const typeRows = (data.appointmentTypeDistribution || []).map((row) => ({ type: row._id || "UNKNOWN", count: Number(row.count || 0) }));
  const comparisonRows = [
    ["Total Appointments", summary.total, previousSummary.total], ["Booked Appointments", summary.booked, previousSummary.booked], ["Completed Appointments", summary.completed, previousSummary.completed], ["Canceled Appointments", summary.canceled, previousSummary.canceled], ["No-show Appointments", summary.noShow, previousSummary.noShow],
  ].map(([label, currentValue, previousValue]) => {
    const current = Number(currentValue || 0);
    const previous = Number(previousValue || 0);
    const difference = current - previous;
    return { label, current, previous, difference, rate: previous ? Math.round((difference / previous) * 100) : current ? 100 : 0, direction: difference > 0 ? "increase" : difference < 0 ? "decrease" : "flat" };
  });
  return {
    total: Number(summary.total || 0), booked: Number(summary.booked || 0), completed: Number(summary.completed || 0), cancelled: Number(summary.canceled || 0), noShow: Number(summary.noShow || 0),
    cancellationRate: Number(summary.cancellationRate || 0), departmentRows, doctorRows, typeRows,
    busiestDepartment: departmentRows[0]?.department || "N/A", busiestDoctor: doctorRows[0]?.doctor || "N/A",
    trendDisplayRows: trend.rows, trendDisplayMode: trend.mode, trendScrollable: trend.scrollable,
    maxTrendCount: Math.max(...trend.rows.map((row) => row.count), 1), maxTypeCount: Math.max(...typeRows.map((row) => row.count), 1),
    comparison: { previousRange: data.previousRange || {}, rows: comparisonRows },
  };
}

function planningAppointmentRow(appointment) {
  const date = new Date(appointment.appointmentDateTime);
  const today = getLocalDateKey(new Date());
  const tomorrow = getLocalDateKey(addDays(new Date(), 1));
  const key = getLocalDateKey(date);
  return {
    appointment,
    dateLabel: key === today ? "Today" : key === tomorrow ? "Tomorrow" : date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
    time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), patient: getPatientName(appointment), patientId: getPatientEllyId(appointment), doctor: getDoctorName(appointment), department: getDepartmentName(appointment), type: String(appointment.consultationType || "IN_PERSON").toUpperCase(),
  };
}

export function adaptPlanningResponse(data = {}, horizon = 7) {
  const departmentDemand = (data.departmentDemand || []).map((row) => ({ name: row.name || "N/A", count: Number(row.count || 0) }));
  const doctorCapacity = (data.doctorWorkload || []).map((row) => ({ doctor: row.name || "N/A", department: row.specialization || "N/A", nextDays: Number(row.count || 0), tomorrow: 0, risk: Number(row.count || 0) >= Math.max(8, horizon * 2) ? "High load" : Number(row.count || 0) >= Math.max(5, horizon) ? "Near capacity" : "Normal" }));
  const upcoming = data.upcoming || [];
  const tomorrowKey = getLocalDateKey(addDays(new Date(), 1));
  const demandByHour = new Map((data.timeSlotDemand || []).map((row) => [Number(row._id), row]));
  const activeDoctors = Math.max(1, doctorCapacity.length);
  const workingDays = Math.max(1, horizon - Math.floor((horizon * 2) / 7));
  const slots = [8, 10, 13, 15].map((start, index) => {
    const end = [10, 12, 15, 17][index];
    const demand = Array.from({ length: end - start }, (_, offset) => demandByHour.get(start + offset)).filter(Boolean);
    const bookings = demand.reduce((sum, row) => sum + Number(row.bookings || 0), 0);
    const bookedMinutes = demand.reduce((sum, row) => sum + Number(row.bookedMinutes || 0), 0);
    const capacityMinutes = (end - start) * 60 * workingDays * activeDoctors;
    const availableMinutes = Math.max(0, capacityMinutes - bookedMinutes);
    const minuteLabel = (minutes) => minutes >= 60 ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}` : `${minutes}m`;
    return { label: `${String(start).padStart(2, "0")}:00 – ${String(end).padStart(2, "0")}:00`, bookings, bookedLabel: minuteLabel(bookedMinutes), capacityLabel: minuteLabel(capacityMinutes), availableLabel: minuteLabel(availableMinutes), averageDurationLabel: bookings ? minuteLabel(Math.round(bookedMinutes / bookings)) : "N/A", utilization: Math.min(100, Math.round((bookedMinutes / Math.max(capacityMinutes, 1)) * 100)) };
  });
  return {
    metrics: { upcoming: Number(data.totalUpcoming || 0), tomorrow: Number((data.dailyForecast || []).find((row) => String(row._id) === tomorrowKey)?.count || 0), demand: Number(data.totalUpcoming || 0), recoverable: Number(data.recoverableCount || 0) },
    departmentOptions: departmentDemand.map((row) => row.name).filter((name) => name !== "N/A"), departmentDemand, maxDemand: Math.max(...departmentDemand.map((row) => row.count), 1), doctorCapacity, timeSlots: slots,
    upcomingSchedule: upcoming.slice(0, 5).map(planningAppointmentRow),
    recoveryRows: (data.recoveryAppointments || []).map((appointment) => ({ ...detailRow(appointment), originalTime: formatDateTime(appointment.appointmentDateTime) })),
    recommendations: Number(data.totalUpcoming || 0) === 0 ? ["No upcoming bookings in this planning window. Capacity is currently open."] : [departmentDemand[0] && `${departmentDemand[0].name} has the highest demand over the next ${horizon} days.`, doctorCapacity[0] && `${doctorCapacity[0].doctor} has the highest upcoming workload.`].filter(Boolean),
  };
}

function detailRow(appointment) {
  return { id: appointment._id, patient: getPatientName(appointment), patientId: getPatientEllyId(appointment), doctor: getDoctorName(appointment), department: getDepartmentName(appointment), originalTime: formatDateTime(appointment.appointmentDateTime), reason: appointment.cancellationReason || appointment.reason || "Not provided", appointment };
}

export function adaptReportsResponse(data = {}) {
  const summary = data.summary || {};
  const departmentRows = (data.departmentPerformance || []).map((row) => ({ department: row.name || "N/A", ...statusCounts(row) }));
  const doctorRows = (data.doctorPerformance || []).map((row) => { const counts = statusCounts(row); return { doctor: row.name || "N/A", department: row.specialization || "N/A", total: counts.total, completed: counts.completed, cancelled: counts.cancelled, noShow: counts.noShow, active: counts.booked }; });
  const activityRows = (data.recentActivity || []).map((appointment) => ({ ...detailRow(appointment), time: formatDateTime(appointment.updatedAt || appointment.createdAt), action: String(appointment.status || "Updated").replaceAll("_", " "), appointmentId: String(appointment._id || "").slice(-8).toUpperCase(), detail: `${getDepartmentName(appointment)} appointment` }));
  return {
    metrics: { total: Number(summary.total || 0), booked: Number(summary.booked || 0), completed: Number(summary.completed || 0), cancelled: Number(summary.canceled || 0), noShow: Number(summary.noShow || 0), cancellationRate: Number(summary.cancellationRate || 0), noShowRate: Number(summary.noShowRate || 0) },
    departmentRows, doctorRows, cancelledRows: (data.cancelledAppointments || []).map(detailRow), activityRows,
    insights: Number(summary.total || 0) === 0 ? [{ tone: "neutral", text: "No appointments match the selected report filters." }] : [departmentRows[0] && { tone: "blue", text: `${departmentRows[0].department} has the highest volume with ${departmentRows[0].total} appointments.` }, doctorRows[0] && { tone: "green", text: `${doctorRows[0].doctor} has the largest workload with ${doctorRows[0].total} appointments.` }].filter(Boolean),
  };
}
