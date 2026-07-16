import { useCallback, useEffect, useState } from "react";
import MiniLineChart from "../../components/graphs/MiniLineChart";
import Icon from "../../components/dashboard/Icon";
import { intelligenceService } from "../../services/intelligence/intelligenceApi";
import ResourceAnalytics from "./analytics/ResourceAnalytics";
import ReportAnalytics from "./analytics/ReportAnalytics";

const analyticsRequests = [
  ["overview", "Overview", intelligenceService.getAnalyticsOverview],
  ["capacity", "Capacity", intelligenceService.getCapacityAnalytics],
  ["emergency", "Emergency", intelligenceService.getEmergencyAnalytics],
  ["staff", "Staff workload", intelligenceService.getStaffWorkloadAnalytics],
  ["inventory", "Inventory", intelligenceService.getInventoryAnalytics],
  ["equipment", "Equipment", intelligenceService.getEquipmentAnalytics],
];

function getSnapshotMetrics(snapshot) {
  return snapshot?.data?.metrics || snapshot?.metrics || {};
}

function getMissing(snapshot) {
  return snapshot?.data?.missingMetrics || snapshot?.missingMetrics || [];
}

function compactNumber(value, fallback = "No data") {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "number") return Intl.NumberFormat().format(value);
  return value;
}

function percentValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : null;
}

function MiniBar({ label, value, max = 100, tone = "teal" }) {
  const parsed = Number(value);
  const width = Number.isFinite(parsed) && max > 0 ? Math.max(0, Math.min(100, (parsed / max) * 100)) : 0;
  const displayValue = compactNumber(value);

  return (
    <div className={`intelligence-bar-row intelligence-tone-${tone}`}>
      <span className="intelligence-bar-label">{label}</span>
      <div aria-hidden="true">
        <i style={{ width: `${width}%` }} />
      </div>
      <strong title={String(displayValue)}>{displayValue}</strong>
    </div>
  );
}

