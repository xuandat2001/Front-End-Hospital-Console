import { useState } from "react";
import usePlanningData from "../hooks/usePlanningData";
import { getInitials } from "../utils/appointmentHelpers";

const cardClass = "appointment-card";
const DETAIL_ROW_LIMIT = 3;

const PLANNING_TABLE_TABS = [
  { key: "schedule", label: "Upcoming Schedule" },
  { key: "demand", label: "Department Demand" },
  { key: "capacity", label: "Doctor Capacity" },
  { key: "slots", label: "Time Slots" },
  { key: "recovery", label: "Cancellation Recovery" },
];

function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M6.1 9a7 7 0 0 1 11.8-2L20 12M4 12l2.1 5a7 7 0 0 0 11.8-2" />
      </>
    ),
    sparkle: (
      <>
        <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14ZM5 14l.7 1.3L7 16l-1.3.7L5 18l-.7-1.3L3 16l1.3-.7L5 14Z" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3 3 0 0 1 0 5.8M17 14c2.3.5 4 2.5 4 5" />
      </>
    ),
    arrow: <path d="m9 18 6-6-6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
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

function Section({ title, icon, children, className = "", action }) {
  return (
    <section className={`${cardClass} overflow-hidden ${className}`}>
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
            <Icon name={icon} className="h-4 w-4" />
          </span>
          <h2 className="font-bold text-slate-900 dark:text-white">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetricCard({ title, value }) {
  return (
    <div
      className={`${cardClass} flex min-h-[104px] flex-col justify-between p-4`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <p className="text-3xl font-bold leading-none text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}
function Empty({ children }) {
  return (
    <p className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
      {children}
    </p>
  );
}

function TypePill({ type }) {
  const style =
    type === "ONLINE"
      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
      : type === "PHONE"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
        : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${style}`}
    >
      {type.replaceAll("_", " ")}
    </span>
  );
}

function RiskPill({ risk }) {
  const style =
    risk === "High load"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
      : risk === "Near capacity"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${style}`}
    >
      {risk}
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

function PlanningTableTabs({ activeTab, onChange }) {
  const activeIndex = Math.max(
    0,
    PLANNING_TABLE_TABS.findIndex((tab) => tab.key === activeTab),
  );

  return (
    <div className="mb-4 overflow-hidden rounded-x1 border border-slate-200 bg-white/70 shadow-sm dark:border-slate-800 dark:bg-slate-950/30">
      <div
        className="relative grid grid-flow-col auto-cols-fr overflow-hidden p-1"
        style={{
          "--active-tab-index": activeIndex,
          "--tab-count": PLANNING_TABLE_TABS.length,
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
        {PLANNING_TABLE_TABS.map((tab) => {
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
function PlanningDetailModal({ modal, onClose, onView, onUpdate }) {
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
          {modal.type === "upcoming" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950/30 dark:text-slate-400">
                    <th className="px-5 py-3">Time</th>
                    <th className="px-3 py-3">Patient</th>
                    <th className="px-3 py-3">Doctor</th>
                    <th className="px-3 py-3">Department</th>
                    <th className="px-3 py-3">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {modal.rows.map((row) => (
                    <tr
                      key={row.appointment._id || `${row.patient}-${row.time}`}
                      onClick={() => onView(row.appointment)}
                      className="cursor-pointer text-slate-700 transition hover:bg-violet-50/50 dark:text-slate-200 dark:hover:bg-violet-500/5"
                    >
                      <td className="px-5 py-3">
                        <p className="font-semibold">{row.dateLabel}</p>
                        <p className="text-xs text-slate-500">{row.time}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                            {getInitials(row.patient)}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {row.patient}
                            </p>
                            <p className="text-xs text-slate-500">
                              {row.patientId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">{row.doctor}</td>
                      <td className="px-3 py-3">{row.department}</td>
                      <td className="px-3 py-3">
                        <TypePill type={row.type} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {modal.type === "demand" && (
            <div className="space-y-4">
              {modal.rows.map((row) => (
                <div
                  key={row.name}
                  className="grid grid-cols-[160px_minmax(0,1fr)_42px] items-center gap-3 text-sm"
                >
                  <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
                    {row.name}
                  </span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                      style={{
                        width: `${Math.max(6, (row.count / modal.maxDemand) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-right font-bold text-slate-600 dark:text-slate-300">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          )}

          {modal.type === "doctor" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/30">
                    <th className="px-5 py-3">Doctor</th>
                    <th className="px-3 py-3">Department</th>
                    <th className="px-3 py-3">Next {modal.horizon} days</th>
                    <th className="px-3 py-3">Tomorrow</th>
                    <th className="px-3 py-3">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {modal.rows.map((row) => (
                    <tr
                      key={row.doctor}
                      className="text-slate-700 dark:text-slate-200"
                    >
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">
                        {row.doctor}
                      </td>
                      <td className="px-3 py-3">{row.department}</td>
                      <td className="px-3 py-3">{row.nextDays}</td>
                      <td className="px-3 py-3">{row.tomorrow}</td>
                      <td className="px-3 py-3">
                        <RiskPill risk={row.risk} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {modal.type === "slots" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/30">
                    <th className="px-5 py-3">Time block</th>
                    <th className="px-3 py-3">Bookings</th>
                    <th className="px-3 py-3">Booked time</th>
                    <th className="px-3 py-3">Available time</th>
                    <th className="px-3 py-3">Avg duration</th>
                    <th className="px-3 py-3">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {modal.rows.map((slot) => (
                    <tr key={slot.label}>
                      <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-100">
                        {slot.label}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                        {slot.bookings}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                        {slot.bookedLabel} / {slot.capacityLabel}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                        {slot.availableLabel}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                        {slot.averageDurationLabel}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className={`h-full rounded-full ${
                                slot.utilization >= 85
                                  ? "bg-rose-500"
                                  : slot.utilization >= 65
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                              }`}
                              style={{
                                width: `${Math.max(slot.utilization, 2)}%`,
                              }}
                            />
                          </div>
                          <span
                            className={`w-10 text-right font-bold ${
                              slot.utilization >= 85
                                ? "text-rose-600"
                                : slot.utilization >= 65
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                            }`}
                          >
                            {slot.utilization}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {modal.type === "recovery" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/30">
                    <th className="px-5 py-3">Patient</th>
                    <th className="px-3 py-3">Department</th>
                    <th className="px-3 py-3">Original time</th>
                    <th className="px-3 py-3">Suggested action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {modal.rows.map((row) => (
                    <tr
                      key={
                        row.appointment._id ||
                        `${row.patient}-${row.originalTime}`
                      }
                      className="text-slate-700 dark:text-slate-200"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                            {getInitials(row.patient)}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {row.patient}
                            </p>
                            <p className="text-xs text-slate-500">
                              {row.patientId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">{row.department}</td>
                      <td className="px-3 py-3">{row.originalTime}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onView(row.appointment)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            Review
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdate(row.appointment)}
                            className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700"
                          >
                            Reschedule <Icon name="arrow" className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
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

export default function PlanningTab({
  appointments,
  loading,
  onView,
  onUpdate,
}) {
  const [horizon, setHorizon] = useState(7);
  const [department, setDepartment] = useState("ALL");
  const [detailModal, setDetailModal] = useState(null);
  const [activePlanningTable, setActivePlanningTable] = useState("schedule");
  const planning = usePlanningData(appointments, horizon, department);

  const controls = (
    <div className="flex flex-nowrap justify-end gap-2">
      <select
        value={department}
        onChange={(event) => setDepartment(event.target.value)}
        className="w-[200px] rounded-xl border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        <option value="ALL">All departments</option>
        {planning.departmentOptions.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>

      <select
        value={horizon}
        onChange={(event) => setHorizon(Number(event.target.value))}
        className="w-[130px] rounded-xl border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        <option value={7}>Next 7 days</option>
        <option value={14}>Next 14 days</option>
        <option value={30}>Next 30 days</option>
      </select>
    </div>
  );
  if (loading)
    return (
      <div className={`${cardClass} p-10 text-center text-sm text-slate-500`}>
        Building the capacity plan
      </div>
    );

  return (
    <div data-appointment-planning>
      <div className="mb-4 flex justify-end">{controls}</div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            title="Upcoming Bookings"
            value={planning.metrics.upcoming}
          />
          <MetricCard
            title="Tomorrow's Appointments"
            value={planning.metrics.tomorrow}
          />
          <MetricCard
            title={`${horizon}-Day Demand`}
            value={planning.metrics.demand}
          />
          <MetricCard
            title="Canceled to Recover"
            value={planning.metrics.recoverable}
          />
        </div>

        <Section
          title="Elly Planning Recommendations"
          icon="sparkle"
          className="h-full"
        >
          <ul className="space-y-1 p-4">
            {planning.recommendations.map((recommendation) => (
              <li
                key={recommendation}
                className="flex gap-3 rounded-xl px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15">
                  <Icon name="check" className="h-3.5 w-3.5" />
                </span>
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
      <div>
        <PlanningTableTabs
          activeTab={activePlanningTable}
          onChange={setActivePlanningTable}
        />

        {activePlanningTable === "schedule" && (
          <Section
            title="Upcoming Schedule Timeline"
            icon="calendar"
            action={
              <DetailButton
                onClick={() =>
                  setDetailModal({
                    title: "Upcoming Schedule Timeline",
                    type: "upcoming",
                    rows: planning.upcomingSchedule,
                  })
                }
              />
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950/30 dark:text-slate-400">
                    <th className="px-5 py-3">Time</th>
                    <th className="px-3 py-3">Patient</th>
                    <th className="px-3 py-3">Doctor</th>
                    <th className="px-3 py-3">Department</th>
                    <th className="px-3 py-3">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {planning.upcomingSchedule
                    .slice(0, DETAIL_ROW_LIMIT)
                    .map((row) => (
                      <tr
                        key={
                          row.appointment._id || `${row.patient}-${row.time}`
                        }
                        onClick={() => onView(row.appointment)}
                        className="cursor-pointer text-slate-700 transition hover:bg-violet-50/50 dark:text-slate-200 dark:hover:bg-violet-500/5"
                      >
                        <td className="px-5 py-3">
                          <p className="font-semibold">{row.dateLabel}</p>
                          <p className="text-xs text-slate-500">{row.time}</p>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                              {getInitials(row.patient)}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {row.patient}
                              </p>
                              <p className="text-xs text-slate-500">
                                {row.patientId}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">{row.doctor}</td>
                        <td className="px-3 py-3">{row.department}</td>
                        <td className="px-3 py-3">
                          <TypePill type={row.type} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {planning.upcomingSchedule.length === 0 && (
                <Empty>No upcoming booked appointments in this window.</Empty>
              )}
            </div>
          </Section>
        )}

        {activePlanningTable === "demand" && (
          <Section
            title="Department Demand Forecast"
            icon="chart"
            action={
              <DetailButton
                onClick={() =>
                  setDetailModal({
                    title: "Department Demand Forecast",
                    type: "demand",
                    rows: planning.departmentDemand,
                    maxDemand: planning.maxDemand,
                  })
                }
              />
            }
          >
            <div className="space-y-4 p-5">
              {planning.departmentDemand
                .slice(0, DETAIL_ROW_LIMIT)
                .map((row) => (
                  <div
                    key={row.name}
                    className="grid grid-cols-[120px_minmax(0,1fr)_32px] items-center gap-3 text-sm"
                  >
                    <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
                      {row.name}
                    </span>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                        style={{
                          width: `${Math.max(6, (row.count / planning.maxDemand) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-right font-bold text-slate-600 dark:text-slate-300">
                      {row.count}
                    </span>
                  </div>
                ))}
              {planning.departmentDemand.length === 0 && (
                <Empty>No demand data in this window.</Empty>
              )}
            </div>
          </Section>
        )}

        {activePlanningTable === "capacity" && (
          <Section
            title="Doctor Capacity Plan"
            icon="users"
            action={
              <DetailButton
                onClick={() =>
                  setDetailModal({
                    title: "Doctor Capacity Plan",
                    type: "doctor",
                    rows: planning.doctorCapacity,
                    horizon,
                  })
                }
              />
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/30">
                    <th className="px-5 py-3">Doctor</th>
                    <th className="px-3 py-3">Department</th>
                    <th className="px-3 py-3">Next {horizon} days</th>
                    <th className="px-3 py-3">Tomorrow</th>
                    <th className="px-3 py-3">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {planning.doctorCapacity
                    .slice(0, DETAIL_ROW_LIMIT)
                    .map((row) => (
                      <tr
                        key={row.doctor}
                        className="text-slate-700 dark:text-slate-200"
                      >
                        <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">
                          {row.doctor}
                        </td>
                        <td className="px-3 py-3">{row.department}</td>
                        <td className="px-3 py-3">{row.nextDays}</td>
                        <td className="px-3 py-3">{row.tomorrow}</td>
                        <td className="px-3 py-3">
                          <RiskPill risk={row.risk} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {planning.doctorCapacity.length === 0 && (
                <Empty>No doctor capacity assigned in this window.</Empty>
              )}
            </div>
          </Section>
        )}

        {activePlanningTable === "slots" && (
          <Section
            title="Time Slot Planning"
            icon="clock"
            action={
              <DetailButton
                onClick={() =>
                  setDetailModal({
                    title: "Time Slot Planning",
                    type: "slots",
                    rows: planning.timeSlots,
                  })
                }
              />
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/30">
                    <th className="px-5 py-3">Time block</th>
                    <th className="px-3 py-3">Bookings</th>
                    <th className="px-3 py-3">Booked time</th>
                    <th className="px-3 py-3">Available time</th>
                    <th className="px-3 py-3">Avg duration</th>
                    <th className="px-3 py-3">Utilization</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {planning.timeSlots.slice(0, DETAIL_ROW_LIMIT).map((slot) => (
                    <tr key={slot.label}>
                      <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-100">
                        {slot.label}
                      </td>

                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                        {slot.bookings}
                      </td>

                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                        {slot.bookedLabel} / {slot.capacityLabel}
                      </td>

                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                        {slot.availableLabel}
                      </td>

                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                        {slot.averageDurationLabel}
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className={`h-full rounded-full ${
                                slot.utilization >= 85
                                  ? "bg-rose-500"
                                  : slot.utilization >= 65
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                              }`}
                              style={{
                                width: `${Math.max(slot.utilization, 2)}%`,
                              }}
                            />
                          </div>

                          <span
                            className={`w-10 text-right font-bold ${
                              slot.utilization >= 85
                                ? "text-rose-600"
                                : slot.utilization >= 65
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                            }`}
                          >
                            {slot.utilization}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {planning.timeSlots.length === 0 && (
                <Empty>No slot utilization in this window.</Empty>
              )}
            </div>
          </Section>
        )}

        {activePlanningTable === "recovery" && (
          <Section
            title="Cancellation Recovery Plan"
            icon="refresh"
            action={
              <DetailButton
                onClick={() =>
                  setDetailModal({
                    title: "Cancellation Recovery Plan",
                    type: "recovery",
                    rows: planning.recoveryRows,
                  })
                }
              />
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/30">
                    <th className="px-5 py-3">Patient</th>
                    <th className="px-3 py-3">Department</th>
                    <th className="px-3 py-3">Original time</th>
                    <th className="px-3 py-3">Suggested action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {planning.recoveryRows
                    .slice(0, DETAIL_ROW_LIMIT)
                    .map((row) => (
                      <tr
                        key={
                          row.appointment._id ||
                          `${row.patient}-${row.originalTime}`
                        }
                        className="text-slate-700 dark:text-slate-200"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                              {getInitials(row.patient)}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {row.patient}
                              </p>
                              <p className="text-xs text-slate-500">
                                {row.patientId}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">{row.department}</td>
                        <td className="px-3 py-3">{row.originalTime}</td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => onView(row.appointment)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              Review
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdate(row.appointment)}
                              className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700"
                            >
                              Reschedule{" "}
                              <Icon name="arrow" className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {planning.recoveryRows.length === 0 && (
                <Empty>No cancelled appointments to recover.</Empty>
              )}
            </div>
          </Section>
        )}
      </div>
      <PlanningDetailModal
        modal={detailModal}
        onClose={() => setDetailModal(null)}
        onView={onView}
        onUpdate={onUpdate}
      />
    </div>
  );
}

