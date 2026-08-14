import { useState } from "react";
import FollowUpModalShell from "./FollowUpModalShell";
import { FOLLOW_UP_PRIORITIES, FOLLOW_UP_TYPES, formatDue, humanize } from "../followUpUtils";

function dateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function FollowUpFormModal({ open, appointment, task, submitting, onClose, onSubmit }) {
  if (!open) return null;
  return <FollowUpFormContent key={task?.followUpEllyId || task?._id || appointment?._id || "new"} appointment={appointment} task={task} submitting={submitting} onClose={onClose} onSubmit={onSubmit} />;
}

function FollowUpFormContent({ appointment, task, submitting, onClose, onSubmit }) {
  const [form, setForm] = useState({
    type: task?.type || "FOLLOW_UP_VISIT",
    priority: task?.priority || "MEDIUM",
    dueAt: dateTimeLocal(task?.dueAt),
    instructions: task?.instructions || "",
  });
  const [error, setError] = useState("");
  const source = task || appointment;
  const patient = source?.patient || {};
  const patientName = task?.patientName || patient.name || "Unknown patient";
  const patientEllyId = task?.patientEllyId || patient.ellyId || "N/A";

  const submit = async (event) => {
    event.preventDefault();
    if (!form.type || !form.dueAt) {
      setError("Follow-up type and due date/time are required.");
      return;
    }
    setError("");
    await onSubmit({
      type: form.type,
      priority: form.priority,
      dueAt: new Date(form.dueAt).toISOString(),
      instructions: form.instructions.trim(),
    });
  };

  const inputClass = "mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400";
  return (
    <FollowUpModalShell title={task ? "Edit Follow-up" : "Create Follow-up"} subtitle={task ? "Update this active follow-up task." : "Create a task from this clinical visit."} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="mb-5 grid gap-3 rounded-xl border border-white/10 bg-black/15 p-4 text-sm sm:grid-cols-2">
          <p><span className="block text-xs text-slate-400">Patient</span><strong className="text-white">{patientName}</strong></p>
          <p><span className="block text-xs text-slate-400">Patient ELLY ID</span><strong className="break-all text-white">{patientEllyId}</strong></p>
          {!task && <p className="sm:col-span-2"><span className="block text-xs text-slate-400">Source appointment</span><strong className="text-white">{formatDue(appointment?.appointmentDateTime)}</strong></p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300">Follow-up type<select className={inputClass} value={form.type} onChange={(event) => setForm((value) => ({ ...value, type: event.target.value }))}>{FOLLOW_UP_TYPES.map((type) => <option key={type} value={type}>{humanize(type)}</option>)}</select></label>
          <label className="text-sm text-slate-300">Priority<select className={inputClass} value={form.priority} onChange={(event) => setForm((value) => ({ ...value, priority: event.target.value }))}>{FOLLOW_UP_PRIORITIES.map((priority) => <option key={priority} value={priority}>{humanize(priority)}</option>)}</select></label>
          <label className="text-sm text-slate-300 sm:col-span-2">Due date and time<input className={inputClass} type="datetime-local" required value={form.dueAt} onChange={(event) => setForm((value) => ({ ...value, dueAt: event.target.value }))} /></label>
          <label className="text-sm text-slate-300 sm:col-span-2">Instructions<textarea className={`${inputClass} min-h-24 resize-y`} placeholder="Review symptoms, results, or medication response..." value={form.instructions} onChange={(event) => setForm((value) => ({ ...value, instructions: event.target.value }))} /></label>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
        <footer className="mt-5 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">Cancel</button><button type="submit" disabled={submitting} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{submitting ? "Saving..." : task ? "Save changes" : "Create Follow-up"}</button></footer>
      </form>
    </FollowUpModalShell>
  );
}
