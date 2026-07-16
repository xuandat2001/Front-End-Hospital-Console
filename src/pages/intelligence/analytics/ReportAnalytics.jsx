import { useMemo, useState, useEffect } from "react";
import { round, avg, weightedMovingAverage, exponentialSmoothing, linearRegressionForecast } from "../../../components/analytics/utils";
import { reportService } from "../../../services/report/reportApi";

function daysBetween(a, b) {
  const diff = new Date(b) - new Date(a);
  return diff > 0 ? diff / (1000 * 60 * 60 * 24) : null;
}

function monthLabel(date) {
  const d = new Date(date);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function weekLabel(date) {
  const d = new Date(date);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const day = d.getDate();
  const startOfWeek = day - d.getDay();
  const endOfWeek = startOfWeek + 6;
  const startDay = Math.max(1, startOfWeek);
  const endDay = Math.min(31, endOfWeek);
  return `${months[d.getMonth()]} ${startDay}-${endDay}`;
}

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function weekKey(date) {
  const d = new Date(date);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + yearStart.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function formatCategory(cat) {
  const map = {
    INCIDENT: "Incident", EQUIPMENT: "Equipment", STAFF: "Staffing",
    DAILY_DEPARTMENT: "Dept Daily", EMERGENCY: "Emergency", MAINTENANCE: "Maintenance",
  };
  return map[cat] || cat;
}

function KpiCard({ label, value, unit = "", target, optimalDir = 1, format, isGood }) {
  const ok = value != null && target != null
    ? (optimalDir > 0 ? value >= target : value <= target)
    : value != null ? (isGood != null ? isGood : null) : null;
  const displayVal = value != null ? (format ? format(value) : `${value}${unit}`) : null;
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-white/50">{label}</p>
      <div className="mt-1 flex items-baseline gap-1.5">
        {displayVal != null ? (
          <span className={`text-lg font-bold tracking-tight ${ok === true ? "text-emerald-600 dark:text-emerald-400" : ok === false ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-white/90"}`}>
            {displayVal}
          </span>
        ) : (
          <span className="text-xs font-medium text-slate-400 dark:text-white/30">No data</span>
        )}
      </div>
      {target != null && displayVal != null && (
        <p className="mt-0.5 text-[9px] text-slate-400 dark:text-white/30">
          Target: {format ? format(target) : `${target}${unit}`}
          {ok === true && " ✓"}
          {ok === false && " ⚠"}
        </p>
      )}
    </div>
  );
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
      <div className={`h-full rounded-full ${color || "bg-indigo-500"}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

export default function ReportAnalytics({ loadAnalytics, updatedAt, error }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getAllReports().then((res) => {
      if (res?.data) setReports(res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const isCurrentMonth = (d) => {
    const date = new Date(d);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  };

  const totalReports = reports.length;
  const reportsThisMonth = reports.filter((r) => isCurrentMonth(r.createdAt)).length;
  const openStatuses = ["PENDING", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS"];
  const closedStatuses = ["RESOLVED", "CLOSED"];
  const openReports = reports.filter((r) => openStatuses.includes(r.status)).length;
  const resolvedReports = reports.filter((r) => closedStatuses.includes(r.status));
  const escalatedReports = reports.filter(
    (r) => r.priority === "CRITICAL" && !closedStatuses.includes(r.status)
  ).length;

  const resolutionDays = resolvedReports
    .map((r) => daysBetween(r.createdAt, r.resolvedAt))
    .filter((d) => d != null);
  const avgResolutionTime = resolutionDays.length > 0
    ? round(avg(resolutionDays), 1)
    : null;
  const resolutionRate = totalReports > 0
    ? round((resolvedReports.length / totalReports) * 100)
    : null;
  const slaDays = 3;
  const slaCompliant = resolutionDays.filter((d) => d <= slaDays).length;
  const slaRate = resolutionDays.length > 0
    ? round((slaCompliant / resolutionDays.length) * 100)
    : null;

  const trendData = useMemo(() => {
    const dates = reports.map((r) => r.createdAt).filter(Boolean).map((d) => new Date(d));
    if (!dates.length) return [];
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const monthDiff = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + maxDate.getMonth() - minDate.getMonth();
    const useWeeks = monthDiff <= 2;
    const map = {};
    reports.forEach((r) => {
      if (!r.createdAt) return;
      const key = useWeeks ? weekKey(r.createdAt) : monthKey(r.createdAt);
      const label = useWeeks ? weekLabel(r.createdAt) : monthLabel(r.createdAt);
      if (!map[key]) map[key] = { label, count: 0 };
      map[key].count++;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([, v]) => v);
  }, [reports]);

  const categoryData = useMemo(() => {
    const map = {};
    reports.forEach((r) => {
      const cat = r.reportCategory || "OTHER";
      if (!map[cat]) map[cat] = { label: formatCategory(cat), count: 0, totalDays: 0, resCount: 0 };
      map[cat].count++;
      if (closedStatuses.includes(r.status) && r.resolvedAt) {
        const days = daysBetween(r.createdAt, r.resolvedAt);
        if (days != null) { map[cat].totalDays += days; map[cat].resCount++; }
      }
    });
    return Object.entries(map).map(([, v]) => ({
      ...v,
      avgRes: v.resCount > 0 ? round(v.totalDays / v.resCount, 1) : null,
    })).sort((a, b) => b.count - a.count);
  }, [reports]);

  const deptData = useMemo(() => {
    const map = {};
    reports.forEach((r) => {
      const dept = r.departmentId || "Unknown";
      if (!map[dept]) map[dept] = { name: dept, count: 0, open: 0, totalDays: 0, resCount: 0 };
      map[dept].count++;
      if (openStatuses.includes(r.status)) map[dept].open++;
      if (closedStatuses.includes(r.status) && r.resolvedAt) {
        const days = daysBetween(r.createdAt, r.resolvedAt);
        if (days != null) { map[dept].totalDays += days; map[dept].resCount++; }
      }
    });
    return Object.entries(map).map(([, v]) => ({
      ...v,
      avgRes: v.resCount > 0 ? round(v.totalDays / v.resCount, 1) : null,
    })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [reports]);

  const priorityOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const priorityColors = { CRITICAL: "bg-rose-500", HIGH: "bg-amber-500", MEDIUM: "bg-blue-500", LOW: "bg-slate-400" };
  const priorityData = useMemo(() => {
    const map = {};
    reports.forEach((r) => { const p = r.priority || "MEDIUM"; map[p] = (map[p] || 0) + 1; });
    return priorityOrder.map((p) => ({ label: p, count: map[p] || 0 }));
  }, [reports]);
  const priorityMax = Math.max(...priorityData.map((d) => d.count), 1);

  const statusOrder = ["PENDING", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED"];
  const statusColors = {
    PENDING: "bg-slate-400", UNDER_REVIEW: "bg-amber-400", ASSIGNED: "bg-blue-400",
    IN_PROGRESS: "bg-indigo-500", RESOLVED: "bg-emerald-500", CLOSED: "bg-emerald-700", REJECTED: "bg-rose-400",
  };
  const statusData = useMemo(() => {
    const map = {};
    reports.forEach((r) => { const s = r.status || "PENDING"; map[s] = (map[s] || 0) + 1; });
    return statusOrder.map((s) => ({ label: s, count: map[s] || 0 }));
  }, [reports]);
  const statusMax = Math.max(...statusData.map((d) => d.count), 1);

  const hotspots = useMemo(() => {
    const keywords = [
      { word: "Equipment failures", match: ["failure", "malfunction", "breakdown", "device"] },
      { word: "Staffing shortages", match: ["shortage", "understaffed", "staffing", "leave"] },
      { word: "MRI / Imaging issues", match: ["mri", "imaging", "x-ray", "scan"] },
      { word: "Network / IT outages", match: ["network", "outage", "it", "system", "software", "server"] },
      { word: "Medication stock", match: ["medication", "stock", "pharmacy", "drug", "supply"] },
      { word: "Safety incidents", match: ["safety", "fall", "injury", "accident", "incident"] },
      { word: "Maintenance delays", match: ["maintenance", "repair", "calibration", "electrical"] },
      { word: "Patient complaints", match: ["complaint", "dissatisfied", "complaint"] },
    ];
    return keywords.map((k) => ({
      ...k,
      count: reports.filter((r) => {
        const title = (r.title || "").toLowerCase();
        const desc = (r.description || "").toLowerCase();
        return k.match.some((m) => title.includes(m) || desc.includes(m));
      }).length,
    })).filter((k) => k.count > 0).sort((a, b) => b.count - a.count);
  }, [reports]);

  const forecasts = useMemo(() => {
    if (trendData.length < 2) return null;
    const counts = trendData.map((m) => m.count);
    const wma = round(weightedMovingAverage(counts, Math.min(3, counts.length)));
    const es = round(exponentialSmoothing(counts, 0.3));
    const lr = round(linearRegressionForecast(counts));
    const last = counts[counts.length - 1];
    const avgPred = round((wma + es + lr) / 3);
    const pctChange = last > 0 ? round(((avgPred - last) / last) * 100) : 0;
    return {
      wma: Math.max(0, wma), es: Math.max(0, es), lr: Math.max(0, lr),
      predicted: Math.max(0, avgPred), pctChange,
      direction: pctChange > 5 ? "increase" : pctChange < -5 ? "decrease" : "stable",
    };
  }, [trendData]);

  const recommendations = useMemo(() => {
    const recs = [];
    if (hotspots.length > 0) {
      const top = hotspots[0];
      recs.push({ action: `Investigate recurring "${top.word}" — ${top.count} reports logged.`, impact: "Reduce repeat incidents" });
    }
    if (hotspots.length > 1) {
      const second = hotspots[1];
      recs.push({ action: `Address ${second.word.toLowerCase()} to lower report volume.`, impact: "Operational stability +12%" });
    }
    const slowDept = deptData.find((d) => d.avgRes != null && d.count > 2);
    if (slowDept && slowDept.avgRes > slaDays) {
      recs.push({ action: `Review resolution workflow in ${slowDept.name} (avg ${slowDept.avgRes}d).`, impact: `SLA compliance +${round((slaRate || 0) + 5)}%` });
    }
    const highPriority = priorityData.find((p) => p.label === "CRITICAL");
    if (highPriority && highPriority.count > 3) {
      recs.push({ action: `High volume of critical reports (${highPriority.count}) — escalate response team.`, impact: "Critical response −20%" });
    }
    if (forecasts && forecasts.direction === "increase") {
      recs.push({ action: `Prepare for ${forecasts.pctChange}% increase in reports next month.`, impact: "Proactive staffing +15%" });
    }
    if (recs.length < 2) {
      recs.push({ action: "Schedule preventive maintenance for high-failure equipment.", impact: "Downtime −25%" });
    }
    return recs.slice(0, 4);
  }, [hotspots, deptData, priorityData, forecasts, slaRate]);

  if (loading) {
    return (
      <div className="intelligence-page">
        <header className="intelligence-page-header">
          <div><h1>Report Analytics</h1><p>Loading report data...</p></div>
        </header>
      </div>
    );
  }

  return (
    <div className="intelligence-page">
      <header className="intelligence-page-header">
        <div>
          <h1>Report Analytics</h1>
          <p>Trends, patterns, and insights from operational reports.</p>
        </div>
        <button className="btn btn-secondary" onClick={loadAnalytics} type="button">Refresh</button>
      </header>

      {error && <div className="error-message intelligence-error" role="alert">{error}</div>}

      {!totalReports ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <p className="text-sm text-slate-400 dark:text-white/30">No report data available.</p>
        </div>
      ) : (
        <>
          {/* ── Section 1: KPI Cards ── */}
          <div className="mb-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Report Overview</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <KpiCard label="Total Reports" value={totalReports} />
              <KpiCard label="Reports This Month" value={reportsThisMonth} />
              <KpiCard label="Avg Resolution" value={avgResolutionTime} unit="d" target={slaDays} optimalDir={-1} />
              <KpiCard label="Open Reports" value={openReports} isGood={openReports <= totalReports * 0.3} />
              <KpiCard label="Escalated" value={escalatedReports} isGood={escalatedReports === 0} />
              <KpiCard label="Resolution Rate" value={resolutionRate} unit="%" target={80} optimalDir={1} />
            </div>
          </div>

          {/* ── Section 2: Report Trends ── */}
          <div className="mb-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Report Trends</p>
            {trendData.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                {trendData.map((m) => {
                  const max = Math.max(...trendData.map((x) => x.count), 1);
                  return (
                    <div key={m.label} className="mb-2 flex items-center gap-3">
                      <span className="w-20 shrink-0 text-[10px] font-semibold text-slate-500 dark:text-white/40">{m.label}</span>
                      <div className="flex h-5 flex-1 items-center gap-1">
                        <div
                          className="h-full rounded-r bg-indigo-500/80"
                          style={{ width: `${(m.count / max) * 100}%`, minWidth: m.count > 0 ? 4 : 0 }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs font-bold text-slate-700 dark:text-white/70">{m.count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-slate-400 dark:text-white/30">Not enough data for trend visualization.</p>
            )}
          </div>

          {/* ── Section 3: Category & Priority ── */}
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Category Breakdown</p>
              {categoryData.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                  {categoryData.map((c) => (
                    <div key={c.label} className="mb-2 flex items-center gap-2 text-xs">
                      <span className="w-24 shrink-0 font-medium text-slate-600 dark:text-white/60">{c.label}</span>
                      <MiniBar value={c.count} max={categoryData[0].count} color="bg-indigo-500" />
                      <span className="w-6 text-right font-bold text-slate-700 dark:text-white/70">{c.count}</span>
                      {c.avgRes != null && (
                        <span className="w-14 text-right text-[10px] text-slate-400 dark:text-white/30">{c.avgRes}d</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-xs text-slate-400 dark:text-white/30">No category data.</p>
              )}
            </div>
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Priority Distribution</p>
              {priorityData.some((p) => p.count > 0) ? (
                <div className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                  {priorityData.map((p) => (
                    <div key={p.label} className="mb-2 flex items-center gap-2 text-xs">
                      <span className="w-16 shrink-0 font-medium text-slate-600 dark:text-white/60">{p.label}</span>
                      <MiniBar value={p.count} max={priorityMax} color={priorityColors[p.label]} />
                      <span className="w-6 text-right font-bold text-slate-700 dark:text-white/70">{p.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-xs text-slate-400 dark:text-white/30">No priority data.</p>
              )}
            </div>
          </div>

          {/* ── Section 4: Department Comparison ── */}
          {deptData.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Department Comparison</p>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase text-slate-500 dark:border-white/[0.06] dark:text-white/40">
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Reports</th>
                      <th className="px-4 py-3">Open</th>
                      <th className="px-4 py-3">Avg Resolution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptData.map((d) => (
                      <tr key={d.name} className="border-b border-slate-100 text-xs dark:border-white/[0.04]">
                        <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-white/70">{d.name}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-white/50">{d.count}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-white/50">{d.open}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-white/50">
                          {d.avgRes != null ? `${d.avgRes}d` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Section 5: Status Distribution ── */}
          <div className="mb-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Status Distribution</p>
            {statusData.some((s) => s.count > 0) ? (
              <div className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                {statusData.map((s) => (
                  <div key={s.label} className="mb-1.5 flex items-center gap-2 text-xs">
                    <span className="w-24 shrink-0 font-medium capitalize text-slate-600 dark:text-white/60">{s.label.replace(/_/g, " ")}</span>
                    <MiniBar value={s.count} max={statusMax} color={statusColors[s.label] || "bg-slate-400"} />
                    <span className="w-6 text-right font-bold text-slate-700 dark:text-white/70">{s.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-slate-400 dark:text-white/30">No status data.</p>
            )}
          </div>

          {/* ── Section 6: Hotspots ── */}
          {hotspots.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Recurring Issues / Hotspots</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {hotspots.slice(0, 6).map((h) => (
                  <div key={h.word} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-xs font-bold text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                      {h.count}
                    </span>
                    <span className="text-xs font-medium text-slate-700 dark:text-white/70">{h.word}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Section 7: Forecasting ── */}
          {forecasts && (
            <div className="mb-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Forecast</p>
              <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-[9px] text-slate-400 dark:text-white/30">Predicted Next Month</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-white/90">{forecasts.predicted} reports</p>
                    <p className={`text-[11px] font-semibold ${forecasts.direction === "increase" ? "text-rose-500" : forecasts.direction === "decrease" ? "text-emerald-500" : "text-slate-400"}`}>
                      {forecasts.direction === "increase" ? `↑ +${forecasts.pctChange}%` : forecasts.direction === "decrease" ? `↓ ${forecasts.pctChange}%` : "→ Stable"}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 dark:text-white/30">WMA</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-white/70">{forecasts.wma}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 dark:text-white/30">ES</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-white/70">{forecasts.es}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 dark:text-white/30">LR</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-white/70">{forecasts.lr}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Section 8: Resolution Performance ── */}
          <div className="mb-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Resolution Performance</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <KpiCard label="Avg Resolution" value={avgResolutionTime} unit="d" target={slaDays} optimalDir={-1} />
              <KpiCard label="SLA Compliance" value={slaRate} unit="%" target={90} optimalDir={1} />
              <KpiCard label="Overdue Reports" value={resolutionDays.filter((d) => d > slaDays).length} isGood={(resolutionDays.filter((d) => d > slaDays).length) === 0} />
              <KpiCard label="Resolved" value={resolvedReports.length} />
            </div>
          </div>

          {/* ── Section 9: AI Recommendations ── */}
          {recommendations.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">AI Recommendations</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {recommendations.map((r, i) => (
                  <div key={i} className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-50/50 p-4 shadow-sm dark:border-emerald-500/20 dark:from-emerald-500/10 dark:to-emerald-500/5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-emerald-600 dark:text-emerald-400">✓</span>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-white/90">{r.action}</p>
                        <p className="mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Impact: {r.impact}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {updatedAt && (
        <p className="mt-6 text-[9px] text-slate-400 dark:text-white/30">
          Updated {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
}
