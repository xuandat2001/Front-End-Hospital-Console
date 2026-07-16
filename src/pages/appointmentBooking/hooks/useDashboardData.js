import { useMemo } from "react";
import {
  formatShortTime,
  getDepartmentName,
  getDoctorName,
  getLocalDateKey,
  getPatientName,
  getTodayDateKey,
  normalizeStatus,
  percentage,
} from "../utils/appointmentHelpers";

export default function useDashboardData(appointments) {
  return useMemo(() => {
    const todayKey = getTodayDateKey();
    const now = new Date();
    const todayAppointments = appointments
      .filter(
        (appointment) =>
          getLocalDateKey(appointment.appointmentDateTime) === todayKey,
      )
      .sort(
        (a, b) =>
          new Date(a.appointmentDateTime).getTime() -
          new Date(b.appointmentDateTime).getTime(),
      );

    const cancelledToday = todayAppointments.filter(
      (appointment) => normalizeStatus(appointment.status) === "CANCELED",
    ).length;
    const upcomingBookedAppointments = appointments
      .filter((appointment) => {
        const appointmentDate = new Date(appointment.appointmentDateTime);
        return (
          normalizeStatus(appointment.status) === "BOOKED" &&
          !Number.isNaN(appointmentDate.getTime()) &&
          appointmentDate >= now
        );
      })
      .sort(
        (a, b) =>
          new Date(a.appointmentDateTime).getTime() -
          new Date(b.appointmentDateTime).getTime(),
      );

    const createCountRows = (list, getName, getSecondaryName) => {
      const map = new Map();
      list.forEach((appointment) => {
        const name = getName(appointment);
        if (!name || name === "N/A") return;
        if (!map.has(name))
          map.set(name, {
            name,
            count: 0,
            department: getSecondaryName ? getSecondaryName(appointment) : "",
          });
        map.get(name).count += 1;
      });
      return Array.from(map.values()).sort((a, b) => b.count - a.count);
    };

    const departmentRows = createCountRows(
      todayAppointments,
      getDepartmentName,
    );
    const doctorRows = createCountRows(
      todayAppointments,
      getDoctorName,
      getDepartmentName,
    );
    const typeRows = createCountRows(todayAppointments, (appointment) =>
      String(appointment.consultationType || "UNKNOWN").toUpperCase(),
    ).map((row) => ({
      ...row,
      percent: percentage(row.count, todayAppointments.length),
    }));

    const overdueAppointments = appointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.appointmentDateTime);
      return (
        normalizeStatus(appointment.status) === "BOOKED" &&
        !Number.isNaN(appointmentDate.getTime()) &&
        appointmentDate < now
      );
    });

    const missingNotesToday = todayAppointments.filter(
      (appointment) => !String(appointment.notes || "").trim(),
    ).length;
    const busiestDepartment = departmentRows[0]?.name || "No department";
    const busiestDoctor = doctorRows[0]?.name || "No doctor";
    const attentionItems = [];

    if (cancelledToday > 0)
      attentionItems.push({
        text: `${cancelledToday} cancelled appointment${cancelledToday > 1 ? "s" : ""} today`,
        variant: "red",
      });
    if (overdueAppointments.length > 0)
      attentionItems.push({
        text: `${overdueAppointments.length} booked appointment${overdueAppointments.length > 1 ? "s are" : " is"} past time but not completed`,
        variant: "orange",
      });
    if (missingNotesToday > 0)
      attentionItems.push({
        text: `${missingNotesToday} appointment${missingNotesToday > 1 ? "s have" : " has"} missing notes`,
        variant: "orange",
      });
    if (doctorRows[0]?.count >= 4)
      attentionItems.push({
        text: `${doctorRows[0].name} has many bookings today`,
        variant: "purple",
      });

    const recentActivityAll = appointments
      .map((appointment) => {
        const status = normalizeStatus(appointment.status);
        const activityDate = new Date(
          appointment.updatedAt ||
            appointment.cancelledAt ||
            appointment.createdAt ||
            appointment.appointmentDateTime,
        );

        if (Number.isNaN(activityDate.getTime())) return null;

        const patientName = getPatientName(appointment);

        if (status === "CANCELED") {
          return {
            time: formatShortTime(activityDate),
            icon: "✕",
            variant: "red",
            text: `Appointment cancelled for ${patientName}`,
          };
        }

        if (status === "COMPLETED") {
          return {
            time: formatShortTime(activityDate),
            icon: "✓",
            variant: "green",
            text: `Appointment completed for ${patientName}`,
          };
        }

        return {
          time: formatShortTime(activityDate),
          icon: "＋",
          variant: "blue",
          text: `Booking active for ${patientName}`,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b.time || "").localeCompare(a.time || ""));

    const recentActivity = recentActivityAll.slice(0, 4);

    const aiInsights = [
      `${busiestDepartment} has the highest appointment load today.`,
      `${cancelledToday} appointment${cancelledToday === 1 ? " is" : "s are"} cancelled today.`,
      `${busiestDoctor} has the most active workload today.`,
      typeRows[0]
        ? `Most appointments today are ${typeRows[0].name}.`
        : "No appointment type concentration detected today.",
      overdueAppointments.length > 0
        ? `${overdueAppointments.length} booked appointment${overdueAppointments.length > 1 ? "s are" : " is"} past scheduled time.`
        : "No overdue booked appointments detected.",
    ];

    return {
      todayAppointments,
      cancelledToday,
      nextAppointment: upcomingBookedAppointments[0] || null,
      departmentRows,
      doctorRows,
      typeRows,
      recentActivity,
      recentActivityAll,
      needsAttention: attentionItems,
      aiInsights,
    };
  }, [appointments]);
}

