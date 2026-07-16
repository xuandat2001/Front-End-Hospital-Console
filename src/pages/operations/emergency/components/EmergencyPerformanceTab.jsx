import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Siren,
  SlidersHorizontal,
  TrendingDown,
} from "lucide-react";
import {
  getPerformanceDelayBottlenecks,
  getPerformanceOutcomes,
  getPerformanceResponseTimeTrend,
  getPerformanceSeverityBreakdown,
  getPerformanceSlaCompliance,
} from "../../../../services/performance/emergencyPerformanceApi";
import EmergencyTabHeader from "./EmergencyTabHeader";
import {
  createInitialWidgetState,
  getCachedEmergencyWidgets,
  loadEmergencyWidgets,
  markWidgetStateLoading,
} from "./emergencyWidgetLoader";

const RANGE_OPTIONS = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

const WIDGETS = {
  responseTimeTrend: getPerformanceResponseTimeTrend,
  slaCompliance: getPerformanceSlaCompliance,
  severityBreakdown: getPerformanceSeverityBreakdown,
  outcomes: getPerformanceOutcomes,
  delayBottlenecks: getPerformanceDelayBottlenecks,
};

const TREND_SERIES = [
  {
    key: "sosToDispatchMinutes",
    label: "SOS to dispatch",
    color: "var(--primary)",
  },
  {
    key: "sosToArrivalMinutes",
    label: "SOS to arrival",
    color: "var(--success)",
  },
  {
    key: "sosToTreatmentStartMinutes",
    label: "SOS to treatment",
    color: "var(--danger)",
  },
];

const PERFORMANCE_CACHE_TTL_MS = 60000;

