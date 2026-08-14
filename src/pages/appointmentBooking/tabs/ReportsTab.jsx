import { useMemo, useState } from "react";
import useReportData from "../hooks/useReportData";
import useAppointmentAnalyticsQuery from "../hooks/useAppointmentAnalyticsQuery";
import { adaptReportsResponse } from "../adapters/appointmentAnalyticsAdapters";
import {
  addDays,
  getDepartmentName,
  getDoctorName,
  getLocalDateKey,
} from "../utils/appointmentHelpers";

const cardClass =
  "appointment-card";
const DETAIL_ROW_LIMIT = 3;

const reportLabels = {
  SUMMARY: "Appointment Summary",
  DAILY: "Daily Appointment Report",
  WEEKLY: "Weekly Appointment Report",
  MONTHLY: "Monthly Appointment Report",
  CANCELLATION: "Cancellation Report",
};
const REPORT_TABLE_TABS = [
  { key: "department", label: "Department Report" },
  { key: "doctor", label: "Doctor Report" },
  { key: "activity", label: "Audit / Activity Log" },
];

function createInitialFilters() {
  const today = new Date();
  return {
    reportType: "SUMMARY",
    startDate: getLocalDateKey(addDays(today, -30)),
    endDate: getLocalDateKey(today),
    department: "ALL",
    doctor: "ALL",
    status: "ALL",
    type: "ALL",
  };
}

function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    report: (
      <>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M14 3v4h4M9 12h6M9 16h6M9 8h2" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m9 9 6 6M15 9l-6 6" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3 3 0 0 1 0 5.8M17 14c2.3.5 4 2.5 4 5" />
      </>
    ),
    building: (
      <>
        <path d="M4 21V5l8-3 8 3v16M2 21h20M8 8h2M14 8h2M8 12h2M14 12h2M10 21v-5h4v5" />
      </>
    ),
    doctor: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M5 21c0-4 3.1-7 7-7s7 3 7 7M17 13v4M15 15h4" />
      </>
    ),
    audit: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 3v3h6V3M9 11h6M9 15h4" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
      </>
    ),
    print: (
      <>
        <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v7H6z" />
      </>
    ),
    sparkle: (
      <>
        <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" />
        <path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200";

function MetricCard({ label, value }) {
  return (
    <div className={`${cardClass} flex min-h-[104px] flex-col justify-between p-4`}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="text-3xl font-bold leading-none text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}
function Section({ title, icon, children, count, action }) {
  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
            <Icon name={icon} className="h-4 w-4" />
          </span>
          <h2 className="font-bold text-slate-900 dark:text-white">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {typeof count === "number" && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              {count}
            </span>
          )}
          {action}
        </div>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }) {
  return (
    <p className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
      {children}
    </p>
  );
}

function ActionPill({ action }) {
  const style =
    action === "Canceled"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
      : action === "Completed"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
        : action === "Updated"
          ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
          : "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>
      {action}
    </span>
  );
}
function DetailButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-semibold text-violet-600 hover:text-violet-500"
    >
      View all
    </button>
  );
}

