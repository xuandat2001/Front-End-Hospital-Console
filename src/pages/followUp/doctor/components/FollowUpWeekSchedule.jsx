export default function FollowUpWeekSchedule({ rows, loading }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className="dashboard-card rounded-2xl border p-4">
      <h2 className="text-base font-bold text-white">Due This Week</h2>
      {loading ? <p className="mt-8 text-sm text-slate-400">Loading week...</p> : (
        <div className="mt-4 space-y-2.5">
          {rows.map((row) => (
            <div key={row.date} className="grid grid-cols-[34px_1fr_28px] items-center gap-2 text-xs">
              <span className="font-semibold text-slate-300">{row.label}</span>
              <div className="h-2 rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500" style={{ width: `${(row.count / max) * 100}%` }} /></div>
              <strong className="text-right text-slate-200">{row.count}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
