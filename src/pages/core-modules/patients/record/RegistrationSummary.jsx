import { formatDateTime } from "../../../../utils/dateFormat";

const STATUS_BADGE = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  ACCEPTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  REMOVED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

const PRIORITY_BADGE = {
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  URGENT: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  STANDARD: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
};

export default function RegistrationSummary({ registrations, loading, error }) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading registration history…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/40">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
      </section>
    );
  }

  if (!registrations.length) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          No registration records for this patient
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Registrations appear here once the patient enters the intake queue.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {registrations.map((entry) => {
        const statusClass = STATUS_BADGE[entry.status] || STATUS_BADGE.PENDING;
        const priorityClass = PRIORITY_BADGE[entry.priority] || PRIORITY_BADGE.STANDARD;
        const severity =
          typeof entry.severityScore === "number" ? entry.severityScore.toFixed(1) : "—";

        return (
          <section
            key={entry.eventId}
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
                  {entry.status || "PENDING"}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityClass}`}>
                  {entry.priority || "STANDARD"}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Severity {severity}
                </span>
              </div>
              <span className="text-xs text-slate-400">{formatDateTime(entry.registeredAt)}</span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Registration Source" value={entry.registrationSource} />
              <Field label="Hospital ID" value={entry.hospitalId} />
              <Field label="Hospital MRN" value={entry.hospitalMRN} />
              <Field label="Chief Complaint" value={entry.chiefComplaint} />
            </div>

            {Array.isArray(entry.assessmentReasons) && entry.assessmentReasons.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Logic-Based Assessment
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
                  {entry.assessmentReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {entry.decision?.action && (
              <p className="mt-3 text-xs text-slate-400">
                Last action: {entry.decision.action}
                {entry.decision.automated ? " (automated)" : ""}
                {entry.decision.actorId ? ` · by ${entry.decision.actorId}` : ""}
                {entry.decision.decidedAt ? ` · ${formatDateTime(entry.decision.decidedAt)}` : ""}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{value || "N/A"}</p>
    </div>
  );
}
