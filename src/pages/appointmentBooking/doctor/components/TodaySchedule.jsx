import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, X } from "lucide-react";
import {
  STATUS_META,
  appointmentPatientName,
  formatAppointmentTime,
  normalizeStatus,
  sortDoctorScheduleAppointments,
} from "../doctorAppointmentUtils";

const COMPACT_ROW_LIMIT = 5;

function ScheduleTable({ appointments, onView }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[590px] text-left">
        <thead>
          <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
            <th className="px-2 py-2">Time</th>
            <th className="px-2 py-2">Patient</th>
            <th className="px-2 py-2">Type</th>
            <th className="px-2 py-2">Reason</th>
            <th className="px-2 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => {
            const status = normalizeStatus(appointment.status);
            const meta = STATUS_META[status] || STATUS_META.BOOKED;
            const patientName = appointmentPatientName(appointment);
            return (
              <tr
                key={appointment._id}
                role="button"
                tabIndex={0}
                aria-label={`View ${patientName} appointment`}
                onClick={() => onView(appointment._id)}
                onKeyDown={(event) => {
                  if (["Enter", " "].includes(event.key)) {
                    event.preventDefault();
                    onView(appointment._id);
                  }
                }}
                className="cursor-pointer border-b border-white/[0.06] text-xs text-slate-200 transition-colors last:border-0 hover:bg-violet-500/10 focus-visible:bg-violet-500/10 focus-visible:outline-none"
              >
                <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-white">
                  {formatAppointmentTime(appointment.appointmentDateTime)}
                </td>
                <td className="max-w-36 truncate px-2 py-2.5">{patientName}</td>
                <td className="px-2 py-2.5">
                  <span className="rounded-md bg-cyan-500/10 px-2 py-1 text-[9px] font-bold text-cyan-300">
                    {appointment.consultationType || "N/A"}
                  </span>
                </td>
                <td className="max-w-40 truncate px-2 py-2.5 text-slate-400">
                  {appointment.reason || "No reason provided"}
                </td>
                <td className="px-2 py-2.5">
                  <span className={`rounded-md border px-2 py-1 text-[9px] font-bold ${meta.badge}`}>
                    {meta.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AllTodayAppointmentsModal({ appointments, open, onClose, onView }) {
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return createPortal(
    <div
      className="console-tinted-popup-layer appointment-booking-detail-layer fixed inset-0 z-[13000] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="all-today-appointments-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="console-tinted-popup appointment-booking-detail-popup flex max-h-[85vh] w-full max-w-5xl flex-col rounded-2xl border border-white/10 p-5 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300">Doctor workspace</p>
            <h2 id="all-today-appointments-title" className="mt-1 text-xl font-bold text-white">Today&apos;s Appointments</h2>
            <p className="mt-1 text-sm text-slate-400">
              {appointments.length} appointment{appointments.length === 1 ? "" : "s"} scheduled today
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Close all appointments"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto rounded-xl border border-white/10 bg-black/10 p-2">
          <ScheduleTable appointments={appointments} onView={onView} />
        </div>
      </section>
    </div>,
    document.body,
  );
}

export default function TodaySchedule({ appointments, loading, onView }) {
  const [showAll, setShowAll] = useState(false);
  const sortedAppointments = useMemo(
    () => sortDoctorScheduleAppointments(appointments),
    [appointments],
  );
  const visibleAppointments = sortedAppointments.slice(0, COMPACT_ROW_LIMIT);

  return (
    <>
      <section className="appointment-card min-w-0 rounded-2xl border p-4">
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock size={17} className="text-violet-300" />
          <h2 className="text-sm font-bold text-white">Today&apos;s Schedule</h2>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: COMPACT_ROW_LIMIT }, (_, index) => (
              <div key={index} className="h-10 animate-pulse rounded-lg bg-slate-700/35" />
            ))}
          </div>
        ) : visibleAppointments.length === 0 ? (
          <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-slate-700/60 text-sm text-slate-400">
            No appointments scheduled for today.
          </div>
        ) : (
          <ScheduleTable appointments={visibleAppointments} onView={onView} />
        )}

        {!loading && sortedAppointments.length > COMPACT_ROW_LIMIT && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-xs font-semibold text-violet-300 hover:text-violet-200"
            >
              View all appointments -&gt;
            </button>
          </div>
        )}
      </section>

      <AllTodayAppointmentsModal
        appointments={sortedAppointments}
        open={showAll}
        onClose={() => setShowAll(false)}
        onView={onView}
      />
    </>
  );
}
