export default function AppointmentBookingDetailModal({
  appointment,
  onClose,
  formatDateTime,
}) {
  if (!appointment) return null;

  const getPatientName = () => {
    return (
      appointment.patient?.name ||
      appointment.patient?.fullName ||
      appointment.patient?.id ||
      appointment.patientId ||
      "N/A"
    );
  };

  const getPatientEllyId = () => {
    return (
      appointment.patient?.ellyId ||
      appointment.patient?.patientEllyId ||
      appointment.patient?.ellyPatientId ||
      appointment.patientEllyId ||
      "N/A"
    );
  };

  const getDoctorName = () => {
    return (
      appointment.doctor?.name ||
      appointment.doctor?.fullName ||
      appointment.doctor?.id ||
      appointment.doctorId ||
      "N/A"
    );
  };

  const getDepartmentName = () => {
    return (
      appointment.department?.name ||
      appointment.department?.id ||
      appointment.departmentId ||
      "N/A"
    );
  };

  const getHospitalName = () => {
    return (
      appointment.hospital?.name ||
      appointment.hospital?.hospitalName ||
      appointment.hospital?.id ||
      appointment.hospitalId ||
      "N/A"
    );
  };

  const getDurationMinutes = () => {
    if (appointment.durationMinutes) {
      return Number(appointment.durationMinutes);
    }

    if (appointment.appointmentDateTime && appointment.appointmentEndDateTime) {
      const start = new Date(appointment.appointmentDateTime);
      const end = new Date(appointment.appointmentEndDateTime);

      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        return Math.round((end.getTime() - start.getTime()) / 60000);
      }
    }

    return 30;
  };

  const getEndDateTime = () => {
    if (appointment.appointmentEndDateTime) {
      return appointment.appointmentEndDateTime;
    }

    if (!appointment.appointmentDateTime) {
      return null;
    }

    const start = new Date(appointment.appointmentDateTime);

    if (Number.isNaN(start.getTime())) {
      return null;
    }

    return new Date(start.getTime() + getDurationMinutes() * 60 * 1000);
  };

  const formatTimeOnly = (value) => {
    if (!value) return "N/A";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "N/A";
    }

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes) => {
    const safeMinutes = Number(minutes || 0);

    if (!safeMinutes) {
      return "N/A";
    }

    if (safeMinutes < 60) {
      return `${safeMinutes} minutes`;
    }

    const hours = Math.floor(safeMinutes / 60);
    const remainingMinutes = safeMinutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? "s" : ""}`;
    }

    return `${hours} hour${hours > 1 ? "s" : ""} ${remainingMinutes} minutes`;
  };

  const getStatusClass = () => {
    const normalizedStatus = String(appointment?.status || "")
      .trim()
      .toUpperCase();

    if (normalizedStatus === "BOOKED") {
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
    }

    if (normalizedStatus === "CANCELED") {
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
    }

    if (normalizedStatus === "NO_SHOW") {
      return "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300";
    }

    if (normalizedStatus === "COMPLETED") {
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
    }

    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  };

  const durationMinutes = getDurationMinutes();
  const endDateTime = getEndDateTime();
  const status = String(appointment.status || "N/A").toUpperCase();
  const cancellationReason =
    appointment.cancellationReason || appointment.cancelReason || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">
              Appointment Booking Details
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Full appointment information including selected duration and time
              range.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Time Range
              </p>
              <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                {formatTimeOnly(appointment.appointmentDateTime)} -{" "}
                {formatTimeOnly(endDateTime)}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {formatDateTime(appointment.appointmentDateTime)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                {formatDuration(durationMinutes)}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass()}`}
              >
                {status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <InfoItem label="Patient" value={getPatientName()} />
          <InfoItem label="Patient ELLY ID" value={getPatientEllyId()} />
          <InfoItem label="Doctor" value={getDoctorName()} />
          <InfoItem label="Department" value={getDepartmentName()} />
          <InfoItem label="Hospital" value={getHospitalName()} />

          <InfoItem
            label="Consultation Type"
            value={appointment.consultationType || "N/A"}
          />

          <InfoItem
            label="Start Time"
            value={formatDateTime(appointment.appointmentDateTime)}
          />

          <InfoItem label="End Time" value={formatDateTime(endDateTime)} />

          <InfoItem label="Duration" value={formatDuration(durationMinutes)} />

          <InfoItem
            label="Appointment ID"
            value={appointment._id || "N/A"}
            breakText
          />

          <div className="md:col-span-2">
            <p className="text-slate-500 dark:text-slate-400">Reason</p>
            <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-800 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200">
              {appointment.reason || "No reason provided"}
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="text-slate-500 dark:text-slate-400">Notes</p>
            <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-800 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200">
              {appointment.notes || "No notes provided"}
            </p>
          </div>

          {status === "CANCELED" && (
            <div className="md:col-span-2">
              <p className="text-slate-500 dark:text-slate-400">
                Cancellation Details
              </p>
              <div className="mt-1 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                <p>
                  <span className="font-semibold">Reason:</span>{" "}
                  {cancellationReason || "No cancellation reason provided"}
                </p>

                {appointment.cancelledAt && (
                  <p className="mt-1">
                    <span className="font-semibold">Canceled At:</span>{" "}
                    {formatDateTime(appointment.cancelledAt)}
                  </p>
                )}

                {appointment.cancelledBy && (
                  <p className="mt-1">
                    <span className="font-semibold">Canceled By:</span>{" "}
                    {appointment.cancelledBy}
                  </p>
                )}
              </div>
            </div>
          )}

          {status === "NO_SHOW" && (
            <div className="md:col-span-2">
              <p className="text-slate-500 dark:text-slate-400">No-show Details</p>
              <div className="mt-1 rounded-lg border border-orange-200 bg-orange-50 p-3 text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300">
                <p>Patient did not attend the appointment.</p>
                {appointment.noShowAt && (
                  <p className="mt-1">
                    <span className="font-semibold">Marked At:</span>{" "}
                    {formatDateTime(appointment.noShowAt)}
                  </p>
                )}
              </div>
            </div>
          )}

          {status === "COMPLETED" && (appointment.completedAt || appointment.completedBy) && (
            <div className="md:col-span-2">
              <p className="text-slate-500 dark:text-slate-400">Completion Details</p>
              <div className="mt-1 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                {appointment.completedAt && (
                  <p>
                    <span className="font-semibold">Completed At:</span>{" "}
                    {formatDateTime(appointment.completedAt)}
                  </p>
                )}
                {appointment.completedBy && (
                  <p className="mt-1">
                    <span className="font-semibold">Completed By:</span>{" "}
                    {appointment.completedBy}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, breakText = false }) {
  return (
    <div>
      <p className="text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={`font-semibold text-slate-900 dark:text-white ${
          breakText ? "break-all" : ""
        }`}
      >
        {value || "N/A"}
      </p>
    </div>
  );
}

