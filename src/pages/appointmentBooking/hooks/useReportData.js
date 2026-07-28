import { useMemo } from "react";
import {
  getDepartmentName,
  getDoctorName,
  getLocalDateKey,
  getPatientEllyId,
  getPatientName,
  normalizeStatus,
  percentage,
} from "../utils/appointmentHelpers";
import { formatDateTime } from "../../../utils/dateFormat";

function getCancellationReason(appointment) {
  return (
    appointment.cancellationReason ||
    appointment.cancelReason ||
    appointment.reason ||
    "Not provided"
  );
}

export default function useReportData(appointments, filters) {
  return useMemo(() => {
    const filtered = appointments.filter((appointment) => {
      const dateKey = getLocalDateKey(appointment.appointmentDateTime);
      const status = normalizeStatus(appointment.status);
      const type = String(
        appointment.consultationType || "IN_PERSON",
      ).toUpperCase();
      const department = getDepartmentName(appointment);
      const doctor = getDoctorName(appointment);
      const inRange =
        (!filters.startDate || dateKey >= filters.startDate) &&
        (!filters.endDate || dateKey <= filters.endDate);

      return (
        inRange &&
        (filters.department === "ALL" || department === filters.department) &&
        (filters.doctor === "ALL" || doctor === filters.doctor) &&
        (filters.status === "ALL" || status === filters.status) &&
        (filters.type === "ALL" || type === filters.type) &&
        (filters.reportType !== "CANCELLATION" || status === "CANCELED")
      );
    });

    const countStatus = (status) =>
      filtered.filter(
        (appointment) => normalizeStatus(appointment.status) === status,
      ).length;
    const total = filtered.length;
    const booked = countStatus("BOOKED");
    const completed = countStatus("COMPLETED");
    const cancelled = countStatus("CANCELED");
    const noShow = countStatus("NO_SHOW");

    const departmentMap = new Map();
    const doctorMap = new Map();

    filtered.forEach((appointment) => {
      const status = normalizeStatus(appointment.status);
      const department = getDepartmentName(appointment);
      const doctor = getDoctorName(appointment);

      const departmentRow = departmentMap.get(department) || {
        department,
        total: 0,
        booked: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
      };
      departmentRow.total += 1;
      if (status === "BOOKED") departmentRow.booked += 1;
      if (status === "COMPLETED") departmentRow.completed += 1;
      if (status === "CANCELED") departmentRow.cancelled += 1;
      if (status === "NO_SHOW") departmentRow.noShow += 1;
      departmentMap.set(department, departmentRow);

      const doctorRow = doctorMap.get(doctor) || {
        doctor,
        department,
        total: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
        active: 0,
      };
      doctorRow.total += 1;
      if (status === "COMPLETED") doctorRow.completed += 1;
      if (status === "CANCELED") doctorRow.cancelled += 1;
      if (status === "NO_SHOW") doctorRow.noShow += 1;
      if (status === "BOOKED") doctorRow.active += 1;
      doctorMap.set(doctor, doctorRow);
    });

    const departmentRows = [...departmentMap.values()]
      .map((row) => ({
        ...row,
        cancellationRate: percentage(row.cancelled, row.total),
      }))
      .sort((a, b) => b.total - a.total);
    const doctorRows = [...doctorMap.values()].sort(
      (a, b) => b.total - a.total,
    );

    const cancelledRows = filtered
      .filter(
        (appointment) => normalizeStatus(appointment.status) === "CANCELED",
      )
      .sort(
        (a, b) =>
          new Date(b.appointmentDateTime) - new Date(a.appointmentDateTime),
      )
      .map((appointment) => ({
        id: appointment._id,
        patient: getPatientName(appointment),
        patientId: getPatientEllyId(appointment),
        doctor: getDoctorName(appointment),
        department: getDepartmentName(appointment),
        originalTime: formatDateTime(appointment.appointmentDateTime),
        reason: getCancellationReason(appointment),
        appointment,
      }));

    const activityRows = filtered
      .map((appointment) => {
        const status = normalizeStatus(appointment.status);
        const changed =
          appointment.updatedAt ||
          appointment.cancelledAt ||
          appointment.createdAt ||
          appointment.appointmentDateTime;
        const created = appointment.createdAt
          ? new Date(appointment.createdAt).getTime()
          : 0;
        const updated = appointment.updatedAt
          ? new Date(appointment.updatedAt).getTime()
          : 0;
        const action =
          status === "CANCELED"
            ? "Canceled"
            : status === "NO_SHOW"
              ? "No-show"
              : status === "COMPLETED"
              ? "Completed"
              : updated > created
                ? "Updated"
                : "Created";
        return {
          id: appointment._id,
          timeValue: new Date(changed).getTime() || 0,
          time: formatDateTime(changed),
          action,
          appointmentId: appointment._id
            ? String(appointment._id).slice(-8).toUpperCase()
            : getPatientEllyId(appointment),
          detail:
            action === "Canceled"
              ? getCancellationReason(appointment)
              : `${getDepartmentName(appointment)} appointment`,
          appointment,
        };
      })
      .sort((a, b) => b.timeValue - a.timeValue);

    const busiestDepartment = departmentRows[0];
    const busiestDoctor = doctorRows[0];
    const highestCancellation = [...departmentRows]
      .filter((row) => row.cancelled > 0)
      .sort((a, b) => b.cancellationRate - a.cancellationRate)[0];
    const typeCounts = filtered.reduce((counts, appointment) => {
      const type = String(
        appointment.consultationType || "IN_PERSON",
      ).toUpperCase();
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {});
    const topType = Object.entries(typeCounts).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];

    const insights =
      total === 0
        ? [
            {
              tone: "neutral",
              text: "No appointments match the selected report filters.",
            },
          ]
        : [
            busiestDepartment && {
              tone: "blue",
              text: `${busiestDepartment.department} has the highest volume with ${busiestDepartment.total} appointment${busiestDepartment.total === 1 ? "" : "s"}.`,
            },
            highestCancellation && {
              tone:
                highestCancellation.cancellationRate >= 20 ? "red" : "amber",
              text: `${highestCancellation.department} has the highest cancellation rate at ${highestCancellation.cancellationRate}%.`,
            },
            busiestDoctor && {
              tone: "green",
              text: `${busiestDoctor.doctor} has the largest workload with ${busiestDoctor.total} appointment${busiestDoctor.total === 1 ? "" : "s"}.`,
            },
            topType && {
              tone: "violet",
              text: `${topType.replaceAll("_", " ")} is the most common consultation type.`,
            },
          ].filter(Boolean);

    return {
      filtered,
      metrics: {
        total,
        booked,
        completed,
        cancelled,
        noShow,
        cancellationRate: percentage(cancelled, total),
        noShowRate: percentage(noShow, total),
      },
      departmentRows,
      doctorRows,
      cancelledRows,
      activityRows,
      insights,
    };
  }, [appointments, filters]);
}

