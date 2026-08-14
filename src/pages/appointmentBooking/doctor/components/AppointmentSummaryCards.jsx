import { Calendar, CheckCircle, Clock, UserX } from "lucide-react";

const cards = [
  { key: "today", title: "Today", description: "Scheduled today", icon: Calendar, tone: "violet" },
  { key: "upcoming", title: "Upcoming", description: "Future booked visits", icon: Clock, tone: "cyan" },
  { key: "completed", title: "Completed", description: "Completed today", icon: CheckCircle, tone: "emerald" },
  { key: "noShow", title: "No-show", description: "Today", icon: UserX, tone: "orange" },
];

const tones = {
  violet: "bg-violet-500/15 text-violet-300 ring-violet-400/20",
  cyan: "bg-cyan-500/15 text-cyan-300 ring-cyan-400/20",
  emerald: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  orange: "bg-orange-500/15 text-orange-300 ring-orange-400/20",
};

export default function AppointmentSummaryCards({ values, loading }) {
  return (
    <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
      {cards.map(({ key, title, description, icon: Icon, tone }) => (
        <section key={key} className="appointment-card min-w-0 rounded-2xl border p-4">
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-9 w-9 rounded-xl bg-slate-700/50" />
              <div className="h-6 w-16 rounded bg-slate-700/50" />
              <div className="h-3 w-24 rounded bg-slate-700/40" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${tones[tone]}`}>
                <Icon size={21} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-400">{title}</p>
                <p className="mt-0.5 text-2xl font-bold text-white">{values[key] ?? 0}</p>
                <p className="truncate text-[11px] text-slate-400">{description}</p>
              </div>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

