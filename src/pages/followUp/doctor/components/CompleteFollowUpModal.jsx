import { useState } from "react";
import FollowUpModalShell from "./FollowUpModalShell";
import { humanize } from "../followUpUtils";

export default function CompleteFollowUpModal({ task, submitting, onBack, onConfirm }) {
  const [notes, setNotes] = useState("");
  if (!task) return null;
  return (
    <FollowUpModalShell title="Complete Follow-up" subtitle={`${task.patientName} · ${humanize(task.type)}`} onClose={onBack} size="max-w-lg" layer="z-[14100]">
      <label className="text-sm text-slate-300">Completion notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-emerald-400" placeholder="Patient is stable. Continue current plan." /></label>
      <footer className="mt-5 flex justify-end gap-3"><button type="button" onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300">Back</button><button type="button" disabled={submitting} onClick={() => onConfirm({ completionNotes: notes.trim() })} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Complete</button></footer>
    </FollowUpModalShell>
  );
}