function StatTile({ label, value, detail, tone = "violet" }) {
  return (
    <div className={`intelligence-stat-tile intelligence-tone-${tone}`}>
      <span>{label}</span>
      <strong>{compactNumber(value)}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function ResourceMetric({ label, value, tone = "teal" }) {
  return (
    <div className={`intelligence-resource-metric intelligence-tone-${tone}`}>
      <span>{label}</span>
      <strong>{compactNumber(value)}</strong>
    </div>
  );
}

function MissingMetrics({ snapshots }) {
  const missing = Object.entries(snapshots).flatMap(([key, snapshot]) =>
    getMissing(snapshot).map((metric) => `${key}: ${metric}`),
  );

  if (!missing.length) return null;

  return (
    <section className="dashboard-card intelligence-note-card">
      <div>
        <Icon name="alert" size={17} />
        <h2>Missing source metrics</h2>
      </div>
      <p>
        These metrics are not yet present in the intelligence read model. They will populate once the
        corresponding service or event starts sending data.
      </p>
      <ul>
        {missing.slice(0, 8).map((metric) => (
          <li key={metric}>{metric}</li>
        ))}
      </ul>
    </section>
  );
}

const planningMetricOptions = [
  { key: "appointments", label: "Appointments", target: 1300 },
  { key: "patients", label: "Patient inflow", target: 1180 },
  { key: "emergency", label: "Emergency cases", target: 420 },
  { key: "workload", label: "Department workload", target: 78 },
  { key: "revenue", label: "Revenue", target: 520 },
  { key: "staff", label: "Staff capacity", target: 92 },
  { key: "beds", label: "Bed occupancy", target: 82 },
];

const planningTableTabs = [
  { key: "demand", label: "Demand Forecast" },
  { key: "capacity", label: "Capacity Planning" },
  { key: "risk", label: "Risk Prediction" },
  { key: "actions", label: "Suggested Actions" },
];

function buildForecastSeries(metricKey, horizon) {
  const metricIndex = Math.max(
    0,
    planningMetricOptions.findIndex((option) => option.key === metricKey),
  );
  const scale = 1 + metricIndex * 0.08 + (horizon === 14 ? 0.05 : horizon === 30 ? 0.1 : 0);
  const base = [1120, 1250, 1310, 1280, 1480, 1620, 1410, 1380];
  const today = new Date();

  return base.map((value, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index - 3);

    return {
      key: `${metricKey}-${index}`,
      label: date.toLocaleDateString([], { month: "short", day: "numeric" }),
      day: date.toLocaleDateString([], { weekday: "short" }),
      value: Math.round(value * scale),
      type: index < 4 ? "actual" : "forecast",
    };
  });
}

function getPlanningRows({ departments, occupancy, emergency, overview }) {
  const demandRows = departments.length
    ? departments.slice(0, 4).map((department, index) => {
        const current = Math.round(Number(department.activeCasesPerDoctor) || 18 + index * 4);
        return {
          name: department.departmentName || department.departmentId,
          current,
          forecast: Math.round(current * (1.18 - index * 0.03)),
          change: `+${Math.max(8, 22 - index * 4)}%`,
        };
      })
    : [
        { name: "Cardiology", current: 24, forecast: 31, change: "+29%" },
        { name: "Emergency", current: 19, forecast: 25, change: "+24%" },
        { name: "Neurology", current: 17, forecast: 20, change: "+18%" },
        { name: "Pediatrics", current: 14, forecast: 16, change: "+14%" },
      ];

  return {
    demand: demandRows,
    capacity: [
      { resource: "ICU beds", available: overview.availableIcuBeds ?? 4, needed: 6, status: "Shortage" },
      { resource: "General beds", available: overview.availableBeds ?? 31, needed: 28, status: "Ready" },
      { resource: "Evening nurses", available: 18, needed: 21, status: "Gap" },
      { resource: "Consultation rooms", available: 9, needed: 8, status: "Ready" },
    ],
    risk: [
      { area: "Emergency", risk: emergency.activeEmergencyCases > 0 ? "High" : "Medium", reason: "Peak arrival window", priority: "Urgent" },
      { area: "ICU", risk: occupancy >= 80 ? "High" : "Medium", reason: "Bed pressure rising", priority: "High" },
      { area: "Cardiology", risk: "Medium", reason: "Forecast demand increase", priority: "Review" },
      { area: "Diagnostics", risk: "Low", reason: "Stable throughput", priority: "Monitor" },
    ],
    actions: [
      { action: "Add evening nurse coverage", area: "Emergency", impact: "High", status: "Pending" },
      { action: "Reserve two ICU beds", area: "ICU", impact: "High", status: "Planned" },
      { action: "Extend Cardiology slots", area: "Cardiology", impact: "Medium", status: "Review" },
      { action: "Shift one room to walk-ins", area: "General", impact: "Medium", status: "Ready" },
    ],
  };
}

function AnalyticsPlanningTabs({ activeTab, onChange }) {
  const activeIndex = Math.max(
    0,
    planningTableTabs.findIndex((tab) => tab.key === activeTab),
  );

  return (
    <div className="analytics-planning-tabs">
      <span
        aria-hidden="true"
        style={{
          width: `calc((100% - 8px) / ${planningTableTabs.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {planningTableTabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={activeTab === tab.key ? "is-active" : ""}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function ForecastTargetChart({ metric, horizon, onMetricChange }) {
  const option = planningMetricOptions.find((item) => item.key === metric) || planningMetricOptions[0];
  const data = buildForecastSeries(metric, horizon);
  const target = option.target;
  const maxValue = Math.max(target, ...data.map((point) => point.value)) * 1.18;
  const minValue = Math.min(target, ...data.map((point) => point.value)) * 0.7;
  const width = 860;
  const height = 280;
  const padding = { top: 22, right: 44, bottom: 54, left: 54 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const xFor = (index) => padding.left + (index / (data.length - 1)) * chartWidth;
  const yFor = (value) => padding.top + ((maxValue - value) / (maxValue - minValue)) * chartHeight;
  const actualData = data.filter((point) => point.type === "actual");
  const forecastData = data.filter((point) => point.type === "forecast");
  const actualPath = actualData
    .map((point, index) => `${index === 0 ? "M" : "L"}${xFor(index)} ${yFor(point.value)}`)
    .join(" ");
  const forecastPath = forecastData
    .map((point, index) => `${index === 0 ? "M" : "L"}${xFor(index + actualData.length)} ${yFor(point.value)}`)
    .join(" ");
  const bridgePath = `M${xFor(actualData.length - 1)} ${yFor(actualData.at(-1).value)} L${xFor(actualData.length)} ${yFor(forecastData[0].value)}`;
  const targetY = yFor(target);
  const ticks = [0.8, 0.6, 0.4, 0.2].map((ratio) => Math.round(minValue + (maxValue - minValue) * ratio));

  return (
    <section className="dashboard-card intelligence-panel analytics-forecast-card">
      <div className="analytics-forecast-header">
        <div>
          <h2>Forecast & Target Planning</h2>
          <div className="analytics-chart-legend">
            <span><i className="actual" />Actual Historical</span>
            <span><i className="forecast" />Forecast Future</span>
            <span><i className="target" />Target</span>
          </div>
        </div>
        <select value={metric} onChange={(event) => onMetricChange(event.target.value)} aria-label="Forecast metric">
          {planningMetricOptions.map((item) => (
            <option key={item.key} value={item.key}>{item.label}</option>
          ))}
        </select>
      </div>

      <svg className="analytics-forecast-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${option.label} forecast with target line`}>
        <defs>
          <linearGradient id="analyticsActualFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="analyticsFutureFill" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <rect x={xFor(3)} y={padding.top} width={(chartWidth * 4) / 7} height={chartHeight} fill="url(#analyticsFutureFill)" />
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={padding.left} x2={width - padding.right} y1={yFor(tick)} y2={yFor(tick)} className="grid" />
            <text x={16} y={yFor(tick) + 4} className="axis">{Intl.NumberFormat().format(tick)}</text>
          </g>
        ))}
        <line x1={padding.left} x2={width - padding.right} y1={targetY} y2={targetY} className="target-line" />
        <text x={width - padding.right + 10} y={targetY - 5} className="target-label">Target</text>
        <text x={width - padding.right + 10} y={targetY + 12} className="target-value">{Intl.NumberFormat().format(target)}</text>
        <path d={`${actualPath} L${xFor(3)} ${height - padding.bottom} L${xFor(0)} ${height - padding.bottom} Z`} fill="url(#analyticsActualFill)" />
        <path d={actualPath} className="actual-line" />
        <path d={bridgePath} className="forecast-line" />
        <path d={forecastPath} className="forecast-line" />
        {data.map((point, index) => (
          <g key={point.key}>
            <circle cx={xFor(index)} cy={yFor(point.value)} r="5" className={point.type === "actual" ? "actual-dot" : "forecast-dot"} />
            <text x={xFor(index)} y={yFor(point.value) - 12} className="point-label">{Intl.NumberFormat().format(point.value)}</text>
            <text x={xFor(index)} y={height - 28} className="x-label">{point.label}</text>
            <text x={xFor(index)} y={height - 13} className="x-sub-label">{point.day}</text>
          </g>
        ))}
      </svg>
    </section>
  );
}

