import { statusCounts } from "../followUpUtils";

const colors = { PENDING: "#8b5cf6", COMPLETED: "#22c55e", CANCELED: "#ec4899", OVERDUE: "#f97316" };

export default function FollowUpStatusChart({ tasks, loading }) {
  const counts = statusCounts(tasks);
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  let offset = 0;
  const gradient = total
    ? Object.entries(counts).map(([key, value]) => {
        const start = offset;
        offset += (value / total) * 100;
        return `${colors[key]} ${start}% ${offset}%`;
      }).join(", ")
    : "#1e293b 0 100%";

  return (
    <section className="dashboard-card rounded-2xl border p-4">
      <h2 className="text-base font-bold text-white">Follow-up Status</h2>
      {loading ? <p className="mt-8 text-sm text-slate-400">Loading status...</p> : (
        <div className="mt-4 flex items-center gap-5">
          <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[#0d0717] text-center">
              <span><strong className="block text-xl text-white">{total}</strong><small className="text-[9px] text-slate-400">Total</small></span>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            {Object.entries(counts).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: colors[key] }} />{key.charAt(0) + key.slice(1).toLowerCase()}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
