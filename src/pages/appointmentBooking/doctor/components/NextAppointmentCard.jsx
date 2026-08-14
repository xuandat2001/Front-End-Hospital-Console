import {
  Activity,
  Calendar,
  CheckCircle,
  ClipboardPlus,
  Eye,
  PlayCircle,
  UserX,
  XCircle,
} from "lucide-react";
import {
  STATUS_META,
  appointmentDepartment,
  appointmentPatientEllyId,
  appointmentPatientName,
  formatAppointmentDate,
  formatAppointmentTime,
  normalizeStatus,
} from "../doctorAppointmentUtils";

function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate text-xs font-medium text-slate-200">{value || "N/A"}</dd>
    </div>
  );
}

export default function NextAppointmentCard({
  appointment,
  loading,
  updating,
  onStart,
  onComplete,
  onCreateFollowUp,
  onNoShow,
  onCancel,
  onView,
}) {
  if (loading) {
    return (
      <section className="appointment-card min-h-64 animate-pulse rounded-2xl border p-4">
        <div className="h-4 w-36 rounded bg-slate-700/50" />
        <div className="mt-5 h-12 w-28 rounded bg-slate-700/45" />
        <div className="mt-5 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-8 rounded bg-slate-700/35" />)}
        </div>
      </section>
    );
  }

  const status = normalizeStatus(appointment?.status);
  const statusMeta = STATUS_META[status];

  return (
    <section className="appointment-card min-w-0 rounded-2xl border p-4">
      <div className="mb-3 flex items-center gap-2">
        <Calendar size={17} className="text-violet-300" />
        <h2 className="text-sm font-bold text-white">
          {status === "IN_PROGRESS" ? "Active Visit" : "Next Appointment"}
        </h2>
      </div>

      {!appointment ? (
        <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-slate-700/60 text-sm text-slate-400">
          No upcoming appointment.
        </div>
      ) : (
        <>
          <div className="grid gap-3 border-y border-white/[0.08] py-3 sm:grid-cols-[120px_minmax(0,1fr)]">
            <div>
              <p className="text-2xl font-bold text-white">{formatAppointmentTime(appointment.appointmentDateTime)}</p>
              <p className="mt-1 text-[11px] text-slate-400">{formatAppointmentDate(appointment.appointmentDateTime)}</p>
            </div>
            <dl className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2">
              <Detail label="Patient" value={appointmentPatientName(appointment)} />
              <Detail label="Patient ID" value={appointmentPatientEllyId(appointment)} />
              <Detail label="Consultation type" value={appointment.consultationType} />
              <Detail label="Department" value={appointmentDepartment(appointment)} />
              <Detail label="Reason" value={appointment.reason || "No reason provided"} />
              <Detail label="Duration" value={`${appointment.durationMinutes || 30} minutes`} />
            </dl>
          </div>

          {status === "BOOKED" && (
            <div className="mt-3 space-y-2">
              <button
                type="button"
                disabled={updating}
                onClick={onStart}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-violet-500/30 px-3 text-xs font-bold text-violet-100 hover:bg-violet-500/40 disabled:opacity-50"
              >
                <PlayCircle size={15} /> {updating ? "Starting..." : "Start Visit"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={updating} onClick={onNoShow} className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg bg-orange-500/20 px-2 text-[11px] font-semibold text-orange-200 hover:bg-orange-500/30 disabled:opacity-50">
                  <UserX size={13} /> No-show
                </button>
                <button type="button" disabled={updating} onClick={onCancel} className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg bg-rose-500/20 px-2 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/30 disabled:opacity-50">
                  <XCircle size={13} /> Cancel
                </button>
              </div>
            </div>
          )}

          {status === "IN_PROGRESS" && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-center gap-2 rounded-lg border border-violet-400/25 bg-violet-500/15 px-3 py-2 text-[11px] font-bold tracking-wide text-violet-200">
                <Activity size={14} /> IN PROGRESS
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={updating}
                  onClick={onCreateFollowUp}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-violet-400/25 bg-violet-500/15 px-2 text-[11px] font-bold text-violet-100 hover:bg-violet-500/25 disabled:opacity-50"
                >
                  <ClipboardPlus size={14} /> Create Follow-up
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={onComplete}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-500/25 px-2 text-[11px] font-bold text-emerald-100 hover:bg-emerald-500/35 disabled:opacity-50"
                >
                  <CheckCircle size={14} /> {updating ? "Completing..." : "Complete Visit"}
                </button>
              </div>
            </div>
          )}

          {["COMPLETED", "CANCELED", "NO_SHOW"].includes(status) && statusMeta && (
            <div className={`mt-3 rounded-lg border px-3 py-2 text-center text-[11px] font-bold tracking-wide ${statusMeta.badge}`}>
              {statusMeta.label.toUpperCase()}
            </div>
          )}

          <button type="button" onClick={onView} className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-violet-400/25 text-[11px] font-semibold text-violet-200 hover:bg-violet-500/10">
            <Eye size={13} /> View details
          </button>
        </>
      )}
    </section>
  );
}