function PlanningPreviewTable({ activeTab, rows }) {
  if (activeTab === "capacity") {
    return (
      <div className="analytics-planning-table">
        <div className="analytics-planning-row is-head"><span>Resource</span><span>Available</span><span>Needed</span><span>Status</span></div>
        {rows.capacity.slice(0, 3).map((row) => (
          <div className="analytics-planning-row" key={row.resource}><span>{row.resource}</span><span>{row.available}</span><span>{row.needed}</span><strong>{row.status}</strong></div>
        ))}
      </div>
    );
  }

  if (activeTab === "risk") {
    return (
      <div className="analytics-planning-table">
        <div className="analytics-planning-row is-head"><span>Area</span><span>Risk</span><span>Reason</span><span>Priority</span></div>
        {rows.risk.slice(0, 3).map((row) => (
          <div className="analytics-planning-row" key={row.area}><span>{row.area}</span><span>{row.risk}</span><span>{row.reason}</span><strong>{row.priority}</strong></div>
        ))}
      </div>
    );
  }

  if (activeTab === "actions") {
    return (
      <div className="analytics-planning-table">
        <div className="analytics-planning-row is-head"><span>Action</span><span>Area</span><span>Impact</span><span>Status</span></div>
        {rows.actions.slice(0, 3).map((row) => (
          <div className="analytics-planning-row" key={row.action}><span>{row.action}</span><span>{row.area}</span><span>{row.impact}</span><strong>{row.status}</strong></div>
        ))}
      </div>
    );
  }

  return (
    <div className="analytics-planning-table">
      <div className="analytics-planning-row is-head"><span>Department</span><span>Current</span><span>Forecast</span><span>Change</span></div>
      {rows.demand.slice(0, 3).map((row) => (
        <div className="analytics-planning-row" key={row.name}><span>{row.name}</span><span>{row.current}</span><span>{row.forecast}</span><strong>{row.change}</strong></div>
      ))}
    </div>
  );
}

