export default function DoctorWeekSchedule({ rows, loading }) {
  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <section className="appointment-card min-w-0 rounded-2xl border p-4">
      <h2 className="text-sm font-bold text-white">This Week</h2>
      {loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-5 animate-pulse rounded bg-slate-700/35" />)}
        </div>
      ) : (
        <div className="mt-3 space-y-2.5">
          {rows.map((row) => (
            <div key={row.key} className="grid grid-cols-[34px_94px_minmax(0,1fr)] items-center gap-2 text-[11px]">
              <span className="font-semibold text-slate-300">{row.label}</span>
              <span className="text-slate-400">{row.count} appointment{row.count === 1 ? "" : "s"}</span>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800/80">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400" style={{ width: `${row.count ? Math.max(10, (row.count / max) * 100) : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
