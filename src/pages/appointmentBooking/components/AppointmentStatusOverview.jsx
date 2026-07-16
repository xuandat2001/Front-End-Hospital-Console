import { useMemo } from "react";
import MiniPieChart from "../../../components/graphs/MiniPieChart";
import {
  getLocalDateKey,
  getTodayDateKey,
  normalizeStatus,
} from "../utils/appointmentHelpers";

export default function AppointmentStatusOverview({
  appointments,
  typeSummarySlot,
  aiSummarySlot,
}) {
  const todayKey = getTodayDateKey();

  const distribution = useMemo(() => {
    const selectedAppointments = appointments.filter((appointment) => {
      const dateKey = getLocalDateKey(appointment.appointmentDateTime);
      return dateKey === todayKey;
    });
    const count = (status) =>
      selectedAppointments.filter(
        (appointment) => normalizeStatus(appointment.status) === status,
      ).length;
    return {
      active: count("BOOKED"),
      completed: count("COMPLETED"),
      cancelled: count("CANCELED"),
      noShow: count("NO_SHOW"),
    };
  }, [appointments, todayKey]);

  const { active, completed, cancelled, noShow } = distribution;
  const total = active + completed + cancelled + noShow;
  const percent = (value) =>
    total ? Math.round((value / total) * 1000) / 10 : 0;
  const rows = [
    {
      label: "Active (Booked)",
      value: active,
      color: "#22C55E",
      dotClass: "bg-emerald-500",
      textClass: "text-emerald-600",
    },
    {
      label: "Completed",
      value: completed,
      color: "#3B82F6",
      dotClass: "bg-blue-500",
      textClass: "text-blue-600",
    },
    {
      label: "No-show",
      value: noShow,
      color: "#F97316",
      dotClass: "bg-orange-500",
      textClass: "text-orange-600",
    },
    {
      label: "Canceled",
      value: cancelled,
      color: "#EF4444",
      dotClass: "bg-rose-500",
      textClass: "text-rose-600",
    },
  ];
  const chartSlices = total
    ? rows.map(({ label, value, color }) => ({ label, value, color }))
    : [{ label: "No appointments", value: 1, color: "#334155" }];

  return (
    <div className="mb-6 grid min-w-0 grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(260px,0.95fr)]">
      <section className="appointment-card relative flex h-full min-h-[260px] min-w-0 flex-col p-5 xl:p-4 2xl:p-5">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="min-w-0 truncate text-base font-bold text-slate-950 dark:text-white 2xl:text-lg">
              Appointment Status Distribution Today
            </h2>

            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300"
              title="Status totals for today's appointments"
            >
              i
            </span>
          </div>
        </div>

        <div className="mt-5 grid min-w-0 flex-1 grid-cols-1 items-center gap-5 lg:grid-cols-[150px_minmax(0,1fr)]">
          <div className="flex justify-center">
            <MiniPieChart
              slices={chartSlices}
              centerLabel={`${total}\nTotal`}
              showLegend={false}
            />
          </div>
          <div className="min-w-0 space-y-4 2xl:space-y-5">
            {rows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={"h-3.5 w-3.5 shrink-0 rounded-full " + row.dotClass}
                  />
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-800 dark:text-slate-100 2xl:text-base">
                    {row.label}
                  </span>
                </div>
                <span className={"shrink-0 font-bold " + row.textClass}>
                  {row.value} ({percent(row.value)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid h-full min-w-0 gap-4">
        <div className="min-w-0">
          {aiSummarySlot}
        </div>
        {typeSummarySlot}
      </div>
    </div>
  );
}

