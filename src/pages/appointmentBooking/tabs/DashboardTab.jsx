import { useState } from "react";
import { createPortal } from "react-dom";
import AppointmentStatusOverview from "../components/AppointmentStatusOverview";
import AppointmentFilters from "../components/AppointmentFilters";
import AppointmentTable from "../components/AppointmentTable";
function Card({ title, children, action, onAction, className = "" }) {
  return (
    <div className={`appointment-card min-w-0 p-5 ${className}`}>
      <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
        <h3 className="min-w-0 truncate font-bold text-slate-950 dark:text-white">{title}</h3>

        {action ? (
          <button
            type="button"
            onClick={onAction}
            className="shrink-0 text-xs font-semibold text-violet-600 hover:text-violet-500"
          >
            {action}
          </button>
        ) : null}
      </div>

      {children}
    </div>
  );
}

function Progress({ value, max }) {
  const width = max > 0 ? Math.max(6, (value / max) * 100) : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className="h-full rounded-full bg-violet-500"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function CountRows({ title, rows, subKey, onViewAll, className = "" }) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <Card
      title={title}
      action={rows.length > 5 ? "View all" : null}
      onAction={onViewAll}
      className={className}
    >
      <div className="space-y-4">
        {rows.length === 0 && (
          <p className="text-sm text-slate-500">No data today.</p>
        )}
        {rows.slice(0, 5).map((row) => (
          <div key={row.name}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {row.name}
              </span>
              <span className="font-bold text-slate-500">{row.count}</span>
            </div>
            {subKey && (
              <p className="mb-2 text-xs text-slate-500">{row[subKey]}</p>
            )}
            <Progress value={row.count} max={max} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function TypeSummaryBar({ row, max }) {
  const width = max > 0 ? Math.max(8, (row.count / max) * 100) : 0;
  const type = row.name?.toUpperCase?.() || row.name;
  const barClass =
    type === "ONLINE"
      ? "bg-blue-500"
      : type === "PHONE"
        ? "bg-emerald-500"
        : "bg-violet-500";

  return (
    <div>
      <div className="mb-2 flex min-w-0 items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-semibold text-slate-700 dark:text-slate-200">
          {row.name}
        </span>
        <span className="shrink-0 font-semibold text-slate-500 dark:text-slate-400">
          {row.count}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900/70">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function TypeSummary({ rows }) {
  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <Card
      title="Appointment Type Summary"
      className="min-h-[185px] xl:p-4 2xl:p-5"
    >
      <div className="mt-1 space-y-5">
        {rows.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No type data available.
          </p>
        )}
        {rows.map((row) => (
          <TypeSummaryBar key={row.name} row={row} max={max} />
        ))}
      </div>
    </Card>
  );
}
function EllySummary({ insights, onViewAll }) {
  return (
    <Card
      className="min-w-0 xl:p-4 2xl:p-5"
      title="Elly AI Summary"
      action="View full insights"
      onAction={onViewAll}
    >
      <ul className="space-y-3">
        {insights.slice(0, 3).map((insight) => (
          <li key={insight} className="flex min-w-0 gap-3 break-words text-xs leading-5 text-slate-600 dark:text-slate-300 2xl:text-sm">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
            {insight}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AppointmentListLauncher({
  filters,
  onFilterChange,
  onClearFilters,
  onAddBooking,
  onOpenList,
}) {
  const openAllBookings = () => {
    onClearFilters();
    onOpenList();
  };

  return (
    <div className="appointment-card mb-6 ml-auto w-fit max-w-full px-3 py-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onAddBooking}
            className="rounded-xl border border-indigo-500/40 bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-indigo-400/30 dark:bg-indigo-500 dark:shadow-indigo-900/40 dark:hover:bg-indigo-600"
          >
            Add Booking
          </button>
          <button
            type="button"
            onClick={openAllBookings}
            className="rounded-xl border border-indigo-500/40 bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-indigo-400/30 dark:bg-indigo-500 dark:shadow-indigo-900/40 dark:hover:bg-indigo-600"
          >
            All Bookings
          </button>
          <input
            type="text"
            value={filters.keyword}
            onChange={(event) => onFilterChange("keyword", event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onOpenList();
              }
            }}
            placeholder="Patient, EllyID, doctor..."
            className="w-44 rounded-xl border border-white/50 bg-white/70 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 shadow-sm outline-none backdrop-blur-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-200/80 dark:border-white/10 dark:bg-slate-800/60 dark:text-white dark:placeholder-slate-500 dark:focus:border-violet-500 sm:w-56"
          />
          <button
            type="button"
            onClick={onOpenList}
            className="rounded-xl border border-violet-500/50 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-700 shadow-sm backdrop-blur-sm hover:bg-violet-500/20 dark:border-violet-400/40 dark:text-violet-300 dark:hover:bg-violet-500/20"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
}

function AppointmentBookingListModal({
  loading,
  filters,
  onFilterChange,
  onClearFilters,
  departmentFilterOptions,
  doctorFilterOptions,
  filteredAppointments,
  paginatedAppointments,
  pagination,
  actions,
  onClose,
}) {
  const statusFilters = [
    { label: "All Bookings", value: "" },
    { label: "Booked", value: "BOOKED" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Canceled", value: "CANCELED" },
    { label: "No-show", value: "NO_SHOW" },
  ];

  return createPortal(
    <div
      className="console-tinted-popup-layer console-tinted-popup-layer--panel-size fixed inset-y-20 left-4 right-4 z-[12000] flex items-start justify-center bg-black/45 px-0 py-4 backdrop-blur-sm xl:bottom-8 xl:left-[246px] xl:right-[310px] xl:top-28"
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-booking-list-title"
    >
      <div
        className="console-tinted-popup appointment-booking-list-popup flex max-h-full w-full max-w-[1120px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-950"
        data-tone="dense-popup"
      >
        <div className="appointment-booking-list-popup__header flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h2 id="appointment-booking-list-title" className="text-lg font-bold text-slate-900 dark:text-white">
              Appointment Booking List
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {pagination.total ?? filteredAppointments.length} booking
              {(pagination.total ?? filteredAppointments.length) === 1 ? "" : "s"} found
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="relative z-10 inline-flex min-h-10 min-w-16 shrink-0 items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="appointment-booking-list-popup__body min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((statusFilter) => (
                <button
                  key={statusFilter.label}
                  type="button"
                  onClick={() => onFilterChange("status", statusFilter.value)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    filters.status === statusFilter.value
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {statusFilter.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Clear Filters
            </button>
          </div>

          <AppointmentFilters
            filters={filters}
            onFilterChange={onFilterChange}
            onClearFilters={onClearFilters}
            departmentFilterOptions={departmentFilterOptions}
            doctorFilterOptions={doctorFilterOptions}
          />
          <AppointmentTable
            loading={loading}
            filteredAppointments={filteredAppointments}
            paginatedAppointments={paginatedAppointments}
            pagination={pagination}
            actions={actions}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ViewAllModal({ modal, onClose }) {
  if (!modal) return null;

  return (
    <div className="fixed inset-y-20 left-4 right-4 z-50 flex items-start justify-center bg-black/45 px-0 py-4 backdrop-blur-sm xl:bottom-8 xl:left-[246px] xl:right-[310px] xl:top-28">
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">
            {modal.title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {modal.type === "countRows" && (
            <div className="space-y-4">
              {modal.rows.map((row) => (
                <div
                  key={row.name}
                  className="rounded-xl border border-slate-100 p-4 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">
                        {row.name}
                      </p>

                      {row.department ? (
                        <p className="mt-1 text-sm text-slate-500">
                          {row.department}
                        </p>
                      ) : null}
                    </div>

                    <p className="text-lg font-bold text-violet-500">
                      {row.count}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {modal.type === "activity" && (
            <div className="space-y-4">
              {modal.rows.map((row) => (
                <div
                  key={`${row.time}-${row.icon}-${row.text}`}
                  className="grid grid-cols-[80px_minmax(0,1fr)] gap-3 rounded-xl border border-slate-100 p-4 dark:border-slate-800"
                >
                  <span className="text-sm font-semibold text-slate-500">
                    {row.time}
                  </span>

                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    {row.icon} {row.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {modal.type === "insights" && (
            <ul className="space-y-4">
              {modal.rows.map((insight) => (
                <li
                  key={insight}
                  className="flex gap-3 rounded-xl border border-slate-100 p-4 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-200"
                >
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                  {insight}
                </li>
              ))}
            </ul>
          )}

          {modal.type === "attention" && (
            <div className="space-y-4">
              {modal.rows.map((alert) => (
                <div
                  key={alert.id || alert.message || alert.text}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/60 dark:bg-amber-950/30"
                >
                  <p className="font-bold text-amber-800 dark:text-amber-200">
                    {alert.title || "Needs attention"}
                  </p>

                  <p className="mt-2 text-amber-700 dark:text-amber-300">
                    {alert.message || alert.text}
                  </p>

                  {alert.description ? (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      {alert.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardTab({
  appointments,
  dashboardData,
  statusSummary,
  filters,
  onFilterChange,
  onClearFilters,
  departmentFilterOptions,
  doctorFilterOptions,
  loading,
  filteredAppointments,
  paginatedAppointments,
  pagination,
  actions,
  onRefresh,
  onAddBooking,
}) {
  const [viewAllModal, setViewAllModal] = useState(null);
  const [showBookingList, setShowBookingList] = useState(false);

  const closeViewAllModal = () => {
    setViewAllModal(null);
  };

  return (
    <>
      <AppointmentListLauncher
        appointments={appointments}
        filteredAppointments={filteredAppointments}
        filters={filters}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
        onAddBooking={onAddBooking}
        onOpenList={() => setShowBookingList(true)}
        onRefresh={onRefresh}
        loading={loading}
      />
      <AppointmentStatusOverview
        appointments={appointments}
        statusSummary={statusSummary}
        typeSummarySlot={
          <TypeSummary
            rows={dashboardData.typeRows}
          />
        }
        aiSummarySlot={
          <EllySummary
            insights={dashboardData.aiInsights}
            onViewAll={() =>
              setViewAllModal({
                title: "Elly AI Summary",
                type: "insights",
                rows: dashboardData.aiInsights,
              })
            }
          />
        }
      />

      <div className="mb-6 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <CountRows
          title="Department Load Today"
          rows={dashboardData.departmentRows}
          className="min-h-[220px]"
          onViewAll={() =>
            setViewAllModal({
              title: "Department Load Today",
              type: "countRows",
              rows: dashboardData.departmentRows,
            })
          }
        />

        <CountRows
          title="Doctor Workload Today"
          rows={dashboardData.doctorRows}
          className="min-h-[220px]"
          subKey="department"
          onViewAll={() =>
            setViewAllModal({
              title: "Doctor Workload Today",
              type: "countRows",
              rows: dashboardData.doctorRows,
            })
          }
        />
      </div>
      {showBookingList && (
        <AppointmentBookingListModal
          loading={loading}
          filters={filters}
          onFilterChange={onFilterChange}
          onClearFilters={onClearFilters}
          departmentFilterOptions={departmentFilterOptions}
          doctorFilterOptions={doctorFilterOptions}
          filteredAppointments={filteredAppointments}
          paginatedAppointments={paginatedAppointments}
          pagination={pagination}
          actions={actions}
          onClose={() => setShowBookingList(false)}
        />
      )}

      <ViewAllModal modal={viewAllModal} onClose={closeViewAllModal} />
    </>
  );
}

