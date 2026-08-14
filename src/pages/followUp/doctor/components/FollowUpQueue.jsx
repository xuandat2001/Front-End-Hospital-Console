import { useMemo, useState } from "react";
import { Eye, Search } from "lucide-react";
import { formatDue, humanize, isDueToday, isUpcoming } from "../followUpUtils";

const filters = ["ALL", "DUE_TODAY", "UPCOMING", "OVERDUE"];

export default function FollowUpQueue({ tasks, loading, onView }) {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const visible = useMemo(() => tasks.filter((task) => {
    if (task.status !== "PENDING") return false;
    if (filter === "DUE_TODAY" && !isDueToday(task)) return false;
    if (filter === "UPCOMING" && !isUpcoming(task)) return false;
    if (filter === "OVERDUE" && !(task.overdue || task.displayStatus === "OVERDUE")) return false;
    const needle = search.trim().toLowerCase();
    return !needle || [task.patientName, task.patientEllyId, task.type].some((value) => String(value || "").toLowerCase().includes(needle));
  }), [filter, search, tasks]);

  return (
    <section className="dashboard-card min-w-0 rounded-2xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-bold text-white">Follow-up Queue</h2><label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-slate-300"><Search size={14} /><input aria-label="Search follow-ups" value={search} onChange={(event) => setSearch(event.target.value)} className="w-36 bg-transparent text-xs outline-none" placeholder="Patient or ELLY ID" /></label></div>
      <div className="mt-3 flex flex-wrap gap-2">{filters.map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${filter === value ? "bg-violet-600 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}>{humanize(value)}</button>)}</div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[650px] text-left text-xs">
          <thead className="border-b border-white/10 uppercase tracking-wide text-slate-500"><tr><th className="px-2 py-3">Patient</th><th className="px-2 py-3">Type</th><th className="px-2 py-3">Due</th><th className="px-2 py-3">Priority</th><th className="px-2 py-3">Status</th><th className="px-2 py-3 text-right">Action</th></tr></thead>
          <tbody>{!loading && visible.map((task) => <tr key={task.followUpEllyId || task._id} className="border-b border-white/5 text-slate-300 hover:bg-white/[0.03]"><td className="px-2 py-3"><strong className="block text-white">{task.patientName}</strong><span className="text-[10px] text-slate-500">{task.patientEllyId}</span></td><td className="px-2 py-3">{humanize(task.type)}</td><td className="px-2 py-3">{formatDue(task.dueAt)}</td><td className="px-2 py-3"><span className="rounded-full bg-violet-500/15 px-2 py-1 font-bold text-violet-200">{task.priority}</span></td><td className="px-2 py-3"><span className={`rounded-full px-2 py-1 font-bold ${task.displayStatus === "OVERDUE" ? "bg-orange-500/20 text-orange-200" : "bg-cyan-500/15 text-cyan-200"}`}>{task.displayStatus}</span></td><td className="px-2 py-3 text-right"><button type="button" onClick={() => onView(task)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1.5 text-violet-200"><Eye size={13} /> View</button></td></tr>)}</tbody>
        </table>
        {loading && <p className="py-10 text-center text-sm text-slate-400">Loading follow-ups...</p>}
        {!loading && visible.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No follow-ups match this queue.</p>}
      </div>
    </section>
  );
}
