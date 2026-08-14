import MiniPieChart from "../../../../components/graphs/MiniPieChart";
import { STATUS_META } from "../doctorAppointmentUtils";

const keys = ["BOOKED", "COMPLETED", "NO_SHOW", "CANCELED"];

export default function VisitStatusChart({ counts, loading }) {
  const total = keys.reduce((sum, key) => sum + (counts[key] || 0), 0);
  const slices = total
    ? keys.map((key) => ({ label: STATUS_META[key].label, value: counts[key] || 0, color: STATUS_META[key].color }))
    : [{ label: "No visits", value: 1, color: "#334155" }];

  return (
    <section className="appointment-card min-w-0 rounded-2xl border p-4">
      <h2 className="text-sm font-bold text-white">Visit Status Today</h2>
      {loading ? (
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-slate-700/35" />
      ) : (
        <div className="mt-3 grid items-center gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
          <MiniPieChart slices={slices} centerLabel={`${total}\nTotal Visits`} showLegend={false} widgetTitle="Doctor Visit Status Today" />
          <div className="space-y-2.5">
            {keys.map((key) => {
              const value = counts[key] || 0;
              const percent = total ? Math.round((value / total) * 100) : 0;
              return (
                <div key={key} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_META[key].color }} />
                    {STATUS_META[key].label}
                  </span>
                  <span className="font-semibold text-white">{value} ({percent}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
