import { createPortal } from "react-dom";

export default function AppointmentCreateModal({
  formData,
  departments,
  doctors,
  departmentsLoading,
  doctorsLoading,
  availableSlots = [],
  slotsLoading = false,
  creating = false,
  onChange,
  onClose,
  onCreate,
}) {
  const textFieldClass =
    "appointment-create-field rounded border border-slate-600 bg-slate-800 p-3 text-white placeholder:text-slate-400 focus:border-slate-500 focus:bg-slate-800 focus:text-white focus:outline-none";

  return createPortal(
    <div
      className="console-tinted-popup-layer fixed inset-0 z-[12000] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-appointment-title"
    >
      <div className="console-tinted-popup max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <h2 id="create-appointment-title" className="mb-6 text-xl font-bold">Create Appointment Booking</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            name="patientEllyId"
            value={formData.patientEllyId}
            onChange={onChange}
            autoComplete="off"
            spellCheck="false"
            placeholder="Patient ELLY ID"
            className={textFieldClass}
          />

          <select
            name="departmentId"
            value={formData.departmentId}
            onChange={onChange}
            disabled={departmentsLoading}
            className="rounded border border-slate-600 bg-slate-800 p-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              {departmentsLoading ? "Loading departments..." : "Select Department"}
            </option>
            {!departmentsLoading && departments.length === 0 && (
              <option value="" disabled>
                No departments available for this hospital
              </option>
            )}
            {departments.map((department) => (
              <option key={department._id} value={department._id}>
                {department.name}
                {department.specialty ? ` - ${department.specialty}` : ""}
              </option>
            ))}
          </select>

          <select
            name="doctorId"
            value={formData.doctorId}
            onChange={onChange}
            disabled={!formData.departmentId || doctorsLoading}
            className="rounded border border-slate-600 bg-slate-800 p-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              {!formData.departmentId
                ? "Select department first"
                : doctorsLoading
                  ? "Loading doctors..."
                  : "Select Doctor"}
            </option>
            {formData.departmentId && !doctorsLoading && doctors.length === 0 && (
              <option value="" disabled>
                No available doctors in this department
              </option>
            )}
            {doctors.map((doctor) => (
              <option key={doctor._id} value={doctor._id}>
                {doctor.fullName || doctor.name || doctor.ellyId}
                {doctor.specialization ? ` - ${doctor.specialization}` : ""}
                {doctor.status ? ` (${doctor.status})` : ""}
              </option>
            ))}
          </select>

          <input
            type="date"
            name="appointmentDate"
            value={formData.appointmentDate}
            onChange={onChange}
            disabled={!formData.doctorId}
            className="rounded border border-slate-600 bg-slate-800 p-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
          />

          <select
            name="durationMinutes"
            value={formData.durationMinutes}
            onChange={onChange}
            disabled={!formData.doctorId}
            className="rounded border border-slate-600 bg-slate-800 p-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
            <option value="90">90 minutes</option>
            <option value="120">120 minutes</option>
          </select>

          <select
            name="appointmentDateTime"
            value={formData.appointmentDateTime}
            onChange={onChange}
            disabled={!formData.doctorId || !formData.appointmentDate || slotsLoading}
            className="rounded border border-slate-600 bg-slate-800 p-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              {!formData.doctorId
                ? "Select doctor first"
                : !formData.appointmentDate
                  ? "Select date first"
                  : slotsLoading
                    ? "Loading available times..."
                    : "Select Available Time"}
            </option>

            {formData.doctorId &&
              formData.appointmentDate &&
              !slotsLoading &&
              availableSlots.length === 0 && (
                <option value="" disabled>
                  No available time for this duration
                </option>
              )}

            {availableSlots.map((slot) => (
              <option key={slot.start} value={slot.start}>
                {slot.label}
              </option>
            ))}
          </select>

          <select
            name="consultationType"
            value={formData.consultationType}
            onChange={onChange}
            className={textFieldClass}
          >
            <option value="IN_PERSON">IN_PERSON</option>
            <option value="ONLINE">ONLINE</option>
            <option value="PHONE">PHONE</option>
          </select>

          <input
            name="reason"
            value={formData.reason}
            onChange={onChange}
            autoComplete="off"
            placeholder="Reason"
            className={`${textFieldClass} md:col-span-2`}
          />

          <textarea
            name="notes"
            value={formData.notes}
            onChange={onChange}
            placeholder="Notes"
            rows="4"
            className={`${textFieldClass} md:col-span-2`}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-500 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onCreate}
            disabled={creating}
            className="rounded bg-teal-600 px-4 py-2 text-white hover:bg-teal-700"
          >
            Create
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

