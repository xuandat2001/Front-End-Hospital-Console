import { useState } from "react";
import MiniPieChart from "../../../components/graphs/MiniPieChart";
import usePerformanceData from "../hooks/usePerformanceData";
import useAppointmentAnalyticsQuery from "../hooks/useAppointmentAnalyticsQuery";
import { adaptPerformanceResponse } from "../adapters/appointmentAnalyticsAdapters";
import { addDays, getLocalDateKey } from "../utils/appointmentHelpers";

const cardClass = "appointment-card min-w-0 p-5";

const titleClass = "font-bold text-slate-950 dark:text-white";
const mutedTextClass = "text-slate-500 dark:text-slate-400";
const PERFORMANCE_TABLE_TABS = [
  { key: "department", label: "Department Performance" },
  { key: "doctor", label: "Doctor Performance" },
];

function getPerformanceRange(days) {
  const today = new Date();

  return {
    start: getLocalDateKey(addDays(today, -(days - 1))),
    end: getLocalDateKey(today),
  };
}

function PerformancePeriodSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-[150px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 shadow-sm"
    >
      <option value={7}>Last 7 days</option>
      <option value={14}>Last 14 days</option>
      <option value={30}>Last 30 days</option>
    </select>
  );
}

function TotalAppointmentsCard({ value }) {
  return (
    <div className={`${cardClass} min-h-[128px]`}>
      <p className={`text-sm font-semibold ${mutedTextClass}`}>
        Total Appointments
      </p>
      <p className="mt-4 text-4xl font-bold leading-none text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}
function SimpleBar({ value, max, label, amount, variant = "purple" }) {
  const width = max > 0 ? Math.max(8, (value / max) * 100) : 0;

  const colorClass =
    variant === "green"
      ? "bg-emerald-500"
      : variant === "blue"
        ? "bg-blue-500"
        : variant === "red"
          ? "bg-red-500"
          : "bg-violet-500";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {label}
        </span>

        <span className={mutedTextClass}>{amount}</span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function StatusBreakdown({ performance }) {
  const total = Math.max(performance.total, 1);

  const rows = [
    {
      label: "BOOKED",
      value: performance.booked,
      color: "#22C55E",
      dotClass: "bg-emerald-500",
      textClass: "text-emerald-500",
    },
    {
      label: "COMPLETED",
      value: performance.completed,
      color: "#3B82F6",
      dotClass: "bg-blue-500",
      textClass: "text-blue-500",
    },
    {
      label: "NO_SHOW",
      value: performance.noShow,
      color: "#F97316",
      dotClass: "bg-orange-500",
      textClass: "text-orange-500",
    },
    {
      label: "CANCELED",
      value: performance.cancelled,
      color: "#EF4444",
      dotClass: "bg-rose-500",
      textClass: "text-rose-500",
    },
  ];
  const chartSlices = performance.total
    ? rows.map(({ label, value, color }) => ({ label, value, color }))
    : [{ label: "No appointments", value: 1, color: "#334155" }];

  return (
    <div className={`${cardClass} flex h-full flex-col`}>
      <h3 className="text-xl font-bold leading-tight text-slate-950 dark:text-white">
        Appointment Status
        <br />
        Breakdown
      </h3>

      <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-4">
        <MiniPieChart
          slices={chartSlices}
          centerLabel={`${performance.total}\nTotal`}
          showLegend={false}
        />

        <div className="w-full max-w-sm space-y-2.5">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-2 text-sm"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`h-3.5 w-3.5 shrink-0 rounded-full ${row.dotClass}`}
                />
                <span className="truncate font-semibold tracking-wide text-slate-700 dark:text-slate-200">
                  {row.label}
                </span>
              </div>

              <span className={`shrink-0 text-base font-bold ${row.textClass}`}>
                {Math.round((row.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AppointmentBarChart({ data, maxValue }) {
  const topValue = Math.max(3, maxValue);
  const ticks = [
    topValue,
    Math.ceil(topValue * 0.66),
    Math.ceil(topValue * 0.33),
    0,
  ].filter((value, index, array) => array.indexOf(value) === index);

  return (
    <div className="min-w-max">
      <div className="grid h-44 grid-cols-[44px_minmax(0,1fr)]">
        {/* Y axis */}
        <div className="flex flex-col justify-between pr-3 text-xs font-semibold text-slate-400 dark:text-slate-500">
          {ticks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>

        {/* Chart area */}
        <div className="relative border-b border-slate-300 dark:border-slate-700">
          {/* Grid lines */}
          {ticks.map((tick) => (
            <div
              key={tick}
              className="absolute left-0 right-0 border-t border-dashed border-slate-300/60 dark:border-slate-700/80"
              style={{
                bottom: `${(tick / topValue) * 100}%`,
              }}
            />
          ))}

          {/* Bars */}
          <div className="pointer-events-none relative z-10 flex h-full gap-4">
            {data.map((row) => {
              const height = row.count > 0 ? (row.count / topValue) * 100 : 0;

              return (
                <div
                  key={row.key}
                  className="relative flex h-full w-[64px] shrink-0 select-none items-end justify-center"
                  title={`${row.tooltipLabel}: ${row.count} appointments`}
                >
                  {row.count > 0 ? (
                    <div
                      className="w-8 rounded-t-xl bg-violet-500 shadow-[0_0_18px_rgba(139,92,246,0.45)]"
                      style={{
                        height: `${Math.max(10, height)}%`,
                      }}
                    />
                  ) : (
                    <div className="mb-1 h-2 w-8 rounded-full bg-slate-500/60 dark:bg-slate-700" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* X axis labels - same column width and same gap as bars */}
      <div className="mt-4 grid grid-cols-[44px_minmax(0,1fr)]">
        <div />

        <div className="flex gap-4 text-center text-xs">
          {data.map((row) => (
            <div key={row.key} className="w-[64px] shrink-0">
              <p className="font-semibold text-slate-400 dark:text-slate-500">
                {row.label}
              </p>

              <p
                className={`mt-2 font-bold ${
                  row.count > 0
                    ? "text-violet-400"
                    : "text-slate-500 dark:text-slate-600"
                }`}
              >
                {row.count}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DailyTrendCard({ performance }) {
  const title =
    performance.trendDisplayMode === "weekly"
      ? "Weekly Appointment Volume"
      : performance.trendDisplayMode === "monthly"
        ? "Monthly Appointment Volume"
        : "Daily Appointment Volume";

  const subtitle =
    performance.trendDisplayMode === "weekly"
      ? "Grouped by 7-day periods"
      : performance.trendDisplayMode === "monthly"
        ? "Grouped by month"
        : performance.trendScrollable
          ? "Daily view with horizontal scroll"
          : "Daily view";

  const chartMinWidth = performance.trendScrollable
    ? Math.max(720, performance.trendDisplayRows.length * 72)
    : "100%";

  return (
    <div className={cardClass}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className={titleClass}>{title}</h3>
          <p className={`mt-1 text-sm ${mutedTextClass}`}>{subtitle}</p>
        </div>

        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
          {performance.trendDisplayRows.length} bars
        </span>
      </div>

      <div className="mt-6 overflow-x-auto pb-2">
        <div
          style={{
            minWidth:
              typeof chartMinWidth === "number"
                ? `${chartMinWidth}px`
                : chartMinWidth,
          }}
        >
          <AppointmentBarChart
            data={performance.trendDisplayRows}
            maxValue={performance.maxTrendCount}
          />
        </div>
      </div>
    </div>
  );
}

function AppointmentTypeCard({ performance }) {
  return (
    <div className={cardClass}>
      <h3 className={titleClass}>Appointment Type Performance</h3>

      <div className="mt-6 space-y-5">
        {performance.typeRows.length === 0 && (
          <p className={`text-sm ${mutedTextClass}`}>No type data available.</p>
        )}

        {performance.typeRows.map((row) => (
          <SimpleBar
            key={row.type}
            label={row.type}
            value={row.count}
            amount={row.count}
            max={performance.maxTypeCount}
            variant={
              row.type === "ONLINE"
                ? "blue"
                : row.type === "PHONE"
                  ? "green"
                  : "purple"
            }
          />
        ))}
      </div>
    </div>
  );
}

function CompletionRateBar({ value }) {
  return (
    <div className="flex min-w-[130px] items-center gap-3">
      <span className="w-10 text-right font-bold text-slate-600 dark:text-slate-300">
        {value}%
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function PerformanceRowsTable({ type, rows, compact = false }) {
  const previewRows = compact ? rows.slice(0, 3) : rows;
  const firstColumn = type === "department" ? "Department" : "Doctor";
  const emptyText =
    type === "department"
      ? "No department performance data."
      : "No doctor performance data.";

  return (
    <div className="overflow-x-auto">
      <table
        className={`w-full ${compact ? "min-w-[760px]" : "min-w-[900px]"} text-sm`}
      >
        <thead>
          <tr className="border-b border-slate-100 text-left text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <th className="px-5 py-3">{firstColumn}</th>
            {type === "doctor" && <th className="px-4 py-3">Department</th>}
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Booked</th>
            <th className="px-4 py-3">Completed</th>
            <th className="px-4 py-3">Canceled</th>
            <th className="px-4 py-3">No-show</th>
            <th className="px-4 py-3">Completion Rate</th>
          </tr>
        </thead>

        <tbody>
          {previewRows.map((row, index) => {
            const label = type === "department" ? row.department : row.doctor;
            const accentClasses = [
              "bg-violet-500",
              "bg-blue-500",
              "bg-emerald-500",
              "bg-orange-500",
              "bg-rose-500",
            ];

            return (
              <tr
                key={`${type}-${label}`}
                className="border-b border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-200"
              >
                <td className="px-5 py-4 font-semibold text-slate-800 dark:text-white">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${accentClasses[index % accentClasses.length]}`}
                    >
                      {index + 1}
                    </span>
                    <span>{label}</span>
                  </div>
                </td>
                {type === "doctor" && (
                  <td className="px-4 py-4">{row.department}</td>
                )}
                <td className="px-4 py-4 font-bold">{row.total}</td>
                <td className="px-4 py-4">{row.booked}</td>
                <td className="px-4 py-4">{row.completed}</td>
                <td className="px-4 py-4">{row.cancelled}</td>
                <td className="px-4 py-4">{row.noShow}</td>
                <td className="px-4 py-4">
                  <CompletionRateBar value={row.completionRate} />
                </td>
              </tr>
            );
          })}

          {previewRows.length === 0 && (
            <tr>
              <td
                colSpan={type === "doctor" ? 8 : 7}
                className="py-6 text-center text-slate-500 dark:text-slate-400"
              >
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function formatComparisonDate(value) {
  if (!value) return "N/A";

  return new Date(value + "T00:00:00").toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function InsightSummaryGrid({ performance, vertical = false }) {
  const tileClass = vertical
    ? "rounded-xl p-3 text-sm"
    : "rounded-xl p-4 text-sm";

  return (
    <div
      className={
        vertical
          ? "grid grid-cols-1 gap-3"
          : "grid grid-cols-1 gap-4 md:grid-cols-3"
      }
    >
      <div
        className={`${tileClass} bg-violet-50 text-violet-800 dark:bg-violet-950/30 dark:text-violet-200`}
      >
        <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-violet-500 dark:text-violet-300">
          Volume insight
        </span>
        {performance.busiestDepartment} has the highest appointment volume.
      </div>

      <div
        className={`${tileClass} bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200`}
      >
        <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-blue-500 dark:text-blue-300">
          Workload insight
        </span>
        {performance.busiestDoctor} currently has the highest booking load.
      </div>

      <div
        className={`${tileClass} bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200`}
      >
        <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-red-500 dark:text-red-300">
          Cancellation insight
        </span>
        Cancellation rate is {performance.cancellationRate}%.
      </div>
    </div>
  );
}

function ComparisonRateCard({ row }) {
  const isIncrease = row.direction === "increase";
  const isDecrease = row.direction === "decrease";
  const rateLabel = row.rate > 0 ? `+${row.rate}%` : `${row.rate}%`;
  const directionLabel = isIncrease
    ? "Increasing"
    : isDecrease
      ? "Decreasing"
      : "No change";
  const badgeClass = isIncrease
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
    : isDecrease
      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";

  return (
    <div className="appointment-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {row.label}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">
            {row.current}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${badgeClass}`}
        >
          {directionLabel} {rateLabel}
        </span>
      </div>

      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        Previous: <span className="font-semibold">{row.previous}</span>
        <span className="mx-2">/</span>
        Difference:{" "}
        <span className="font-semibold">
          {row.difference > 0 ? `+${row.difference}` : row.difference}
        </span>
      </p>
    </div>
  );
}

function InsightsDetailContent({ performance }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Available insights
        </h3>
        <div className="mt-3">
          <InsightSummaryGrid performance={performance} />
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className={titleClass}>Performance change rate</h3>
            <p className={`mt-1 text-sm ${mutedTextClass}`}>
              Compared with{" "}
              {formatComparisonDate(
                performance.comparison?.previousRange?.start,
              )}{" "}
              to{" "}
              {formatComparisonDate(performance.comparison?.previousRange?.end)}
              .
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(performance.comparison?.rows || []).map((row) => (
            <ComparisonRateCard key={row.label} row={row} />
          ))}
        </div>
      </section>
    </div>
  );
}
function PerformanceViewAllModal({ modal, onClose }) {
  if (!modal) return null;

  const isInsights = modal.type === "insights";
  const rowCount = modal.rows?.length || 0;

  return (
    <div className="fixed inset-y-20 left-4 right-4 z-50 flex items-start justify-center bg-black/45 px-0 py-4 backdrop-blur-sm xl:bottom-8 xl:left-[246px] xl:right-[310px] xl:top-28">
      <div className="flex max-h-full w-full max-w-[1120px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              {modal.title}
            </h2>
            <p className={`mt-1 text-sm ${mutedTextClass}`}>
              {isInsights
                ? "Current insights plus selected-range comparison rates"
                : `${rowCount} row${rowCount === 1 ? "" : "s"}`}
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
          {isInsights ? (
            <InsightsDetailContent performance={modal.performance} />
          ) : (
            <PerformanceRowsTable type={modal.type} rows={modal.rows} />
          )}
        </div>
      </div>
    </div>
  );
}

function PerformanceTableTabs({ activeTab, onChange }) {
  const activeIndex = Math.max(
    0,
    PERFORMANCE_TABLE_TABS.findIndex((tab) => tab.key === activeTab),
  );

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white/70 shadow-sm dark:border-slate-800 dark:bg-slate-950/30">
      <div
        className="relative grid grid-flow-col auto-cols-fr overflow-hidden p-1"
        style={{
          "--active-tab-index": activeIndex,
          "--tab-count": PERFORMANCE_TABLE_TABS.length,
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
        {PERFORMANCE_TABLE_TABS.map((tab) => {
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

function PerformanceTablesSection({
  performance,
  activeTab,
  onChangeTab,
  onViewAll,
}) {
  const isDepartment = activeTab === "department";
  const rows = isDepartment
    ? performance.departmentRows
    : performance.doctorRows;
  const title = isDepartment ? "Department Performance" : "Doctor Performance";

  return (
    <div className="mb-6">
      <PerformanceTableTabs activeTab={activeTab} onChange={onChangeTab} />

      <div className="appointment-card overflow-hidden p-0">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-sm font-bold text-violet-600 dark:bg-violet-500/20 dark:text-violet-200">
              {isDepartment ? "DP" : "DR"}
            </span>
            <h3 className="truncate text-lg font-bold text-slate-950 dark:text-white">
              {title}
            </h3>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
              {rows.length}
            </span>
            <button
              type="button"
              onClick={() => onViewAll(activeTab)}
              className="text-xs font-semibold text-violet-600 hover:text-violet-500"
            >
              View all
            </button>
          </div>
        </div>

        <PerformanceRowsTable type={activeTab} rows={rows} compact />
      </div>
    </div>
  );
}

function AiInsightsCard({ performance, onViewAll }) {
  return (
    <div className={`${cardClass} h-full`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={titleClass}>Elly AI Performance Insights</h3>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-semibold text-violet-600 hover:text-violet-500"
        >
          View all
        </button>
      </div>

      <div className="mt-4">
        <InsightSummaryGrid performance={performance} vertical />
      </div>
    </div>
  );
}

export default function PerformanceTab({ appointments }) {
  const [periodDays, setPeriodDays] = useState(7);
  const [viewAllModal, setViewAllModal] = useState(null);
  const [activePerformanceTable, setActivePerformanceTable] =
    useState("department");
  const range = getPerformanceRange(periodDays);
  const fallbackPerformance = usePerformanceData(appointments, range);
  const { data } = useAppointmentAnalyticsQuery("performance", {
    from: `${range.start}T00:00:00.000`,
    to: `${range.end}T23:59:59.999`,
  });
  const performance = data ? adaptPerformanceResponse(data, range) : fallbackPerformance;

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <PerformancePeriodSelect value={periodDays} onChange={setPeriodDays} />
      </div>

      <div className="mb-4 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="grid min-w-0 gap-4">
          <TotalAppointmentsCard value={performance.total} />

          <AppointmentTypeCard performance={performance} />
        </div>

        <div className="grid min-w-0 gap-4 xl:contents">
          <StatusBreakdown performance={performance} />
          <AiInsightsCard
            performance={performance}
            onViewAll={() =>
              setViewAllModal({
                title: "Elly AI Performance Insights",
                type: "insights",
                performance,
              })
            }
          />
        </div>
      </div>

      <div className="mb-6">
        <DailyTrendCard performance={performance} />
      </div>
      <PerformanceTablesSection
        performance={performance}
        activeTab={activePerformanceTable}
        onChangeTab={setActivePerformanceTable}
        onViewAll={(type) =>
          setViewAllModal({
            title:
              type === "department"
                ? "Department Performance"
                : "Doctor Performance",
            type,
            rows:
              type === "department"
                ? performance.departmentRows
                : performance.doctorRows,
          })
        }
      />

      <PerformanceViewAllModal
        modal={viewAllModal}
        onClose={() => setViewAllModal(null)}
      />
    </div>
  );
}

