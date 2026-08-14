import { CalendarClock, CalendarDays, CheckCircle2, TriangleAlert } from "lucide-react";

const cards = [
  ["Due Today", "dueToday", "Follow-ups due today", CalendarDays, "text-violet-300"],
  ["Upcoming", "upcoming", "Next 7 days", CalendarClock, "text-cyan-300"],
  ["Overdue", "overdue", "Needs attention", TriangleAlert, "text-orange-300"],
  ["Completed", "completedThisMonth", "This month", CheckCircle2, "text-emerald-300"],
];

export default function FollowUpSummaryCards({ summary, loading }) {
  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Follow-up summary">
      {cards.map(([label, key, description, Icon, color]) => (
        <article key={key} className="dashboard-card flex min-h-24 items-center gap-3 rounded-2xl border p-4">
          <span className={`rounded-xl bg-white/5 p-3 ${color}`}><Icon size={22} /></span>
          <div>
            <p className="text-xs font-semibold text-slate-400">{label}</p>
            <p className="text-2xl font-bold text-white">{loading ? "—" : summary?.[key] ?? 0}</p>
            <p className="text-xs text-slate-400">{description}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
