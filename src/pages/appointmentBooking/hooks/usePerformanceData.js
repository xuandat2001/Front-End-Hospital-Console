import { useMemo } from "react";
import {
  addDays,
  getDepartmentName,
  getDoctorName,
  getLocalDateKey,
  normalizeStatus,
  percentage,
} from "../utils/appointmentHelpers";

function getDateFromKey(key) {
  return new Date(`${key}T00:00:00`);
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}

function buildTrendDisplayRows(dailyTrend) {
  const totalDays = dailyTrend.length;

  if (totalDays <= 15) {
    return {
      mode: "daily",
      scrollable: totalDays > 7,
      rows: dailyTrend.map((day) => ({
        ...day,
        label: day.shortLabel,
        tooltipLabel: day.fullLabel,
      })),
    };
  }

  if (totalDays <= 31) {
    const weeklyRows = [];

    for (let index = 0; index < dailyTrend.length; index += 7) {
      const chunk = dailyTrend.slice(index, index + 7);
      const firstDay = chunk[0];
      const lastDay = chunk[chunk.length - 1];

      weeklyRows.push({
        key: `${firstDay.key}-${lastDay.key}`,
        label: `W${weeklyRows.length + 1}`,
        tooltipLabel: `${firstDay.fullLabel} to ${lastDay.fullLabel}`,
        count: chunk.reduce((sum, day) => sum + day.count, 0),
      });
    }

    return {
      mode: "weekly",
      scrollable: false,
      rows: weeklyRows,
    };
  }

  const monthMap = new Map();

  dailyTrend.forEach((day) => {
    const date = getDateFromKey(day.key);
    const monthKey = getMonthKey(date);

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        key: monthKey,
        label: date.toLocaleDateString("en-US", {
          month: "short",
        }),
        tooltipLabel: date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
        count: 0,
      });
    }

    monthMap.get(monthKey).count += day.count;
  });

  return {
    mode: "monthly",
    scrollable: false,
    rows: Array.from(monthMap.values()),
  };
}

