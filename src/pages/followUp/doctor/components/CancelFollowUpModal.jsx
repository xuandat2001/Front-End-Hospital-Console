import { useState } from "react";
import FollowUpModalShell from "./FollowUpModalShell";
import { formatDue, humanize } from "../followUpUtils";

export default function CancelFollowUpModal({ task, submitting, onBack, onConfirm }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  if (!task) return null;
  const submit = () => {
    if (!reason.trim()) { setError("Cancellation reason is required."); return; }
    onConfirm({ cancellationReason: reason.trim() });
  };
  return (
    <FollowUpModalShell title="Cancel Follow-up" subtitle={`${task.patientName} · ${humanize(task.type)} · ${formatDue(task.dueAt)}`} onClose={onBack} size="max-w-lg" layer="z-[14100]">
      <label className="text-sm text-slate-300">Cancellation reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-rose-400" /></label>
      {error && <p role="alert" className="mt-2 text-sm text-rose-300">{error}</p>}
      <footer className="mt-5 flex justify-end gap-3"><button type="button" onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300">Back</button><button type="button" disabled={submitting} onClick={submit} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Cancel Follow-up</button></footer>
    </FollowUpModalShell>
  );
}
