import { useMemo } from "react";
import {
  addDays,
  getLocalDateKey,
  getTodayDateKey,
  normalizeStatus,
} from "../utils/appointmentHelpers";

export default function useAppointmentKpis(appointments) {
  return useMemo(() => {
    const todayKey = getTodayDateKey();
    const last7Days = Array.from({ length: 7 }, (_, index) =>
      getLocalDateKey(addDays(new Date(), index - 6)),
    );
    const appointmentsToday = appointments.filter(
      (appointment) =>
        getLocalDateKey(appointment.appointmentDateTime) === todayKey,
    );

    const countByStatus = (status, list = appointments) =>
      list.filter((appointment) => normalizeStatus(appointment.status) === status)
        .length;

    const createTrend = (filterFunction) =>
      last7Days.map((dateKey) =>
        appointments.filter(
          (appointment) =>
            getLocalDateKey(appointment.appointmentDateTime) === dateKey &&
            filterFunction(appointment),
        ).length,
      );

    const bookedToday = countByStatus("BOOKED", appointmentsToday) +
      countByStatus("IN_PROGRESS", appointmentsToday);
    const countActive = (list = appointments) =>
      list.filter((appointment) =>
        ["BOOKED", "IN_PROGRESS"].includes(normalizeStatus(appointment.status)),
      ).length;
    const completedToday = countByStatus("COMPLETED", appointmentsToday);
    const canceledToday = countByStatus("CANCELED", appointmentsToday);
    const noShowToday = countByStatus("NO_SHOW", appointmentsToday);

    return [
      {
        title: "Today's Appointments",
        value: appointmentsToday.length,
        description: "Scheduled for today",
        detail: `${bookedToday} booked | ${completedToday} completed | ${canceledToday} canceled | ${noShowToday} no-show`,
        icon: "Calendar",
        variant: "purple",
        trend: createTrend(() => true),
      },
      {
        title: "Active Bookings",
        value: countActive(),
        description: "Booked and ongoing appointments",
        detail: "Status: BOOKED or IN_PROGRESS",
        icon: "Active",
        variant: "green",
        trend: createTrend((appointment) =>
          ["BOOKED", "IN_PROGRESS"].includes(normalizeStatus(appointment.status)),
        ),
      },
      {
        title: "Completed Visits",
        value: countByStatus("COMPLETED"),
        description: "Finished appointments",
        detail: "Status: COMPLETED",
        icon: "Done",
        variant: "blue",
        trend: createTrend(
          (appointment) => normalizeStatus(appointment.status) === "COMPLETED",
        ),
      },
      {
        title: "Canceled Bookings",
        value: countByStatus("CANCELED"),
        description: "Canceled appointments",
        detail: "Status: CANCELED",
        icon: "Cancel",
        variant: "pink",
        trend: createTrend(
          (appointment) => normalizeStatus(appointment.status) === "CANCELED",
        ),
      },
      {
        title: "No-show Bookings",
        value: countByStatus("NO_SHOW"),
        description: "Appointments missed by patient",
        detail: "Status: NO_SHOW",
        icon: "No-show",
        variant: "orange",
        trend: createTrend(
          (appointment) => normalizeStatus(appointment.status) === "NO_SHOW",
        ),
      },
    ];
  }, [appointments]);
}
