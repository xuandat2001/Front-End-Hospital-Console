import { useCallback, useEffect, useMemo, useState } from "react";
import { intelligenceService } from "../../../services/intelligence/intelligenceApi";
import MiniPieChart from "../../../components/graphs/MiniPieChart";
import usePatientSearchStore from "../../../store/usePatientSearchStore";

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

export default function PatientPerformance() {
  const [range, setRange] = useState(RANGE_OPTIONS[1]);
  const [performance, setPerformance] = useState(null);
  const [census, setCensus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const setActiveEllyId = usePatientSearchStore((state) => state.setActiveEllyId);

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
    : {
        enabled: false,
        available: false,
        note:
          performance?.readmission?.note ||
          "Patient monitoring risks are not available yet.",
        distribution: { high: 0, medium: 0, low: 0 },
        high: 0,
        medium: 0,
        low: 0,
        topAtRisk: [],
      };

  const riskSlices = useMemo(
    () => [
      { label: "High", value: readmission.high ?? readmission.distribution?.high ?? 0, color: RISK_COLORS.High },
      { label: "Medium", value: readmission.medium ?? readmission.distribution?.medium ?? 0, color: RISK_COLORS.Medium },
      { label: "Low", value: readmission.low ?? readmission.distribution?.low ?? 0, color: RISK_COLORS.Low },
    ],
    [readmission],
  );

  const openRiskMonitor = (patientEllyId) => {
    if (!patientEllyId) return;
    setActiveEllyId(patientEllyId, {
      tab: "risk-monitor",
      openDashboard: true,
    });
  };

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
    <div className="patient-fit-page flex h-full max-h-full min-h-0 flex-col gap-2 overflow-hidden px-3 pb-2 pt-2 sm:px-4">
      <header className="shrink-0 rounded-xl border border-white/60 bg-white/55 px-3 py-2 shadow-sm ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45 dark:ring-white/5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-slate-950 dark:text-white sm:text-lg">
              Patient Performance
            </h1>
            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
              {totals.total} patients · {totals.active} active · length of stay, discharge velocity, monitoring risks
            </p>
            {error && <p className="mt-0.5 text-[11px] text-red-500">{error}</p>}
          </div>
          <span className="rounded-full border border-violet-300/60 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:border-violet-400/30 dark:text-violet-300">
            Hybrid · Logic + AI
          </span>
        </div>
      </header>

      <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiCard>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">ALOS vs Target</p>
          <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
            {alos.overall}
            <span className="text-[10px] font-semibold text-slate-400"> / {alos.target}d</span>
          </p>
          <p className={`text-[10px] font-semibold ${aboveTarget ? "text-red-500" : "text-emerald-500"}`}>
            {aboveTarget ? "▲" : "▼"} {aboveTarget ? "+" : ""}{alos.deltaDays}d
          </p>
        </KpiCard>
        <KpiCard>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Monitoring risks</p>
          <p className="mt-0.5 text-sm font-bold text-red-500">HIGH: {riskSlices[0].value}</p>
          <p className="text-[10px] font-semibold text-sky-700 dark:text-sky-300">
            {readmission.enabled ? "Care-context" : "Unavailable"}
          </p>
        </KpiCard>
        <KpiCard>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Velocity</p>
          <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
            {discharge.velocityPerDay}
            <span className="text-[10px] font-semibold text-slate-400"> / {discharge.throughputTarget}</span>
          </p>
          <p className="text-[10px] text-slate-500">per day</p>
        </KpiCard>
        <KpiCard>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">On-time</p>
          <p className="mt-0.5 text-sm font-bold text-emerald-500">{discharge.onTimePct}%</p>
          <div className="mt-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${discharge.onTimePct}%` }} />
          </div>
        </KpiCard>
      </div>

      <div className="grid min-h-0 flex-[0.95] gap-2 overflow-hidden lg:grid-cols-2">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-1.5 flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Daily Discharge Velocity
              </h3>
              <p className="text-[10px] text-slate-400">vs throughput target</p>
            </div>
            <select
              value={range.label}
              onChange={(e) => {
                const next = RANGE_OPTIONS.find((opt) => opt.label === e.target.value);
                if (next) setRange(next);
              }}
              aria-label="Chart time range"
              className="rounded-lg border border-violet-300 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-800 outline-none dark:border-violet-500/50 dark:bg-violet-500/15 dark:text-violet-100"
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.label}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="min-h-0 flex-1">
            {dailySeries.length === 0 ? (
              <p className="flex h-full items-center justify-center text-xs text-slate-400">
                No discharge data in the selected window.
              </p>
            ) : (
              <DischargeVelocityChart
                data={dailySeries}
                target={discharge.throughputTarget}
                rangeLabel={range.label}
              />
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="shrink-0 text-xs font-semibold text-slate-700 dark:text-slate-300">
            ALOS by Specialty
          </h3>
          <p className="mb-1.5 shrink-0 text-[10px] text-slate-400">Logic-based</p>
          <div className="min-h-0 flex-1 overflow-hidden">
            {alos.bySpecialty.length === 0 ? (
              <p className="flex h-full items-center justify-center text-xs text-slate-400">
                No completed stays in the selected window.
              </p>
            ) : (
              <AlosBySpecialtyChart items={alos.bySpecialty} target={alos.target} />
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-1 flex shrink-0 items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Patient monitoring risks
          </h3>
          {readmission.enabled && readmission.available === false && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
              Brain unavailable
            </span>
          )}
        </div>
        <p className="mb-1.5 shrink-0 text-[10px] text-slate-400">
          Care-context monitoring — not a predicted readmission score
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          {readmission.note && (
            <p className="mb-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              {readmission.note}
            </p>
          )}

          <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="min-w-0">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Distribution · {riskTotal} patients
              </p>
              <MiniPieChart centerLabel={`${riskTotal}\npatients`} slices={riskSlices} compact />
            </div>

            <div className="min-w-0">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Patients with signals
              </p>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-[1] bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-600 dark:text-slate-300">Patient</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-600 dark:text-slate-300">Severity</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-600 dark:text-slate-300">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topAtRisk.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-2 py-5 text-center text-slate-400">
                          No monitoring insights yet. Run Risk Monitor on a patient record first.
                        </td>
                      </tr>
                    ) : (
                      topAtRisk.map((p) => (
                        <tr
                          key={p.insightId || p.patientEllyId || p.patientId}
                          className="border-t border-slate-200 dark:border-slate-700"
                        >
                          <td className="px-2 py-2 align-top">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {p.name || p.patientEllyId || p.patientId}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {p.topFindings?.[0] || p.summary || "Care context"}
                            </p>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <span
                              className="inline-block rounded px-2 py-0.5 text-[10px] font-semibold"
                              style={{
                                backgroundColor: `${RISK_COLORS[p.level] || RISK_COLORS.Low}20`,
                                color: RISK_COLORS[p.level] || RISK_COLORS.Low,
                              }}
                            >
                              {p.level || "Low"}
                            </span>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <button
                              type="button"
                              onClick={() => openRiskMonitor(p.patientEllyId || p.patientId)}
                              className="text-left text-[10px] font-semibold text-sky-700 hover:underline dark:text-sky-300"
                            >
                              Open Risk Monitor
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
    <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900">
      {children}
    </div>
  );
}

function AlosBySpecialtyChart({ items, target }) {
  const max = Math.max(...items.map((i) => i.alos), target, 1);
  const targetPct = (target / max) * 100;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative ml-8 flex min-h-0 flex-1 items-end gap-2 border-b border-l border-slate-200 dark:border-slate-700">
        <div
          className="absolute left-0 right-0 border-t border-dashed border-amber-500/70"
          style={{ bottom: `${targetPct}%` }}
        >
          <span className="absolute -top-3.5 right-0 rounded bg-amber-500/10 px-1 text-[8px] font-semibold text-amber-600">
            Target {target}d
          </span>
        </div>
        {items.map((item) => (
          <div key={item.specialty} className="flex h-full w-full flex-col items-center justify-end">
            <span className="mb-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-300">{item.alos}</span>
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-violet-500 to-violet-300 dark:from-violet-600 dark:to-violet-400"
              style={{ height: `${(item.alos / max) * 100}%` }}
              title={`${item.specialty}: ${item.alos}d`}
            />
          </div>
        ))}
      </div>
      <div className="ml-8 mt-1 flex gap-2">
        {items.map((item) => (
          <span key={item.specialty} className="w-full truncate text-center text-[9px] text-slate-500">
            {item.specialty}
          </span>
        ))}
      </div>
    </div>
  );
}

function DischargeVelocityChart({ data, target, rangeLabel }) {
  const width = 900;
  const height = 180;
  const padding = { top: 14, right: 16, bottom: 28, left: 28 };
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
    <div className="h-full min-h-0">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="dischargeAreaFit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.4" />
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
            <text x={padding.left - 6} y={toY(t) + 3} textAnchor="end" className="fill-slate-400 text-[9px]">
              {t}
            </text>
          </g>
        ))}
        <line
          x1={padding.left}
          y1={targetY}
          x2={width - padding.right}
          y2={targetY}
          stroke="#F59E0B"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
        <path d={areaPath} fill="url(#dischargeAreaFit)" />
        <path d={linePath} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((_, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text
              key={i}
              x={toX(i)}
              y={padding.top + innerH + 12}
              textAnchor="middle"
              className="fill-slate-400 text-[8px]"
            >
              {i + 1}
            </text>
          ) : null,
        )}
        <text
          x={padding.left + innerW / 2}
          y={height - 2}
          textAnchor="middle"
          className="fill-slate-400 text-[9px]"
        >
          {rangeLabel}
        </text>
      </svg>
    </div>
  );
}
