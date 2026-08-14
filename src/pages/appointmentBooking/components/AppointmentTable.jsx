import {
  formatAppointmentDateTime,
  getDepartmentName,
  getDoctorName,
  getInitials,
  getPatientEllyId,
  getPatientName,
  getPatientSubText,
  normalizeStatus,
} from "../utils/appointmentHelpers";

function StatusPill({ status }) {
  const normalizedStatus = normalizeStatus(status);
  const className =
    normalizedStatus === "BOOKED"
      ? "bg-cyan-100 text-cyan-700"
      : normalizedStatus === "IN_PROGRESS"
        ? "bg-violet-100 text-violet-700"
        : normalizedStatus === "CANCELED"
        ? "bg-red-100 text-red-700"
        : normalizedStatus === "NO_SHOW"
          ? "bg-orange-100 text-orange-700"
          : normalizedStatus === "COMPLETED"
            ? "bg-blue-100 text-blue-700"
            : "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${className}`}>
      {normalizedStatus || "N/A"}
    </span>
  );
}

function TypePill({ type }) {
  const normalizedType = String(type || "N/A").toUpperCase();
  const className =
    normalizedType === "ONLINE"
      ? "bg-violet-100 text-violet-700"
      : normalizedType === "PHONE"
        ? "bg-blue-100 text-blue-700"
        : "bg-emerald-100 text-emerald-700";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${className}`}>
      {normalizedType}
    </span>
  );
}

export default function AppointmentTable({
  loading,
  filteredAppointments,
  paginatedAppointments,
  pagination,
  actions,
}) {
  const {
    safeCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    setCurrentPage,
    totalPages,
    paginationPages,
    total,
  } = pagination;

  return (
    <div className="appointment-card w-full overflow-hidden">
      <div className="w-full overflow-hidden">
        <table className="w-full table-fixed text-xs leading-5">
          <colgroup>
            <col className="w-[21%]" />
            <col className="w-[16%]" />
            <col className="w-[17%]" />
            <col className="w-[13%]" />
            <col className="w-[9%]" />
            <col className="w-[10%]" />
            <col className="w-[14%]" />
          </colgroup>
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              {[
                "Patient",
                "ELLY ID",
                "Doctor / Dept",
                "Date & Time",
                "Type",
                "Status",
                "Actions",
              ].map((h) => (
                <th key={h} className={`px-2 py-3 ${h === "Actions" ? "text-center" : "text-left"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan="7"
                  className="px-3 py-8 text-center text-slate-500"
                >
                  Loading appointments...
                </td>
              </tr>
            )}
            {!loading && filteredAppointments.length === 0 && (
              <tr>
                <td
                  colSpan="7"
                  className="px-3 py-8 text-center text-slate-500"
                >
                  No appointments found.
                </td>
              </tr>
            )}
            {!loading &&
              paginatedAppointments.map((appointment) => {
                const status = normalizeStatus(appointment.status);
                const patientName = getPatientName(appointment);
                return (
                  <tr
                    key={appointment._id}
                    onClick={() => actions.view(appointment)}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70"
                  >
                    <td className="px-3 py-3 align-middle">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700">
                          {getInitials(patientName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900 dark:text-white">
                            {patientName}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">
                            {getPatientSubText(appointment)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle font-medium text-slate-700 dark:text-slate-200">
                      <span className="block truncate" title={getPatientEllyId(appointment)}>
                        {getPatientEllyId(appointment)}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle text-slate-700 dark:text-slate-200">
                      <p className="truncate" title={getDoctorName(appointment)}>
                        {getDoctorName(appointment)}
                      </p>
                      <p className="truncate text-[11px] text-slate-500" title={getDepartmentName(appointment)}>
                        {getDepartmentName(appointment)}
                      </p>
                    </td>
                    <td className="px-3 py-3 align-middle text-slate-700 dark:text-slate-200">
                      <span className="block leading-5">
                        {formatAppointmentDateTime(
                          appointment.appointmentDateTime,
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <TypePill type={appointment.consultationType} />
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <StatusPill status={appointment.status} />
                    </td>
                    <td className="px-2 py-3 align-middle">
                      <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            actions.view(appointment);
                          }}
                          className="inline-flex h-7 items-center justify-center rounded-lg border border-slate-200 px-2 text-[10px] font-bold text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                          aria-label="View appointment"
                          title="View"
                        >
                          View
                        </button>
                        {status === "BOOKED" && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              actions.update(appointment);
                            }}
                            className="inline-flex h-7 items-center justify-center rounded-lg border border-slate-200 px-2 text-[10px] font-bold text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                            aria-label="Update appointment"
                            title="Edit"
                          >
                            Edit
                          </button>
                        )}
                        {["BOOKED", "IN_PROGRESS"].includes(status) && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              actions.complete(appointment._id);
                            }}
                            className="inline-flex h-7 items-center justify-center rounded-lg border border-emerald-200 px-2 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/60 dark:hover:bg-emerald-950/30"
                            aria-label="Complete appointment"
                            title="Complete"
                          >
                            Done
                          </button>
                        )}
                        {status === "BOOKED" && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              actions.cancel(appointment._id);
                            }}
                            className="inline-flex h-7 items-center justify-center rounded-lg border border-red-200 px-2 text-[10px] font-bold text-red-500 hover:bg-red-50 dark:border-red-900/60 dark:hover:bg-red-950/30"
                            aria-label="Cancel appointment"
                            title="Cancel"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 text-sm text-slate-500 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
        <p>
          Showing{" "}
          {total === 0
            ? 0
            : (safeCurrentPage - 1) * itemsPerPage + 1}{" "}
          to{" "}
          {Math.min(
            safeCurrentPage * itemsPerPage,
            total,
          )}{" "}
          of {total} results
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={safeCurrentPage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            className="rounded-lg border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
          >
            ‹
          </button>
          {paginationPages.map((page, index) => {
            const previousPage = paginationPages[index - 1];
            const showDots = previousPage && page - previousPage > 1;
            return (
              <span key={page} className="flex items-center gap-2">
                {showDots ? <span className="px-1">...</span> : null}
                <button
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`rounded-lg border px-3 py-2 ${safeCurrentPage === page ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}
                >
                  {page}
                </button>
              </span>
            );
          })}
          <button
            type="button"
            disabled={safeCurrentPage === totalPages}
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
            className="rounded-lg border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
          >
            ›
          </button>
          <select
            value={itemsPerPage}
            onChange={(event) => {
              setItemsPerPage(Number(event.target.value));
              setCurrentPage(1);
            }}
            className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          >
            <option value={5}>5 / page</option>
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
          </select>
        </div>
      </div>
    </div>
  );
}

