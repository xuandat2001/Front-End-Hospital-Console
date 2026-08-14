import FollowUpModalShell from "./FollowUpModalShell";
import { formatDue, humanize } from "../followUpUtils";

function Item({ label, value, wide = false }) {
  return <div className={wide ? "sm:col-span-2" : ""}><p className="text-xs text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-semibold text-white">{value || "N/A"}</p></div>;
}

export default function FollowUpDetailModal({ task, loading, onClose, onEdit, onComplete, onCancel }) {
  if (!task && !loading) return null;
  const pending = task?.status === "PENDING";
  return (
    <FollowUpModalShell title="Follow-up Details" subtitle="Clinical follow-up task and source information." onClose={onClose} size="max-w-3xl">
      {loading ? <p className="py-12 text-center text-sm text-slate-400">Loading follow-up details...</p> : <>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/15 p-4">
          <div><p className="text-xs text-slate-400">Due</p><strong className="text-lg text-white">{formatDue(task.dueAt)}</strong></div>
          <div className="flex gap-2"><span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-200">{task.priority}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${task.displayStatus === "OVERDUE" ? "bg-orange-500/20 text-orange-200" : "bg-emerald-500/15 text-emerald-200"}`}>{task.displayStatus || task.status}</span></div>
        </div>
        <div className="grid gap-4 rounded-xl border border-white/10 p-4 sm:grid-cols-2">
          <Item label="Patient" value={task.patientName} /><Item label="Patient ELLY ID" value={task.patientEllyId} />
          <Item label="Doctor" value={task.doctorEllyId} /><Item label="Hospital" value={task.hospitalId} />
          <Item label="Department" value={task.departmentName || task.departmentId} /><Item label="Source appointment" value={task.appointmentId} />
          <Item label="Type" value={humanize(task.type)} /><Item label="Priority" value={humanize(task.priority)} />
          <Item label="Created" value={formatDue(task.createdAt)} /><Item label="Updated" value={formatDue(task.updatedAt)} />
          <Item label="Instructions" value={task.instructions || "No instructions provided"} wide />
          {task.completedAt && <><Item label="Completed" value={formatDue(task.completedAt)} /><Item label="Completion notes" value={task.completionNotes || "No notes provided"} /></>}
          {task.canceledAt && <><Item label="Canceled" value={formatDue(task.canceledAt)} /><Item label="Cancellation reason" value={task.cancellationReason} /></>}
        </div>
        {pending && <footer className="mt-5 grid gap-2 sm:grid-cols-3"><button type="button" onClick={onEdit} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white">Edit</button><button type="button" onClick={onComplete} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white">Complete</button><button type="button" onClick={onCancel} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white">Cancel</button></footer>}
      </>}
    </FollowUpModalShell>
  );
}