function formatMinutes(value) {
  if (!Number.isFinite(value)) return "No data";
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)} min`;
}

function hasTrendData(data) {
  return (data?.buckets || []).some((bucket) =>
    TREND_SERIES.some((series) => Number.isFinite(bucket[series.key])),
  );
}

function mergeGroups(data, fallbackGroups) {
  const byKey = new Map((data?.groups || []).map((group) => [group.key, group]));
  return fallbackGroups.map((group) => ({
    ...group,
    ...(byKey.get(group.key) || {}),
    count: byKey.get(group.key)?.count || 0,
    percentage: byKey.get(group.key)?.percentage || 0,
  }));
}

function EmergencyDateRangeFilter({ range, onChange, disabled }) {
  return (
    <div className="emergency-performance-filter" aria-label="Performance date range">
      <SlidersHorizontal size={15} strokeWidth={1.9} />
      {RANGE_OPTIONS.map((option) => (
        <button
          aria-pressed={range === option.value}
          className={range === option.value ? "is-active" : ""}
          disabled={disabled}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function WidgetShell({ title, icon: Icon, loading, error, empty, children }) {
  return (
    <section className="emergency-performance-panel" aria-label={title}>
      <div className="emergency-performance-panel-header">
        <div>
          <h2>{title}</h2>
        </div>
        <span aria-hidden="true" className="emergency-performance-icon">
          <Icon size={16} strokeWidth={1.9} />
        </span>
      </div>

      {loading ? <WidgetSkeleton /> : null}
      {!loading && error ? <WidgetError message={error} /> : null}
      {!loading && !error && empty ? <WidgetEmpty /> : null}
      {!loading && !error && !empty ? children : null}
    </section>
  );
}

function WidgetSkeleton() {
  return (
    <div className="emergency-performance-skeleton" aria-label="Loading widget">
      <span />
      <span />
      <span />
    </div>
  );
}

function WidgetError({ message }) {
  return (
    <div className="emergency-performance-state is-error" role="alert">
      <AlertTriangle size={16} strokeWidth={1.9} />
      <p>{message}</p>
    </div>
  );
}

function WidgetEmpty() {
  return (
    <div className="emergency-performance-state">
      <Clock3 size={16} strokeWidth={1.9} />
      <p>No performance data for this range.</p>
    </div>
  );
}

function buildLinePath(points) {
  if (!points.length) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function ResponseTimeTrendChart({ state }) {
  const data = state.data;
  const buckets = data?.buckets || [];
  const values = buckets.flatMap((bucket) =>
    TREND_SERIES.map((series) => bucket[series.key]).filter(Number.isFinite),
  );
  const maxValue = Math.max(...values, 1);
  const width = 720;
  const height = 280;
  const padding = { top: 18, right: 22, bottom: 38, left: 44 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  return (
    <WidgetShell
      empty={!hasTrendData(data)}
      error={state.error}
      icon={Activity}
      loading={state.loading}
      title="Response time trend"
    >
      <div className="emergency-performance-chart-wrap">
        <svg
          aria-label="Emergency response time trend chart"
          className="emergency-performance-line-chart"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((step) => {
            const y = padding.top + innerHeight * step;
            return (
              <g key={step}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                />
                <text x={10} y={y + 4}>
                  {Math.round(maxValue * (1 - step))}
                </text>
              </g>
            );
          })}

          {TREND_SERIES.map((series) => {
            const points = buckets
              .map((bucket, index) => {
                const value = bucket[series.key];
                if (!Number.isFinite(value)) return null;
                const x =
                  padding.left +
                  (buckets.length <= 1 ? 0 : (index / (buckets.length - 1)) * innerWidth);
                const y = padding.top + innerHeight - (value / maxValue) * innerHeight;
                return { x, y, value };
              })
              .filter(Boolean);

            return (
              <g key={series.key}>
                <path
                  d={buildLinePath(points)}
                  fill="none"
                  stroke={series.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                />
                {points.map((point, index) => (
                  <circle
                    aria-label={`${series.label}: ${formatMinutes(point.value)}`}
                    cx={point.x}
                    cy={point.y}
                    fill="var(--surface-strong)"
                    key={`${series.key}-${index}`}
                    r="4"
                    stroke={series.color}
                    strokeWidth="2"
                    tabIndex="0"
                  />
                ))}
              </g>
            );
          })}

          {buckets.map((bucket, index) => {
            if (index % Math.ceil(Math.max(buckets.length, 1) / 6) !== 0) return null;
            const x =
              padding.left +
              (buckets.length <= 1 ? 0 : (index / (buckets.length - 1)) * innerWidth);
            return (
              <text key={bucket.key} x={x} y={height - 12} textAnchor="middle">
                {bucket.label}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="emergency-performance-legend">
        {TREND_SERIES.map((series) => (
          <span key={series.key}>
            <i style={{ background: series.color }} />
            {series.label}
          </span>
        ))}
      </div>
    </WidgetShell>
  );
}

function SlaComplianceCard({ state }) {
  const data = state.data;
  const total = data?.totalCases || 0;
  const met = data?.metPercentage || 0;
  const breached = data?.breachedPercentage || 0;

  return (
    <WidgetShell
      empty={!total}
      error={state.error}
      icon={CheckCircle2}
      loading={state.loading}
      title="SLA compliance"
    >
      <div className="emergency-sla-card">
        <div>
          <p className="emergency-sla-value">{met}%</p>
          <p className="emergency-sla-label">SLA met</p>
        </div>
        <div>
          <p className="emergency-sla-value is-danger">{breached}%</p>
          <p className="emergency-sla-label">SLA breached</p>
        </div>
        <div>
          <p className="emergency-sla-value">{data?.breachedCases || 0}</p>
          <p className="emergency-sla-label">Breached cases</p>
        </div>
      </div>
      <div className="emergency-sla-meter" aria-label={`${met}% SLA met`}>
        <span style={{ width: `${met}%` }} />
      </div>
      <p className="emergency-performance-note">
        {total} measured cases. Cancelled cases excluded.
      </p>
    </WidgetShell>
  );
}

function DistributionChart({ state, title, icon, groups, emptyLabel }) {
  const mergedGroups = mergeGroups(state.data, groups);
  const maxCount = Math.max(...mergedGroups.map((group) => group.count), 1);
  const total = state.data?.total || 0;

  return (
    <WidgetShell
      empty={!total}
      error={state.error}
      icon={icon}
      loading={state.loading}
      title={title}
    >
      <div className="emergency-distribution-list" aria-label={emptyLabel}>
        {mergedGroups.map((group) => (
          <div className="emergency-distribution-row" key={group.key}>
            <div>
              <p>{group.label}</p>
              <span>{group.percentage}%</span>
            </div>
            <div
              aria-label={`${group.label}: ${group.count}`}
              className="emergency-distribution-track"
              role="img"
            >
              <span style={{ width: `${(group.count / maxCount) * 100}%` }} />
            </div>
            <strong>{group.count}</strong>
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}

function EmergencySeverityChart({ state }) {
  return (
    <DistributionChart
      emptyLabel="Cases by triage severity"
      groups={[
        { key: "CRITICAL", label: "Critical" },
        { key: "HIGH", label: "High" },
        { key: "MODERATE", label: "Medium" },
        { key: "LOW", label: "Low" },
      ]}
      icon={Siren}
      state={state}
      title="Cases by severity"
    />
  );
}

function EmergencyOutcomeChart({ state }) {
  return (
    <DistributionChart
      emptyLabel="Emergency outcome breakdown"
      groups={[
        { key: "TREATED_AND_DISCHARGED", label: "Treated and discharged" },
        { key: "ADMITTED", label: "Admitted" },
        { key: "ICU_ESCALATED", label: "ICU escalated" },
        { key: "OR_ESCALATED", label: "OR escalated" },
        { key: "TRANSFERRED", label: "Transferred" },
        { key: "CANCELLED_FALSE_ALARM", label: "Cancelled / false alarm" },
      ]}
      icon={BarChart3}
      state={state}
      title="Emergency outcomes"
    />
  );
}

function EmergencyDelayBottleneckTable({ state }) {
  const rows = [...(state.data?.rows || [])].sort(
    (left, right) =>
      (right.averageDelayMinutes || 0) - (left.averageDelayMinutes || 0),
  );

  return (
    <WidgetShell
      empty={!rows.length}
      error={state.error}
      icon={TrendingDown}
      loading={state.loading}
      title="Delay bottlenecks"
    >
      <div className="emergency-delay-table-wrap">
        <table className="emergency-delay-table">
          <thead>
            <tr>
              <th>Delay source</th>
              <th>Average delay</th>
              <th>Max delay</th>
              <th>Samples</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.stage}>
                <td>{row.label}</td>
                <td>{formatMinutes(row.averageDelayMinutes)}</td>
                <td>{formatMinutes(row.maxDelayMinutes)}</td>
                <td>{row.sampleCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetShell>
  );
}

export default function EmergencyPerformanceTab() {
  const [range, setRange] = useState("7d");
  const [widgets, setWidgets] = useState(() => createInitialWidgetState(WIDGETS));
  const rangeWidgetMap = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(WIDGETS).map(([key, request]) => [
          key,
          ({ signal }) => request(range, { signal }),
        ]),
      ),
    [range],
  );

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      const cacheKey = `performance:${range}`;
      const cached = getCachedEmergencyWidgets(cacheKey, PERFORMANCE_CACHE_TTL_MS);
      if (cached) {
        setWidgets(cached);
        return;
      }

      setWidgets((current) => markWidgetStateLoading(current));

      loadEmergencyWidgets({
        widgetMap: rangeWidgetMap,
        cacheKey,
        ttlMs: PERFORMANCE_CACHE_TTL_MS,
        signal: controller.signal,
      })
        .then((nextWidgets) => {
          setWidgets(nextWidgets);
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            setWidgets((current) =>
              Object.fromEntries(
                Object.entries(current).map(([key, value]) => [
                  key,
                  {
                    ...value,
                    loading: false,
                    error: value.error || "Unable to load performance data.",
                  },
                ]),
              ),
            );
          }
        });
    });

    return () => {
      controller.abort();
    };
  }, [range, rangeWidgetMap]);

  const isRefreshing = useMemo(
    () => Object.values(widgets).some((widget) => widget.loading),
    [widgets],
  );

  return (
    <div className="emergency-command-scroll">
      <div className="emergency-performance-shell">
        <EmergencyTabHeader
          title="Emergency performance"
          description="Historical response speed, SLA health, case mix, outcomes, and delay sources."
          actions={
            <>
            <div className="emergency-case-focus">
              <RefreshCw size={14} strokeWidth={1.9} />
              <span>{isRefreshing ? "Refreshing" : "Updated"}</span>
            </div>
            <EmergencyDateRangeFilter
              disabled={false}
              onChange={setRange}
              range={range}
            />
            </>
          }
        />

        <div className="emergency-performance-grid">
          <div className="emergency-performance-main">
            <ResponseTimeTrendChart state={widgets.responseTimeTrend} />
            <EmergencyDelayBottleneckTable state={widgets.delayBottlenecks} />
          </div>
          <aside className="emergency-performance-side">
            <SlaComplianceCard state={widgets.slaCompliance} />
            <EmergencySeverityChart state={widgets.severityBreakdown} />
            <EmergencyOutcomeChart state={widgets.outcomes} />
          </aside>
        </div>
      </div>
    </div>
  );
}

export {
  EmergencyDateRangeFilter,
  ResponseTimeTrendChart,
  SlaComplianceCard,
  EmergencySeverityChart,
  EmergencyOutcomeChart,
  EmergencyDelayBottleneckTable,
};
