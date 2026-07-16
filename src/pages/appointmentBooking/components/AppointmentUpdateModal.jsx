import { getDoctorName, getPatientName } from "../utils/appointmentHelpers";

export default function AppointmentUpdateModal({
  editingAppointment,
  editFormData,
  updatingAppointment,
  onChange,
  onClose,
  onUpdate,
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <h2 className="mb-2 text-xl font-bold">Update Appointment Booking</h2>
        <p className="mb-6 text-sm text-slate-400">
          {getPatientName(editingAppointment)} —{" "}
          {getDoctorName(editingAppointment)}
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Appointment Date and Time
            </label>
            <input
              type="datetime-local"
              name="appointmentDateTime"
              value={editFormData.appointmentDateTime}
              onChange={onChange}
              className="w-full rounded border border-slate-600 bg-slate-800 p-3 text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Consultation Type
            </label>
            <select
              name="consultationType"
              value={editFormData.consultationType}
              onChange={onChange}
              className="w-full rounded border border-slate-600 bg-slate-800 p-3 text-white"
            >
              <option value="IN_PERSON">IN_PERSON</option>
              <option value="ONLINE">ONLINE</option>
              <option value="PHONE">PHONE</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Reason
            </label>
            <input
              name="reason"
              value={editFormData.reason}
              onChange={onChange}
              placeholder="Reason"
              className="w-full rounded border border-slate-600 bg-slate-800 p-3 text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Notes
            </label>
            <textarea
              name="notes"
              value={editFormData.notes}
              onChange={onChange}
              placeholder="Notes"
              rows="4"
              className="w-full rounded border border-slate-600 bg-slate-800 p-3 text-white"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={updatingAppointment}
            className="rounded border border-slate-500 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onUpdate}
            disabled={updatingAppointment}
            className="rounded bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updatingAppointment ? "Updating..." : "Update Appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}