function IntelligencePlanningView({ snapshots, loadAnalytics, updatedAt, error }) {
  const [horizon, setHorizon] = useState(7);
  const [metric, setMetric] = useState("appointments");
  const [activeTab, setActiveTab] = useState("demand");
  const overview = getSnapshotMetrics(snapshots.overview);
  const capacity = getSnapshotMetrics(snapshots.capacity);
  const emergency = getSnapshotMetrics(snapshots.emergency);
  const staff = getSnapshotMetrics(snapshots.staff);
  const departments = staff.departments || [];
  const occupancy = percentValue(capacity.totalBedOccupancy ?? overview.totalBedOccupancy) ?? 72;
  const activeEmergencyCases = Number(emergency.activeEmergencyCases ?? overview.activeEmergencyCases ?? 18);
  const rows = getPlanningRows({ departments, occupancy, emergency, overview });
  const peakDepartment = rows.demand[0]?.name || "Cardiology";

  return (
    <div className="intelligence-page analytics-planning-page">
      <header className="intelligence-page-header analytics-planning-header">
        <div>
          <span className="analytics-eyebrow">Care analytics</span>
          <h1>Analytics Planning</h1>
          <p>Forecast demand, compare targets, and prepare operational actions.</p>
        </div>
        <div className="analytics-planning-controls">
          <select value={metric} onChange={(event) => setMetric(event.target.value)}>
            {planningMetricOptions.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
          <select value={horizon} onChange={(event) => setHorizon(Number(event.target.value))}>
            <option value={7}>Next 7 days</option>
            <option value={14}>Next 14 days</option>
            <option value={30}>Next 30 days</option>
          </select>
          <button className="btn btn-secondary" onClick={loadAnalytics} type="button">Refresh</button>
        </div>
      </header>

      {error && <div className="error-message intelligence-error" role="alert">{error}</div>}

      <div className="analytics-planning-top-grid">
        <div className="analytics-planning-stat-grid">
          <StatTile label="Predicted visits" value={buildForecastSeries(metric, horizon).at(-1).value} detail={`Next ${horizon} days`} tone="blue" />
          <StatTile label="Peak department" value={peakDepartment} detail="Highest forecast load" tone="violet" />
          <StatTile label="Capacity risk" value={`${occupancy}%`} detail="Projected occupancy" tone={occupancy >= 80 ? "rose" : "amber"} />
          <StatTile label="Staffing gap" value={Math.max(0, 21 - Number(staff.availableStaff || 18))} detail="Roles to cover" tone="teal" />
        </div>

        <section className="dashboard-card intelligence-panel analytics-ai-plan-card">
          <div className="intelligence-panel-heading">
            <h2>AI Planning Recommendations</h2>
            {updatedAt && <span>{updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
          </div>
          <ul>
            <li>{peakDepartment} demand is trending above the current planning target.</li>
            <li>Prepare capacity buffers for {activeEmergencyCases > 10 ? "Emergency and ICU" : "high-priority departments"}.</li>
            <li>Add evening coverage if projected occupancy remains above 80%.</li>
            <li>Review low-risk departments for temporary room reallocation.</li>
          </ul>
        </section>
      </div>

      <ForecastTargetChart metric={metric} horizon={horizon} onMetricChange={setMetric} />

      <AnalyticsPlanningTabs activeTab={activeTab} onChange={setActiveTab} />
      <section className="dashboard-card intelligence-panel analytics-planning-table-card">
        <div className="intelligence-panel-heading">
          <h2>{planningTableTabs.find((tab) => tab.key === activeTab)?.label}</h2>
          <span>3 rows</span>
        </div>
        <PlanningPreviewTable activeTab={activeTab} rows={rows} />
      </section>
    </div>
  );
}
function IntelligenceAnalytics({ activeFunction }) {
  const [snapshots, setSnapshots] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const hospitalId = intelligenceService.defaultHospitalId;

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    const settled = await Promise.allSettled(
      analyticsRequests.map(([key, , request]) =>
        request(hospitalId).then((response) => [key, response.data]),
      ),
    );

    const nextSnapshots = {};
    const failures = [];

    settled.forEach((result, index) => {
      const key = analyticsRequests[index][0];
      if (result.status === "fulfilled") {
        nextSnapshots[result.value[0]] = result.value[1];
      } else {
        failures.push(`${analyticsRequests[index][1]}: ${result.reason.message}`);
        nextSnapshots[key] = null;
      }
    });

    setSnapshots(nextSnapshots);
    setUpdatedAt(new Date());
    setError(failures[0] || "");
    setLoading(false);
  }, [hospitalId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAnalytics();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAnalytics]);

  const overview = getSnapshotMetrics(snapshots.overview);
  const capacity = getSnapshotMetrics(snapshots.capacity);
  const emergency = getSnapshotMetrics(snapshots.emergency);
  const staff = getSnapshotMetrics(snapshots.staff);
  const inventory = getSnapshotMetrics(snapshots.inventory);
  const equipment = getSnapshotMetrics(snapshots.equipment);

  const occupancy = percentValue(capacity.totalBedOccupancy ?? overview.totalBedOccupancy);
  const icuOccupancy = percentValue(capacity.icuOccupancy ?? overview.icuOccupancy);
  const activeEmergencyCases = emergency.activeEmergencyCases ?? overview.activeEmergencyCases;
  const incomingHighSeverityCases = emergency.incomingHighSeverityCases;

  const trendValues = [
    capacity.availableBeds ?? overview.availableBeds ?? 0,
    capacity.availableGeneralBeds ?? 0,
    capacity.availableIcuBeds ?? overview.availableIcuBeds ?? 0,
    overview.pendingAdmissions ?? 0,
    activeEmergencyCases ?? 0,
    incomingHighSeverityCases ?? 0,
  ].map((value) => Number(value) || 0);
  const trendData = trendValues.some(Boolean) ? trendValues : [0, 1, 0, 1, 0, 1];

  const departmentRows = staff.departments || [];
  const sectionLabel = {
    "intelligence-capacity": "Capacity focus",
    "intelligence-workload": "Workload focus",
    "intelligence-resources": "Resource focus",
    "intelligence-reports": "Snapshot report",
  }[activeFunction] || "Operations overview";

  if (loading) {
    return (
      <div className="dashboard-loading" aria-live="polite">
        <span />
        <p>Loading intelligence analytics...</p>
      </div>
    );
  }

  if (activeFunction === "intelligence-reports") {
    return (
      <ReportAnalytics
        snapshots={snapshots}
        loadAnalytics={loadAnalytics}
        updatedAt={updatedAt}
        error={error}
      />
    );
  }

  if (activeFunction === "intelligence-resources") {
    return (
      <ResourceAnalytics
        snapshots={snapshots}
        loadAnalytics={loadAnalytics}
        updatedAt={updatedAt}
        error={error}
      />
    );
  }

  if (activeFunction === "intelligence-workload") {
    return (
      <IntelligencePlanningView
        snapshots={snapshots}
        loadAnalytics={loadAnalytics}
        updatedAt={updatedAt}
        error={error}
      />
    );
  }

  return (
    <div className="intelligence-page">
      <header className="intelligence-page-header">
        <div>
          <h1>Analytics</h1>
          <p>{sectionLabel}</p>
        </div>
        <button className="btn btn-secondary" onClick={loadAnalytics} type="button">
          Refresh
        </button>
      </header>

      {error && (
        <div className="error-message intelligence-error" role="alert">
          {error}
        </div>
      )}

      <div className="intelligence-analytics-grid">
        <section className="dashboard-card intelligence-panel intelligence-stats-card">
          <div className="intelligence-panel-heading">
            <h2>Operational stats</h2>
            {updatedAt && <span>{updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
          </div>
          <div className="intelligence-stat-grid">
            <StatTile label="Total beds" value={capacity.totalBeds ?? overview.totalBeds} tone="blue" />
            <StatTile label="Available beds" value={capacity.availableBeds ?? overview.availableBeds} tone="teal" />
            <StatTile label="ICU beds open" value={capacity.availableIcuBeds ?? overview.availableIcuBeds} tone="violet" />
            <StatTile label="Pending admissions" value={overview.pendingAdmissions} tone="amber" />
            <StatTile label="Active emergency" value={activeEmergencyCases ?? 0} tone="rose" />
            <StatTile label="High severity incoming" value={incomingHighSeverityCases ?? 0} tone="amber" />
          </div>
        </section>

        <section className="dashboard-card intelligence-panel intelligence-pressure-card">
          <div className="intelligence-panel-heading">
            <h2>Capacity pressure</h2>
            <span>{occupancy === null ? "No data" : `${occupancy}%`}</span>
          </div>
          <div className="intelligence-chart-block">
            <MiniLineChart data={trendData} variant="green" />
          </div>
          <MiniBar label="Total occupancy" value={occupancy} tone="amber" />
          <MiniBar label="ICU occupancy" value={icuOccupancy} tone="violet" />
          <MiniBar
            label="Available ICU beds"
            value={capacity.availableIcuBeds ?? overview.availableIcuBeds}
            max={10}
            tone="teal"
          />
        </section>

        <section className="dashboard-card intelligence-panel intelligence-emergency-card">
          <div className="intelligence-panel-heading">
            <h2>Emergency load</h2>
            <span>{compactNumber(activeEmergencyCases ?? 0)}</span>
          </div>
          <MiniBar
            label="Active cases"
            value={activeEmergencyCases ?? 0}
            max={Math.max(5, Number(activeEmergencyCases) || 0)}
            tone="rose"
          />
          <MiniBar
            label="High severity"
            value={incomingHighSeverityCases ?? 0}
            max={Math.max(5, Number(incomingHighSeverityCases) || 0)}
            tone="amber"
          />
          <MiniBar label="Pending confirmations" value={emergency.pendingConfirmations ?? 0} max={5} tone="violet" />
        </section>

        <section className="dashboard-card intelligence-panel intelligence-workload-card">
          <div className="intelligence-panel-heading">
            <h2>Department workload</h2>
            <span>{departmentRows.length || "No data"}</span>
          </div>
          <div className="intelligence-table">
            <div className="intelligence-table-row intelligence-table-head">
              <span>Department</span>
              <span>Cases per doctor</span>
              <span>Nurse ratio</span>
              <span>Available staff</span>
            </div>
            {departmentRows.slice(0, 6).map((department) => (
              <div className="intelligence-table-row" key={department.departmentId}>
                <span>{department.departmentName || department.departmentId}</span>
                <span>{compactNumber(department.activeCasesPerDoctor)}</span>
                <span>{compactNumber(department.nurseToPatientRatio)}</span>
                <span>{compactNumber(department.availableStaff)}</span>
              </div>
            ))}
            {!departmentRows.length && <p className="intelligence-empty">No department workload metrics yet.</p>}
          </div>
        </section>

        <section className="dashboard-card intelligence-panel intelligence-resource-card">
          <div className="intelligence-panel-heading">
            <h2>Medicine stock</h2>
            <span>{compactNumber(inventory.lowStockItems ?? 0)}</span>
          </div>
          <div className="intelligence-resource-grid">
            <ResourceMetric label="Tracked items" value={inventory.trackedMedicineItems ?? 0} tone="teal" />
            <ResourceMetric label="Low stock items" value={inventory.lowStockItems ?? 0} tone="amber" />
          </div>
          <p className="intelligence-muted">
            {(inventory.lowStockMedicineIds || []).slice(0, 3).join(", ") || "No low-stock medicine metrics."}
          </p>
        </section>

        <section className="dashboard-card intelligence-panel intelligence-resource-card">
          <div className="intelligence-panel-heading">
            <h2>Equipment availability</h2>
            <span>{compactNumber(equipment.unavailableEquipment ?? 0)}</span>
          </div>
          <div className="intelligence-resource-grid">
            <ResourceMetric label="Tracked equipment" value={equipment.trackedEquipmentItems ?? 0} tone="violet" />
            <ResourceMetric label="Unavailable" value={equipment.unavailableEquipment ?? 0} tone="rose" />
          </div>
          <p className="intelligence-muted">
            {(equipment.unavailableEquipmentIds || []).slice(0, 3).join(", ") || "No unavailable equipment metrics."}
          </p>
        </section>

        <MissingMetrics snapshots={snapshots} />
      </div>
    </div>
  );
}

export default IntelligenceAnalytics;
