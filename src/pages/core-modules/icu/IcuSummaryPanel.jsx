import { AlertTriangle, CheckCircle2, ClipboardCheck, MonitorOff, UsersRound } from "lucide-react";

const severityOrder = ["Critical", "High Attention", "Watch", "Stable", "Stale / Device Issue"];
const severityTone = {
  Critical: "bg-red-500",
  "High Attention": "bg-amber-500",
  Watch: "bg-blue-500",
  Stable: "bg-emerald-500",
  "Stale / Device Issue": "bg-slate-500",
};

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="icu-shift-stat px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase text-slate-400">{label}</span>
        <Icon size={13} className="text-slate-400" />
      </div>
      <strong className="mt-1 block text-lg text-slate-900 dark:text-white">{value ?? 0}</strong>
    </div>
  );
}

export default function IcuSummaryPanel({ overview, patients = [], onOpenPatient }) {
  const severityCounts = overview?.severityCounts || {};
  const total = overview?.totalPatients || 0;
  const attention = patients
    .filter((patient) => ["Critical", "High Attention"].includes(patient.severity))
    .slice(0, 5);
  const deviceWarnings = overview?.deviceWarnings || patients.filter((patient) => ["delayed", "stale", "disconnected"].includes(patient.deviceStatus)).slice(0, 5);
  const signoffs = overview?.signoffs || [];

  return (
    <aside className="icu-shift-board flex h-full min-w-[290px] flex-col gap-3 overflow-y-auto p-3 lg:sticky lg:top-0 lg:max-h-[calc(100vh-150px)]">
      <div className="icu-shift-heading">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">ICU Shift Board</h2>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">Operational pressure, alerts, and handoff status.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Patients" value={overview?.totalPatients} icon={UsersRound} />
        <Stat label="Beds Open" value={overview?.availableBeds} icon={CheckCircle2} />
        <Stat label="Urgent" value={overview?.urgentAttentionCount} icon={AlertTriangle} />
        <Stat label="Signoffs" value={overview?.pendingSignoffs} icon={ClipboardCheck} />
      </div>

      <section className="icu-shift-section p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">Severity Distribution</h3>
          <span className="text-[10px] font-semibold text-slate-400">{total} active</span>
        </div>
        <div className="icu-severity-track flex h-2 overflow-hidden">
          {severityOrder.map((severity) => {
            const count = severityCounts[severity] || 0;
            return count > 0 ? (
              <span
                key={severity}
                className={severityTone[severity]}
                style={{ width: `${Math.max(6, (count / Math.max(total, 1)) * 100)}%` }}
              />
            ) : null;
          })}
        </div>
        <div className="mt-3 space-y-1.5">
          {severityOrder.map((severity) => (
            <div key={severity} className="icu-severity-row flex items-center justify-between text-[10px] font-semibold">
              <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <i className={`h-2 w-2 rounded-full ${severityTone[severity]}`} />
                {severity}
              </span>
              <span className="text-slate-900 dark:text-white">{severityCounts[severity] || 0}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="icu-shift-section p-3">
        <h3 className="mb-2 text-xs font-bold text-slate-900 dark:text-white">Patients Needing Attention</h3>
        <div className="space-y-2">
          {attention.length ? attention.map((patient) => (
            <button
              key={patient.id || patient._id}
              type="button"
              onClick={() => onOpenPatient(patient)}
              className="icu-attention-row w-full px-2 py-2 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <strong className="truncate text-xs text-slate-900 dark:text-white">{patient.displayName || patient.ellyId}</strong>
                <span className="shrink-0 text-[10px] font-bold text-red-500">{patient.severity}</span>
              </div>
              <p className="mt-0.5 truncate text-[10px] text-slate-500">{patient.bedId || patient.roomId} / SpO2 {patient.latestVitals?.oxygenSaturation ?? "--"}%</p>
            </button>
          )) : (
            <p className="icu-empty-note p-2 text-[10px] text-slate-500 dark:text-slate-400">No critical or high-attention ICU patients.</p>
          )}
        </div>
      </section>

      <section className="icu-shift-section p-3">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
          <MonitorOff size={13} />
          Device Warnings
        </h3>
        <div className="space-y-1.5">
          {deviceWarnings.length ? deviceWarnings.slice(0, 5).map((item) => (
            <div key={item.id || item._id} className="icu-device-row flex items-center justify-between gap-2 px-2 py-1.5 text-[10px]">
              <span className="truncate text-slate-600 dark:text-slate-300">{item.displayName || item.patientId}</span>
              <strong className="capitalize text-amber-600 dark:text-amber-300">{item.deviceStatus}</strong>
            </div>
          )) : (
            <p className="text-[10px] text-slate-500 dark:text-slate-400">All active streams are current.</p>
          )}
        </div>
      </section>

      <section className="icu-shift-section p-3">
        <h3 className="mb-2 text-xs font-bold text-slate-900 dark:text-white">Shift Sign-offs</h3>
        <div className="space-y-1.5">
          {signoffs.length ? signoffs.slice(0, 5).map((signoff) => (
            <div key={signoff._id} className="icu-signoff-row px-2 py-1.5 text-[10px]">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold text-slate-700 dark:text-slate-200">{signoff.patientId || "ICU handoff"}</span>
                <strong className="text-slate-500">{signoff.status}</strong>
              </div>
              <p className="mt-0.5 line-clamp-2 text-slate-500">{signoff.note}</p>
            </div>
          )) : (
            <p className="text-[10px] text-slate-500 dark:text-slate-400">No sign-offs for the current shift.</p>
          )}
        </div>
      </section>
    </aside>
  );
}
