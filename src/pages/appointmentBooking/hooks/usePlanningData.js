import { useMemo } from "react";
import {
  addDays,
  getDepartmentName,
  getDoctorName,
  getLocalDateKey,
  getPatientEllyId,
  getPatientName,
  normalizeStatus,
} from "../utils/appointmentHelpers";

const SLOT_DEFINITIONS = [
  { label: "08:00 – 10:00", start: 8, end: 10 },
  { label: "10:00 – 12:00", start: 10, end: 12 },
  { label: "13:00 – 15:00", start: 13, end: 15 },
  { label: "15:00 – 17:00", start: 15, end: 17 },
];

function validDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRelativeDate(date, todayKey, tomorrowKey) {
  const key = getLocalDateKey(date);
  if (key === todayKey) return "Today";
  if (key === tomorrowKey) return "Tomorrow";
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getDurationMinutes(appointment, startDate) {
  if (appointment.durationMinutes) {
    return Number(appointment.durationMinutes);
  }

  if (appointment.appointmentEndDateTime) {
    const endDate = new Date(appointment.appointmentEndDateTime);

    if (!Number.isNaN(endDate.getTime())) {
      return Math.max(
        0,
        Math.round((endDate.getTime() - startDate.getTime()) / 60000),
      );
    }
  }

  return 30;
}

function getAppointmentEndDate(appointment, startDate) {
  if (appointment.appointmentEndDateTime) {
    const endDate = new Date(appointment.appointmentEndDateTime);

    if (!Number.isNaN(endDate.getTime())) {
      return endDate;
    }
  }

  return new Date(
    startDate.getTime() + getDurationMinutes(appointment, startDate) * 60000,
  );
}

function getTimeBlockBounds(date, slot) {
  const blockStart = new Date(date);
  blockStart.setHours(slot.start, 0, 0, 0);

  const blockEnd = new Date(date);
  blockEnd.setHours(slot.end, 0, 0, 0);

  return {
    blockStart,
    blockEnd,
  };
}

function getOverlapMinutes(startDate, endDate, blockStart, blockEnd) {
  const overlapStart = Math.max(startDate.getTime(), blockStart.getTime());
  const overlapEnd = Math.min(endDate.getTime(), blockEnd.getTime());

  if (overlapEnd <= overlapStart) {
    return 0;
  }

  return Math.round((overlapEnd - overlapStart) / 60000);
}

function formatMinutes(minutes) {
  const safeMinutes = Number(minutes || 0);

  if (safeMinutes < 60) {
    return `${safeMinutes}m`;
  }

  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

export default function usePlanningData(
  appointments,
  horizon = 7,
  department = "ALL",
) {
  return useMemo(() => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const endDate = addDays(todayStart, horizon);
    const tomorrow = addDays(todayStart, 1);
    const todayKey = getLocalDateKey(todayStart);
    const tomorrowKey = getLocalDateKey(tomorrow);

    const withDates = appointments
      .map((appointment) => ({
        appointment,
        date: validDate(appointment.appointmentDateTime),
      }))
      .filter((item) => item.date);

    const departmentOptions = [
      ...new Set(
        appointments
          .map(getDepartmentName)
          .filter((name) => name && name !== "N/A"),
      ),
    ].sort();

    const matchesDepartment = (appointment) =>
      department === "ALL" || getDepartmentName(appointment) === department;

    const future = withDates.filter(
      ({ appointment, date }) =>
        matchesDepartment(appointment) &&
        date >= now &&
        date < endDate &&
        normalizeStatus(appointment.status) === "BOOKED",
    );

    const tomorrowAppointments = future.filter(
      ({ date }) => getLocalDateKey(date) === tomorrowKey,
    );

    const cancelled = withDates
      .filter(
        ({ appointment }) =>
          matchesDepartment(appointment) &&
          normalizeStatus(appointment.status) === "CANCELED",
      )
      .sort((a, b) => b.date - a.date);

    const departmentMap = new Map();
    const doctorMap = new Map();

    future.forEach(({ appointment, date }) => {
      const departmentName = getDepartmentName(appointment);
      departmentMap.set(
        departmentName,
        (departmentMap.get(departmentName) || 0) + 1,
      );

      const doctorName = getDoctorName(appointment);
      const current = doctorMap.get(doctorName) || {
        doctor: doctorName,
        department: departmentName,
        nextDays: 0,
        tomorrow: 0,
      };
      current.nextDays += 1;
      if (getLocalDateKey(date) === tomorrowKey) current.tomorrow += 1;
      doctorMap.set(doctorName, current);
    });

    const departmentDemand = [...departmentMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const maxDemand = Math.max(...departmentDemand.map((row) => row.count), 1);

    const doctorCapacity = [...doctorMap.values()]
      .sort((a, b) => b.nextDays - a.nextDays)
      .map((row) => ({
        ...row,
        risk:
          row.nextDays >= Math.max(8, horizon * 2) || row.tomorrow >= 4
            ? "High load"
            : row.nextDays >= Math.max(5, horizon) || row.tomorrow >= 3
              ? "Near capacity"
              : "Normal",
      }));

    const activeDoctorCount = Math.max(
      1,
      new Set(future.map(({ appointment }) => getDoctorName(appointment))).size,
    );

    const workingDays = Math.max(1, horizon - Math.floor((horizon * 2) / 7));

    const timeSlots = SLOT_DEFINITIONS.map((slot) => {
      let bookings = 0;
      let bookedMinutes = 0;

      future.forEach(({ appointment, date }) => {
        const appointmentStart = date;
        const appointmentEnd = getAppointmentEndDate(
          appointment,
          appointmentStart,
        );
        const { blockStart, blockEnd } = getTimeBlockBounds(date, slot);
        const overlapMinutes = getOverlapMinutes(
          appointmentStart,
          appointmentEnd,
          blockStart,
          blockEnd,
        );

        if (overlapMinutes > 0) {
          bookings += 1;
          bookedMinutes += overlapMinutes;
        }
      });

      const blockMinutes = (slot.end - slot.start) * 60;
      const capacityMinutes = blockMinutes * workingDays * activeDoctorCount;
      const availableMinutes = Math.max(0, capacityMinutes - bookedMinutes);
      const averageDuration = bookings
        ? Math.round(bookedMinutes / bookings)
        : 0;

      return {
        ...slot,
        bookings,
        bookedMinutes,
        capacityMinutes,
        availableMinutes,
        averageDuration,
        utilization: Math.min(
          100,
          Math.round((bookedMinutes / Math.max(capacityMinutes, 1)) * 100),
        ),
        bookedLabel: formatMinutes(bookedMinutes),
        capacityLabel: formatMinutes(capacityMinutes),
        availableLabel: formatMinutes(availableMinutes),
        averageDurationLabel: averageDuration
          ? formatMinutes(averageDuration)
          : "N/A",
      };
    });

    const upcomingSchedule = future
      .sort((a, b) => a.date - b.date)
      .slice(0, 5)
      .map(({ appointment, date }) => ({
        appointment,
        dateLabel: formatRelativeDate(date, todayKey, tomorrowKey),
        time: date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        patient: getPatientName(appointment),
        patientId: getPatientEllyId(appointment),
        doctor: getDoctorName(appointment),
        department: getDepartmentName(appointment),
        type: String(appointment.consultationType || "IN_PERSON").toUpperCase(),
      }));

    const recoveryRows = cancelled.slice(0, 5).map(({ appointment, date }) => ({
      appointment,
      patient: getPatientName(appointment),
      patientId: getPatientEllyId(appointment),
      department: getDepartmentName(appointment),
      originalTime: `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    }));

    const busiestDepartment = departmentDemand[0]?.name;
    const busiestDoctor = doctorCapacity[0]?.doctor;
    const busiestSlot = [...timeSlots].sort(
      (a, b) => b.utilization - a.utilization,
    )[0];
    const dominantType = future.reduce((counts, { appointment }) => {
      const type = String(
        appointment.consultationType || "IN_PERSON",
      ).toUpperCase();
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {});
    const topType = Object.entries(dominantType).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];

    const recommendations =
      future.length === 0
        ? [
            "No upcoming bookings in this planning window. Capacity is currently open.",
          ]
        : [
            busiestDepartment &&
              `${busiestDepartment} has the highest demand over the next ${horizon} days.`,
            busiestDoctor &&
              `${busiestDoctor} has the highest upcoming workload.`,
            cancelled.length > 0 &&
              `${cancelled.length} cancelled appointment${cancelled.length === 1 ? "" : "s"} can be reviewed for recovery.`,
            topType &&
              `Most upcoming appointments are ${topType.replaceAll("_", " ")}; prepare matching capacity.`,
            busiestSlot &&
              `${busiestSlot.label} is the busiest time block at ${busiestSlot.utilization}% utilization.`,
          ].filter(Boolean);

    return {
      metrics: {
        upcoming: future.length,
        tomorrow: tomorrowAppointments.length,
        demand: future.length,
        recoverable: cancelled.length,
      },
      departmentOptions,
      departmentDemand,
      maxDemand,
      doctorCapacity,
      timeSlots,
      upcomingSchedule,
      recoveryRows,
      recommendations,
    };
  }, [appointments, department, horizon]);
}

