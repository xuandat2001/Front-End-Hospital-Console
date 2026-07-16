import { useCallback, useEffect, useMemo, useState } from "react";
import { intelligenceService } from "../../../services/intelligence/intelligenceApi";
import MiniPieChart from "../../../components/graphs/MiniPieChart";

const RISK_COLORS = {
  High: "#EF4444",
  Medium: "#F59E0B",
  Low: "#22C55E",
};

const RANGE_OPTIONS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

// AI-based Readmission Risk Tracker is not implemented yet (the backend returns
// a disabled placeholder). These preview values keep the panel meaningful until
// the longitudinal-intelligence layer is wired in.
const READMISSION_PREVIEW = {
  high: 2,
  medium: 3,
  low: 7,
  topAtRisk: [
    { patientId: "ELLY-PAT-0001", name: "Oggy", specialty: "Surgery", riskScore: 78, level: "High", action: "Review Intervention Plans" },
    { patientId: "ELLY-PAT-0002", name: "Lily", specialty: "Pediatrics", riskScore: 55, level: "Medium", action: "Review Clinical Pathways" },
  ],
};

export default function PatientPerformance() {
  const [range, setRange] = useState(RANGE_OPTIONS[1]);
  const [performance, setPerformance] = useState(null);
  const [census, setCensus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (days) => {
    setLoading(true);
    try {
      const [perfRes, censusRes] = await Promise.allSettled([
        intelligenceService.getPatientPerformance({ days }),
        intelligenceService.getPatientCensus(),
      ]);

      if (perfRes.status === "fulfilled") {
        setPerformance(perfRes.value?.data || null);
        setError("");
      } else {
        throw perfRes.reason;
      }

      setCensus(censusRes.status === "fulfilled" ? censusRes.value?.data || null : null);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.message || "Failed to load patient performance intelligence.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(range.days);
  }, [load, range.days]);

  const readmission = performance?.readmission?.enabled
    ? performance.readmission
    : { ...READMISSION_PREVIEW, enabled: false };

  const riskSlices = useMemo(
    () => [
      { label: "High", value: readmission.high ?? readmission.distribution?.high ?? 0, color: RISK_COLORS.High },
      { label: "Medium", value: readmission.medium ?? readmission.distribution?.medium ?? 0, color: RISK_COLORS.Medium },
      { label: "Low", value: readmission.low ?? readmission.distribution?.low ?? 0, color: RISK_COLORS.Low },
    ],
    [readmission],
  );

  if (loading && !performance) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
      </div>
    );
  }

  const alos = performance?.alos || { overall: 0, target: 0, deltaDays: 0, bySpecialty: [] };
  const discharge = performance?.discharge || {
    velocityPerDay: 0,
    throughputTarget: 0,
    onTimePct: 0,
    daily: [],
  };
  const totals = census?.totals || { total: 0, active: 0, inactive: 0 };
  const aboveTarget = alos.deltaDays > 0;
  const riskTotal = riskSlices.reduce((sum, slice) => sum + slice.value, 0);
  const topAtRisk = readmission.topAtRisk || [];
  const dailySeries = (discharge.daily || []).map((point) =>
    typeof point === "number" ? point : point.discharges,
  );

  return (
    <div className="relative px-6 pb-6 pt-4">
      {/* Header */}
      <div className="sticky top-3 z-20 mb-6 rounded-2xl border border-white/60 bg-white/55 px-5 py-4 shadow-lg shadow-slate-900/8 ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45 dark:shadow-black/30 dark:ring-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-950 dark:text-white sm:text-2xl">
              Patient Performance
            </h1>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
              Measures how efficiently patients move through care pathways — length of stay, discharge velocity, and readmission risk.
            </p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {totals.total} total patients — {totals.active} active, {totals.inactive} inactive
            </p>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>
          <span className="rounded-full border border-violet-300/60 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold text-violet-700 dark:border-violet-400/30 dark:text-violet-300">
            Hybrid intelligence · Logic + AI
          </span>
        </div>
      </div>

      {/* Top row: KPI cards (left) + Discharge chart (right) */}
      <div className="mb-6 grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:col-span-4">
          <KpiCard>
            <p className="text-[9px] font-semibold uppercase tracking-wide leading-tight text-slate-500">
              Average Length of Stay vs Target
            </p>
            <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-baseline gap-1.5">
              <p className="min-w-0 text-lg font-bold text-slate-900 dark:text-white">
                {alos.overall} <span className="text-[10px] font-semibold text-slate-400">days</span>
              </p>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                vs
              </span>
              <p className="min-w-0 text-right text-lg font-bold text-slate-400">
                {alos.target} <span className="text-[10px] font-semibold text-slate-400">days</span>
              </p>
            </div>
            <p className={`mt-2 text-[11px] font-semibold leading-tight ${aboveTarget ? "text-red-500" : "text-emerald-500"}`}>
              {aboveTarget ? "▲" : "▼"} {aboveTarget ? "+" : ""}{alos.deltaDays} days vs target
            </p>
          </KpiCard>

          <KpiCard>
            <p className="text-[9px] font-semibold uppercase tracking-wide leading-tight text-slate-500">Readmission Risk</p>
            <p className="mt-1 text-lg font-bold text-red-500">
              HIGH: {riskSlices[0].value} patients
            </p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[8px] font-semibold text-violet-600 dark:text-violet-300">
              ✦ {readmission.enabled ? "Predicted by AI" : "AI preview — pending"}
            </span>
          </KpiCard>

          <KpiCard>
            <p className="text-[9px] font-semibold uppercase tracking-wide leading-tight text-slate-500">
              Velocity vs Throughput
            </p>
            <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-baseline gap-1.5">
              <p className="min-w-0 text-lg font-bold text-slate-900 dark:text-white">
                {discharge.velocityPerDay} <span className="text-[10px] font-semibold text-slate-400">/ day</span>
              </p>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                vs
              </span>
              <p className="min-w-0 text-right text-lg font-bold text-slate-400">
                {discharge.throughputTarget} <span className="text-[10px] font-semibold text-slate-400">/ day</span>
              </p>
            </div>
            <p className="mt-2 text-[11px] font-semibold leading-tight text-slate-500">Logic-based throughput</p>
          </KpiCard>

          <KpiCard>
            <p className="text-[9px] font-semibold uppercase tracking-wide leading-tight text-slate-500">On-Time Discharges</p>
            <p className="mt-1 text-lg font-bold text-emerald-500">{discharge.onTimePct}%</p>
            <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-1.5 rounded-full bg-emerald-500"
                style={{ width: `${discharge.onTimePct}%` }}
              />
            </div>
          </KpiCard>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 xl:col-span-8">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Daily Discharge Velocity vs. Throughput Target
              </h3>
              <p className="text-xs text-slate-400">
                Logic-Based Velocity/Throughput
              </p>
            </div>
            <div className="relative shrink-0">
              <select
                value={range.label}
                onChange={(e) => {
                  const next = RANGE_OPTIONS.find((opt) => opt.label === e.target.value);
                  if (next) setRange(next);
                }}
                aria-label="Chart time range"
                className="appearance-none rounded-lg border border-violet-300 bg-violet-50 py-2 pl-3 pr-9 text-xs font-semibold text-violet-800 shadow-sm outline-none transition-colors hover:border-violet-400 hover:bg-violet-100 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-violet-500/50 dark:bg-violet-500/15 dark:text-violet-100 dark:hover:bg-violet-500/25 dark:focus:border-violet-400 dark:focus:ring-violet-500/30"
              >
                {RANGE_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.label}>{opt.label}</option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-600 dark:text-violet-300"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          {dailySeries.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No discharge data in the selected window.</p>
          ) : (
            <DischargeVelocityChart
              data={dailySeries}
              target={discharge.throughputTarget}
              rangeLabel={range.label}
            />
          )}
        </div>
      </div>

      {/* Middle row: ALOS by specialty + Readmission risk */}
      <div className="mb-6 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Average Length of Stay by Specialty
          </h3>
          <p className="mb-4 text-xs text-slate-400">Logic-Based Calculation</p>
          {alos.bySpecialty.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              No completed stays in the selected window.
            </p>
          ) : (
            <AlosBySpecialtyChart items={alos.bySpecialty} target={alos.target} />
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Readmission Risk Analysis
            </h3>
            {!readmission.enabled && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                AI preview
              </span>
            )}
          </div>
          <p className="mb-4 text-xs text-slate-400">AI-Based Predictions</p>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500">
                Risk Distribution for {riskTotal} patients total
              </p>
              <MiniPieChart centerLabel={`${riskTotal}\npatients`} slices={riskSlices} compact />
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500">
                Top At-Risk Patients (Longitudinal Intelligence)
              </p>
              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-600 dark:text-slate-300">Patient</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-600 dark:text-slate-300">Risk</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-600 dark:text-slate-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topAtRisk.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-2 py-6 text-center text-slate-400">
                          No at-risk patients
                        </td>
                      </tr>
                    ) : (
                      topAtRisk.map((p) => (
                        <tr key={p.patientId} className="border-t border-slate-200 dark:border-slate-700">
                          <td className="px-2 py-2 align-top">
                            <p className="font-semibold text-slate-900 dark:text-white">{p.name}</p>
                            <p className="text-[10px] text-slate-400">{p.specialty}</p>
                          </td>
                          <td className="px-2 py-2 align-top font-bold text-slate-900 dark:text-white">
                            {p.riskScore}%
                          </td>
                          <td className="px-2 py-2 align-top">
                            <span
                              className="inline-block rounded px-2 py-0.5 text-[10px] font-semibold"
                              style={{
                                backgroundColor: `${RISK_COLORS[p.level]}20`,
                                color: RISK_COLORS[p.level],
                              }}
                            >
                              {p.level}
                            </span>
                            <button
                              type="button"
                              className="mt-1 block text-left text-[10px] font-semibold text-violet-600 hover:underline dark:text-violet-300"
                            >
                              [{p.action}]
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

function KpiCard({ children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      {children}
    </div>
  );
}

function AlosBySpecialtyChart({ items, target }) {
  const max = Math.max(...items.map((i) => i.alos), target, 1);
  const chartHeight = 180;
  const targetPct = (target / max) * 100;

  return (
    <div>
      <div className="relative ml-10 flex items-end gap-3 border-b border-l border-slate-200 dark:border-slate-700" style={{ height: chartHeight }}>
        {/* Y axis label */}
        <span className="absolute -left-10 top-1/2 origin-center -rotate-90 whitespace-nowrap text-[10px] font-medium text-slate-400">
          Current ALOS (days)
        </span>

        {/* Target line */}
        <div
          className="absolute left-0 right-0 border-t-2 border-dashed border-amber-500/70"
          style={{ bottom: `${targetPct}%` }}
        >
          <span className="absolute -top-4 right-0 rounded bg-amber-500/10 px-1 text-[9px] font-semibold text-amber-600">
            Target ({target}d)
          </span>
        </div>

        {items.map((item) => (
          <div
            key={item.specialty}
            className="group relative flex w-full flex-col items-center justify-end"
            style={{ height: "100%" }}
          >
            <span className="mb-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">{item.alos}</span>
            <div
              className="w-full rounded-t-lg bg-gradient-to-t from-violet-500 to-violet-300 shadow-sm dark:from-violet-600 dark:to-violet-400"
              style={{ height: `${(item.alos / max) * 100}%` }}
              title={`${item.specialty}: ${item.alos}d (target ${item.target}d, ${item.patientCount} stays)`}
            />
          </div>
        ))}
      </div>
      <div className="ml-10 mt-1 flex gap-3">
        {items.map((item) => (
          <span key={item.specialty} className="w-full truncate text-center text-[10px] font-medium text-slate-500 dark:text-slate-400">
            {item.specialty}
          </span>
        ))}
      </div>
    </div>
  );
}

function DischargeVelocityChart({ data, target, rangeLabel }) {
  const width = 900;
  const height = 268;
  const padding = { top: 20, right: 20, bottom: 48, left: 36 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxY = Math.max(...data, target, 10);
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;

  const toX = (i) => padding.left + i * stepX;
  const toY = (v) => padding.top + innerH - (v / maxY) * innerH;

  const points = data.map((v, i) => `${toX(i)},${toY(v)}`);
  const linePath = "M " + points.map((p) => p.replace(",", " ")).join(" L ");
  const areaPath = `${linePath} L ${toX(data.length - 1)} ${padding.top + innerH} L ${toX(0)} ${padding.top + innerH} Z`;

  const yTicks = [0, 2, 4, 6, 8, 10].filter((t) => t <= maxY);
  const targetY = toY(target);
  const labelEvery = Math.max(1, Math.round(data.length / 10));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full min-w-[640px]">
        <defs>
          <linearGradient id="dischargeArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={padding.left}
              y1={toY(t)}
              x2={width - padding.right}
              y2={toY(t)}
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-700"
              strokeWidth="1"
            />
            <text x={padding.left - 8} y={toY(t) + 3} textAnchor="end" className="fill-slate-400 text-[10px]">
              {t}
            </text>
          </g>
        ))}

        {/* Target line */}
        <line
          x1={padding.left}
          y1={targetY}
          x2={width - padding.right}
          y2={targetY}
          stroke="#F59E0B"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
        <text x={padding.left + 4} y={targetY - 5} className="fill-amber-600 text-[10px] font-semibold">
          Target
        </text>

        {/* Area + line */}
        <path d={areaPath} fill="url(#dischargeArea)" />
        <path d={linePath} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* X axis labels */}
        {data.map((_, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text
              key={i}
              x={toX(i)}
              y={padding.top + innerH + 14}
              textAnchor="middle"
              className="fill-slate-400 text-[9px]"
            >
              {i + 1}
            </text>
          ) : null,
        )}

        {/* Axis titles */}
        <text
          x={padding.left - 24}
          y={padding.top + innerH / 2}
          transform={`rotate(-90 ${padding.left - 24} ${padding.top + innerH / 2})`}
          textAnchor="middle"
          className="fill-slate-400 text-[10px]"
        >
          Actual Discharges
        </text>
        <text
          x={padding.left + innerW / 2}
          y={height - 6}
          textAnchor="middle"
          className="fill-slate-400 text-[10px]"
        >
          Time ({rangeLabel.toLowerCase()})
        </text>
      </svg>
    </div>
  );
}
