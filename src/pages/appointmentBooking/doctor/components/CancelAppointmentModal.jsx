import { useState } from "react";
import { createPortal } from "react-dom";
import { appointmentPatientName, formatAppointmentDate, formatAppointmentTime } from "../doctorAppointmentUtils";

export default function CancelAppointmentModal({ appointment, submitting, onBack, onConfirm }) {
  const [reason, setReason] = useState("");


  if (!appointment) return null;
  const valid = Boolean(reason.trim());

  return createPortal(
    <div className="console-tinted-popup-layer appointment-booking-detail-layer fixed inset-0 z-[13000] flex items-center justify-center bg-black/65 p-4" role="dialog" aria-modal="true" aria-labelledby="doctor-cancel-title">
      <form
        className="console-tinted-popup appointment-booking-detail-popup w-full max-w-lg rounded-2xl border border-white/10 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onConfirm(reason.trim());
        }}
      >
        <h2 id="doctor-cancel-title" className="text-xl font-bold text-white">Cancel Appointment</h2>
        <p className="mt-2 text-sm text-slate-400">This changes the booking to a final canceled state.</p>
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="font-semibold text-white">{appointmentPatientName(appointment)}</p>
          <p className="mt-1 text-xs text-slate-400">{formatAppointmentTime(appointment.appointmentDateTime)} - {formatAppointmentDate(appointment.appointmentDateTime)}</p>
        </div>
        <label htmlFor="doctor-cancellation-reason" className="mt-5 block text-xs font-semibold text-slate-300">Cancellation reason</label>
        <textarea
          id="doctor-cancellation-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          required
          placeholder="Explain why this appointment is being canceled"
          className="form-textarea mt-2 resize-none"
        />
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onBack} disabled={submitting} className="btn btn-secondary min-h-10 px-4 py-2 text-sm">Back</button>
          <button type="submit" disabled={!valid || submitting} className="min-h-10 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? "Canceling..." : "Cancel Appointment"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