export default function usePerformanceData(appointments, range) {
  return useMemo(() => {
    const selectedAppointments = appointments.filter((appointment) => {
      const dateKey = getLocalDateKey(appointment.appointmentDateTime);

      return (
        dateKey &&
        (!range?.start || dateKey >= range.start) &&
        (!range?.end || dateKey <= range.end)
      );
    });
    const total = selectedAppointments.length;
    const countByStatus = (status) =>
      selectedAppointments.filter(
        (appointment) => normalizeStatus(appointment.status) === status,
      ).length;
    const booked = countByStatus("BOOKED");
    const completed = countByStatus("COMPLETED");
    const cancelled = countByStatus("CANCELED");
    const noShow = countByStatus("NO_SHOW");
    const startDate = new Date(
      (range?.start || getLocalDateKey(addDays(new Date(), -6))) + "T00:00:00",
    );
    const endDate = new Date(
      (range?.end || getLocalDateKey(new Date())) + "T00:00:00",
    );
    const rangeDays = Math.max(
      1,
      Math.round((endDate - startDate) / (24 * 60 * 60 * 1000)) + 1,
    );
    const previousEndDate = addDays(startDate, -1);
    const previousStartDate = addDays(previousEndDate, -(rangeDays - 1));
    const previousStartKey = getLocalDateKey(previousStartDate);
    const previousEndKey = getLocalDateKey(previousEndDate);
    const previousAppointments = appointments.filter((appointment) => {
      const dateKey = getLocalDateKey(appointment.appointmentDateTime);

      return dateKey && dateKey >= previousStartKey && dateKey <= previousEndKey;
    });
    const countPreviousByStatus = (status) =>
      previousAppointments.filter(
        (appointment) => normalizeStatus(appointment.status) === status,
      ).length;
    const previousTotal = previousAppointments.length;
    const previousBooked = countPreviousByStatus("BOOKED");
    const previousCompleted = countPreviousByStatus("COMPLETED");
    const previousCanceled = countPreviousByStatus("CANCELED");
    const previousNoShow = countPreviousByStatus("NO_SHOW");
    const buildComparisonRow = (label, current, previous) => {
      const difference = current - previous;
      const rate =
        previous === 0
          ? current === 0
            ? 0
            : 100
          : Math.round((difference / previous) * 100);
      const direction =
        difference > 0 ? "increase" : difference < 0 ? "decrease" : "flat";

      return {
        label,
        current,
        previous,
        difference,
        rate,
        direction,
      };
    };

    const dateRangeDays = [];
    let cursor = new Date(startDate);

    while (cursor <= endDate) {
      dateRangeDays.push({
        key: getLocalDateKey(cursor),
        label: cursor.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        shortLabel: cursor.toLocaleDateString("en-US", {
          day: "numeric",
        }),
        fullLabel: cursor.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      });

      cursor = addDays(cursor, 1);
    }
    const dailyTrend = dateRangeDays.map((day) => ({
      ...day,
      count: selectedAppointments.filter(
        (appointment) =>
          getLocalDateKey(appointment.appointmentDateTime) === day.key,
      ).length,
    }));
    const trendValues = dailyTrend.map((day) => day.count);
    const trendDisplay = buildTrendDisplayRows(dailyTrend);

    const departmentMap = new Map();
    selectedAppointments.forEach((appointment) => {
      const departmentName = getDepartmentName(appointment);
      const status = normalizeStatus(appointment.status);
      if (!departmentMap.has(departmentName))
        departmentMap.set(departmentName, {
          department: departmentName,
          total: 0,
          booked: 0,
          completed: 0,
          cancelled: 0,
          noShow: 0,
        });
      const row = departmentMap.get(departmentName);
      row.total += 1;
      if (status === "BOOKED") row.booked += 1;
      if (status === "COMPLETED") row.completed += 1;
      if (status === "CANCELED") row.cancelled += 1;
      if (status === "NO_SHOW") row.noShow += 1;
    });
    const departmentRows = Array.from(departmentMap.values())
      .map((row) => ({
        ...row,
        completionRate: percentage(row.completed, row.total),
        cancellationRate: percentage(row.cancelled, row.total),
        noShowRate: percentage(row.noShow, row.total),
      }))
      .sort((a, b) => b.total - a.total);

    const doctorMap = new Map();
    selectedAppointments.forEach((appointment) => {
      const doctorName = getDoctorName(appointment);
      const departmentName = getDepartmentName(appointment);
      const status = normalizeStatus(appointment.status);
      if (!doctorMap.has(doctorName))
        doctorMap.set(doctorName, {
          doctor: doctorName,
          department: departmentName,
          total: 0,
          booked: 0,
          completed: 0,
          cancelled: 0,
          noShow: 0,
        });
      const row = doctorMap.get(doctorName);
      row.total += 1;
      if (status === "BOOKED") row.booked += 1;
      if (status === "COMPLETED") row.completed += 1;
      if (status === "CANCELED") row.cancelled += 1;
      if (status === "NO_SHOW") row.noShow += 1;
    });
    const doctorRows = Array.from(doctorMap.values())
      .map((row) => ({
        ...row,
        completionRate: percentage(row.completed, row.total),
        cancellationRate: percentage(row.cancelled, row.total),
        noShowRate: percentage(row.noShow, row.total),
      }))
      .sort((a, b) => b.total - a.total);
    const typeMap = new Map();
    selectedAppointments.forEach((appointment) => {
      const type = String(
        appointment.consultationType || "UNKNOWN",
      ).toUpperCase();
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });
    const typeRows = Array.from(typeMap, ([type, count]) => ({
      type,
      count,
    })).sort((a, b) => b.count - a.count);

    return {
      total,
      booked,
      completed,
      cancelled,
      noShow,
      completionRate: percentage(completed, total),
      cancellationRate: percentage(cancelled, total),
      noShowRate: percentage(noShow, total),
      activeBookingRate: percentage(booked, total),
      dailyTrend,
      trendValues,

      trendDisplayRows: trendDisplay.rows,
      trendDisplayMode: trendDisplay.mode,
      trendScrollable: trendDisplay.scrollable,
      maxTrendCount: Math.max(...trendDisplay.rows.map((row) => row.count), 1),

      departmentRows,
      doctorRows,
      typeRows,
      busiestDepartment: departmentRows[0]?.department || "N/A",
      busiestDoctor: doctorRows[0]?.doctor || "N/A",
      maxTypeCount: Math.max(...typeRows.map((row) => row.count), 1),
      comparison: {
        previousRange: {
          start: previousStartKey,
          end: previousEndKey,
        },
        rows: [
          buildComparisonRow("Total Appointments", total, previousTotal),
          buildComparisonRow("Booked Appointments", booked, previousBooked),
          buildComparisonRow(
            "Completed Appointments",
            completed,
            previousCompleted,
          ),
          buildComparisonRow(
            "Canceled Appointments",
            cancelled,
            previousCanceled,
          ),
          buildComparisonRow("No-show Appointments", noShow, previousNoShow),
        ],
      },
    };
  }, [appointments, range]);
}