function ReportTableTabs({ activeTab, onChange }) {
  const activeIndex = Math.max(
    0,
    REPORT_TABLE_TABS.findIndex((tab) => tab.key === activeTab),
  );

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white/70 shadow-sm dark:border-slate-800 dark:bg-slate-950/30">
      <div
        className="relative grid grid-flow-col auto-cols-fr overflow-hidden p-1"
        style={{
          "--active-tab-index": activeIndex,
          "--tab-count": REPORT_TABLE_TABS.length,
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 left-1 top-1 z-0 rounded-lg border border-violet-400/50 bg-violet-500/15 shadow-[0_8px_18px_rgba(139,92,246,0.18)] transition-transform duration-300 ease-out dark:border-violet-500/35 dark:bg-violet-500/20"
          style={{
            width: "calc((100% - 0.5rem) / var(--tab-count))",
            transform: "translateX(calc(var(--active-tab-index) * 100%))",
          }}
        />
        {REPORT_TABLE_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`relative z-10 flex min-w-0 items-center justify-center rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors duration-200 ${
                isActive
                  ? "text-violet-700 dark:text-violet-200"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
function ReportDetailModal({ modal, onClose, onView }) {
  if (!modal) return null;

  return (
    <div className="fixed inset-y-20 left-4 right-4 z-50 flex items-start justify-center bg-black/45 px-0 py-4 backdrop-blur-sm xl:bottom-8 xl:left-[246px] xl:right-[310px] xl:top-28">
      <div className="flex max-h-full w-full max-w-[1120px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              {modal.title}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {modal.rows.length} row{modal.rows.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {modal.type === "department" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/30">
                    <th className="px-5 py-3">Department</th>
                    <th className="px-3 py-3">Total</th>
                    <th className="px-3 py-3">Booked</th>
                    <th className="px-3 py-3">Completed</th>
                    <th className="px-3 py-3">Canceled</th>
                    <th className="px-3 py-3">No-show</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {modal.rows.map((row) => (
                    <tr key={row.department} className="text-slate-700 dark:text-slate-200">
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{row.department}</td>
                      <td className="px-3 py-3">{row.total}</td>
                      <td className="px-3 py-3">{row.booked}</td>
                      <td className="px-3 py-3">{row.completed}</td>
                      <td className="px-3 py-3">{row.cancelled}</td>
                      <td className="px-3 py-3">{row.noShow}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {modal.type === "doctor" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/30">
                    <th className="px-5 py-3">Doctor</th>
                    <th className="px-3 py-3">Department</th>
                    <th className="px-3 py-3">Total</th>
                    <th className="px-3 py-3">Completed</th>
                    <th className="px-3 py-3">Canceled</th>
                    <th className="px-3 py-3">No-show</th>
                    <th className="px-3 py-3">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {modal.rows.map((row) => (
                    <tr key={row.doctor} className="text-slate-700 dark:text-slate-200">
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{row.doctor}</td>
                      <td className="px-3 py-3">{row.department}</td>
                      <td className="px-3 py-3">{row.total}</td>
                      <td className="px-3 py-3">{row.completed}</td>
                      <td className="px-3 py-3">{row.cancelled}</td>
                      <td className="px-3 py-3">{row.noShow}</td>
                      <td className="px-3 py-3">{row.active}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {modal.type === "activity" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/30">
                    <th className="px-5 py-3">Time</th>
                    <th className="px-3 py-3">Action</th>
                    <th className="px-3 py-3">Appointment</th>
                    <th className="px-3 py-3">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {modal.rows.map((row) => (
                    <tr
                      key={row.id || `${row.appointmentId}-${row.time}`}
                      onClick={() => onView(row.appointment)}
                      className="cursor-pointer text-slate-700 hover:bg-violet-50/50 dark:text-slate-200 dark:hover:bg-violet-500/5"
                    >
                      <td className="px-5 py-3">{row.time}</td>
                      <td className="px-3 py-3"><ActionPill action={row.action} /></td>
                      <td className="px-3 py-3 font-mono text-xs">{row.appointmentId}</td>
                      <td className="px-3 py-3">{row.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function escapeCsv(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function ReportsTab({ appointments, loading, onView }) {
  const [draftFilters, setDraftFilters] = useState(createInitialFilters);
  const [reportFilters, setReportFilters] = useState(createInitialFilters);
  const [generatedAt, setGeneratedAt] = useState(() => new Date());
  const [detailModal, setDetailModal] = useState(null);
  const [activeReportTable, setActiveReportTable] = useState("department");
  const [isReportGeneratorOpen, setIsReportGeneratorOpen] = useState(false);
  const fallbackReport = useReportData(appointments, reportFilters);
  const { data, loading: queryLoading } = useAppointmentAnalyticsQuery("reports", {
    from: reportFilters.startDate ? `${reportFilters.startDate}T00:00:00.000` : "",
    to: reportFilters.endDate ? `${reportFilters.endDate}T23:59:59.999` : "",
    status: reportFilters.status === "ALL" ? "" : reportFilters.status,
    consultationType: reportFilters.type === "ALL" ? "" : reportFilters.type,
  });
  const report = data ? adaptReportsResponse(data) : fallbackReport;

  const departmentOptions = useMemo(
    () =>
      [
        ...new Set(
          [...appointments.map(getDepartmentName), ...report.departmentRows.map((row) => row.department)]
            .filter((value) => value && value !== "N/A"),
        ),
      ].sort(),
    [appointments, report.departmentRows],
  );
  const doctorOptions = useMemo(
    () =>
      [
        ...new Set(
          [...appointments.map(getDoctorName), ...report.doctorRows.map((row) => row.doctor)]
            .filter((value) => value && value !== "N/A"),
        ),
      ].sort(),
    [appointments, report.doctorRows],
  );

  const updateFilter = (event) =>
    setDraftFilters((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  const generateReport = () => {
    if (
      draftFilters.startDate &&
      draftFilters.endDate &&
      draftFilters.startDate > draftFilters.endDate
    ) {
      window.alert("The start date must be before the end date.");
      return;
    }
    setReportFilters({ ...draftFilters });
    setGeneratedAt(new Date());
  };

  const exportCsv = () => {
    const rows = [
      ["Appointment Booking Report"],
      ["Report Type", reportLabels[reportFilters.reportType]],
      ["Date Range", reportFilters.startDate, reportFilters.endDate],
      [],
      [
        "Department",
        "Total",
        "Booked",
        "Completed",
        "Canceled",
        "No-show",
      ],
      ...report.departmentRows.map((row) => [
        row.department,
        row.total,
        row.booked,
        row.completed,
        row.cancelled,
        row.noShow,
      ]),
      [],
      [
        "Doctor",
        "Department",
        "Total",
        "Completed",
        "Canceled",
        "No-show",
        "Active Bookings",
      ],
      ...report.doctorRows.map((row) => [
        row.doctor,
        row.department,
        row.total,
        row.completed,
        row.cancelled,
        row.noShow,
        row.active,
      ]),
      [],
      [
        "Canceled Patient",
        "Patient ID",
        "Doctor",
        "Department",
        "Original Time",
        "Reason",
      ],
      ...report.cancelledRows.map((row) => [
        row.patient,
        row.patientId,
        row.doctor,
        row.department,
        row.originalTime,
        row.reason,
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `appointment-report-${reportFilters.startDate}-${reportFilters.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading || queryLoading)
    return (
      <div className={`${cardClass} p-10 text-center text-sm text-slate-500`}>
        Preparing report data
      </div>
    );


  return (
    <div data-appointment-report>
      <div className="mb-5">
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Last generated {generatedAt.toLocaleString()}
        </p>
      </div>

      <section data-report-controls className={`${cardClass} mb-5 overflow-hidden`}>
        <button
          type="button"
          onClick={() => setIsReportGeneratorOpen((open) => !open)}
          aria-expanded={isReportGeneratorOpen}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
              <Icon name="report" className="h-4 w-4" />
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              Report Generator
            </span>
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-6 w-6 shrink-0 text-slate-500 transition-transform duration-300 dark:text-slate-300 ${
              isReportGeneratorOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            isReportGeneratorOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="grid grid-cols-1 gap-3 px-5 pb-5 pt-1 md:grid-cols-2 2xl:grid-cols-4">
              <Field label="Report Type">
                <select
                  name="reportType"
                  value={draftFilters.reportType}
                  onChange={updateFilter}
                  className={inputClass}
                >
                  {Object.entries(reportLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Start Date">
                <input
                  type="date"
                  name="startDate"
                  value={draftFilters.startDate}
                  onChange={updateFilter}
                  className={inputClass}
                />
              </Field>
              <Field label="End Date">
                <input
                  type="date"
                  name="endDate"
                  value={draftFilters.endDate}
                  onChange={updateFilter}
                  className={inputClass}
                />
              </Field>
              <Field label="Department">
                <select
                  name="department"
                  value={draftFilters.department}
                  onChange={updateFilter}
                  className={inputClass}
                >
                  <option value="ALL">All departments</option>
                  {departmentOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </Field>
              <Field label="Doctor">
                <select
                  name="doctor"
                  value={draftFilters.doctor}
                  onChange={updateFilter}
                  className={inputClass}
                >
                  <option value="ALL">All doctors</option>
                  {doctorOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  name="status"
                  value={draftFilters.status}
                  onChange={updateFilter}
                  className={inputClass}
                >
                  <option value="ALL">All statuses</option>
                  <option value="BOOKED">Booked</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELED">Canceled</option>
                  <option value="NO_SHOW">No-show</option>
                </select>
              </Field>
              <Field label="Appointment Type">
                <select
                  name="type"
                  value={draftFilters.type}
                  onChange={updateFilter}
                  className={inputClass}
                >
                  <option value="ALL">All types</option>
                  <option value="IN_PERSON">In person</option>
                  <option value="ONLINE">Online</option>
                  <option value="PHONE">Phone</option>
                </select>
              </Field>
              <div className="flex flex-wrap items-end gap-2">
                <button
                  type="button"
                  onClick={generateReport}
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700"
                >
                  <Icon name="report" className="h-4 w-4" />
                  Generate
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={report.metrics.total === 0}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-300 px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/30"
                >
                  <Icon name="print" className="h-4 w-4" />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={report.metrics.total === 0}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-300 px-3 py-2 text-sm font-bold text-emerald-600 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                >
                  <Icon name="download" className="h-4 w-4" />
                  CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Total Appointments" value={report.metrics.total} />
          <MetricCard label="Booked" value={report.metrics.booked} />
          <MetricCard label="Completed" value={report.metrics.completed} />
          <MetricCard label="Canceled" value={report.metrics.cancelled} />
          <MetricCard label="No-show" value={report.metrics.noShow} />
        </div>

        <Section
          title="Report Insights"
          icon="sparkle"
          count={report.insights.length}
        >
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
            {report.insights.map((insight) => {
              const style =
                insight.tone === "red"
                  ? "bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
                  : insight.tone === "green"
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                    : insight.tone === "amber"
                      ? "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                      : insight.tone === "violet"
                        ? "bg-violet-50 text-violet-800 dark:bg-violet-950/30 dark:text-violet-200"
                        : "bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200";
              return (
                <div
                  key={insight.text}
                  className={`rounded-xl p-4 text-sm font-medium ${style}`}
                >
                  {insight.text}
                </div>
              );
            })}
          </div>
        </Section>
      </div>
      <div className="mt-5">
        <ReportTableTabs
          activeTab={activeReportTable}
          onChange={setActiveReportTable}
        />

        {activeReportTable === "department" && (
          <Section
            title="Department Report"
            icon="building"
            count={report.departmentRows.length}
            action={
              <DetailButton
                onClick={() =>
                  setDetailModal({
                    title: "Department Report",
                    type: "department",
                    rows: report.departmentRows,
                  })
                }
              />
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/30">
                    <th className="px-5 py-3">Department</th>
                    <th className="px-3 py-3">Total</th>
                    <th className="px-3 py-3">Booked</th>
                    <th className="px-3 py-3">Completed</th>
                    <th className="px-3 py-3">Canceled</th>
                    <th className="px-3 py-3">No-show</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {report.departmentRows.slice(0, DETAIL_ROW_LIMIT).map((row) => (
                    <tr
                      key={row.department}
                      className="text-slate-700 dark:text-slate-200"
                    >
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">
                        {row.department}
                      </td>
                      <td className="px-3 py-3">{row.total}</td>
                      <td className="px-3 py-3">{row.booked}</td>
                      <td className="px-3 py-3">{row.completed}</td>
                      <td className="px-3 py-3">{row.cancelled}</td>
                      <td className="px-3 py-3">{row.noShow}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.departmentRows.length === 0 && (
                <Empty>No department results.</Empty>
              )}
            </div>
          </Section>
        )}

        {activeReportTable === "doctor" && (
          <Section
            title="Doctor Report"
            icon="doctor"
            count={report.doctorRows.length}
            action={
              <DetailButton
                onClick={() =>
                  setDetailModal({
                    title: "Doctor Report",
                    type: "doctor",
                    rows: report.doctorRows,
                  })
                }
              />
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/30">
                    <th className="px-5 py-3">Doctor</th>
                    <th className="px-3 py-3">Department</th>
                    <th className="px-3 py-3">Total</th>
                    <th className="px-3 py-3">Completed</th>
                    <th className="px-3 py-3">Canceled</th>
                    <th className="px-3 py-3">No-show</th>
                    <th className="px-3 py-3">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {report.doctorRows.slice(0, DETAIL_ROW_LIMIT).map((row) => (
                    <tr
                      key={row.doctor}
                      className="text-slate-700 dark:text-slate-200"
                    >
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">
                        {row.doctor}
                      </td>
                      <td className="px-3 py-3">{row.department}</td>
                      <td className="px-3 py-3">{row.total}</td>
                      <td className="px-3 py-3">{row.completed}</td>
                      <td className="px-3 py-3">{row.cancelled}</td>
                      <td className="px-3 py-3">{row.noShow}</td>
                      <td className="px-3 py-3">{row.active}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.doctorRows.length === 0 && (
                <Empty>No doctor results.</Empty>
              )}
            </div>
          </Section>
        )}

        {activeReportTable === "activity" && (
          <Section
            title="Audit / Activity Log"
            icon="audit"
            count={report.activityRows.length}
            action={
              <DetailButton
                onClick={() =>
                  setDetailModal({
                    title: "Audit / Activity Log",
                    type: "activity",
                    rows: report.activityRows,
                  })
                }
              />
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/30">
                    <th className="px-5 py-3">Time</th>
                    <th className="px-3 py-3">Action</th>
                    <th className="px-3 py-3">Appointment</th>
                    <th className="px-3 py-3">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {report.activityRows.slice(0, DETAIL_ROW_LIMIT).map((row) => (
                    <tr
                      key={row.id || `${row.appointmentId}-${row.time}`}
                      onClick={() => onView(row.appointment)}
                      className="cursor-pointer text-slate-700 hover:bg-violet-50/50 dark:text-slate-200 dark:hover:bg-violet-500/5"
                    >
                      <td className="px-5 py-3">{row.time}</td>
                      <td className="px-3 py-3">
                        <ActionPill action={row.action} />
                      </td>
                      <td className="px-3 py-3 font-mono text-xs">
                        {row.appointmentId}
                      </td>
                      <td className="px-3 py-3">{row.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.activityRows.length === 0 && (
                <Empty>No activity in this report.</Empty>
              )}
            </div>
          </Section>
        )}
      </div>
      <ReportDetailModal
        modal={detailModal}
        onClose={() => setDetailModal(null)}
        onView={onView}
      />
    </div>
  );
}

