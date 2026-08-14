import { formatDue, humanize } from "../followUpUtils";

export default function NextFollowUpCard({ task, loading, updating, onView, onEdit, onComplete, onCancel }) {
  return (
    <section className="dashboard-card rounded-2xl border p-4">
      <h2 className="text-base font-bold text-white">Next Follow-up</h2>
      {loading ? <p className="py-12 text-sm text-slate-400">Loading next follow-up...</p> : !task ? <p className="py-12 text-center text-sm text-slate-400">No active follow-up is scheduled.</p> : <>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-4"><p className="text-xl font-bold text-white">{task.patientName}</p><p className="text-xs text-slate-400">{task.patientEllyId}</p><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-500">Type</dt><dd className="font-semibold text-slate-200">{humanize(task.type)}</dd></div><div><dt className="text-slate-500">Priority</dt><dd className="font-semibold text-slate-200">{task.priority}</dd></div><div className="col-span-2"><dt className="text-slate-500">Due</dt><dd className="font-semibold text-slate-200">{formatDue(task.dueAt)}</dd></div><div className="col-span-2"><dt className="text-slate-500">Instructions</dt><dd className="mt-1 text-slate-300">{task.instructions || "No instructions provided"}</dd></div></dl></div>
        <div className="mt-3 grid grid-cols-3 gap-2"><button type="button" disabled={updating} onClick={() => onEdit(task)} className="rounded-lg bg-violet-600/70 px-2 py-2 text-xs font-bold text-white">Edit</button><button type="button" disabled={updating} onClick={() => onComplete(task)} className="rounded-lg bg-emerald-600/70 px-2 py-2 text-xs font-bold text-white">Complete</button><button type="button" disabled={updating} onClick={() => onCancel(task)} className="rounded-lg bg-rose-600/70 px-2 py-2 text-xs font-bold text-white">Cancel</button></div>
        <button type="button" onClick={() => onView(task)} className="mt-2 w-full rounded-lg border border-white/10 py-2 text-xs font-semibold text-violet-200">View details</button>
      </>}
    </section>
  );
}
