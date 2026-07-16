import { useCallback, useEffect, useMemo, useState } from "react";
import MiniLineChart from "../../../components/graphs/MiniLineChart";
import MiniPieChart from "../../../components/graphs/MiniPieChart";
import { intelligenceService } from "../../../services/intelligence/intelligenceApi";

const LIVE_REFRESH_MS = 30000;

// Ordered severity buckets shown on the "Active Insights by Severity" chart.
const SEVERITY_ORDER = ["Critical", "High", "Medium", "Low"];

// Urgency-driven palette so the severity panel reads as a triage scale
// (red → green) rather than a flat brand color. Each level also carries the
// recommended response window used by the action note.
const SEVERITY_META = {
  Critical: { color: "#DC2626", track: "#FEE2E2", sla: "Act now", chip: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  High: { color: "#EA580C", track: "#FFEDD5", sla: "Act today", chip: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  Medium: { color: "#D97706", track: "#FEF3C7", sla: "This week", chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  Low: { color: "#16A34A", track: "#DCFCE7", sla: "Monitor", chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
};

// Display domains for the insight breakdown. Each carries a plain-language
// description (so the label isn't vague) and the recommended first action used
// by the section's action note.
const DOMAIN_DEFS = [
  { key: "Capacity", label: "Beds & Capacity", color: "#8B5CF6", desc: "Beds, occupancy & patient flow", action: "free up beds and expedite discharges", match: ["CAPACITY", "BED", "OCCUPANCY"] },
  { key: "Staffing", label: "Staffing", color: "#14B8A6", desc: "Coverage & workload ratios", action: "rebalance shifts and on-call cover", match: ["STAFF", "STAFFING", "WORKLOAD", "NURSE"] },
  { key: "Equipment", label: "Equipment & Supplies", color: "#F59E0B", desc: "Devices, inventory & medicine stock", action: "restock and service flagged items", match: ["EQUIPMENT", "INVENTORY", "MEDICINE", "DEVICE"] },
  { key: "Emergency", label: "Emergency Load", color: "#3B82F6", desc: "ER demand & ambulance traffic", action: "open surge capacity and triage queue", match: ["EMERGENCY", "ER", "AMBULANCE"] },
  { key: "Clinical Risk", label: "Patient Safety", color: "#EC4899", desc: "Clinical risk & patient safety", action: "review at-risk patients with care teams", match: ["CLINICAL", "RISK", "PATIENT", "ADMISSION", "DEPARTMENT"] },
];

// Representative snapshot (same shape the analytics backend will return) so the
// dashboard stays meaningful before the backend lands or when it is unreachable.
function buildPreview() {
  return {
    generatedAt: new Date().toISOString(),
    overview: {
      totalBeds: 220,
      occupiedBeds: 180,
      availableBeds: 40,
      totalBedOccupancy: 82,
      availableIcuBeds: 5,
      activeEmergencyCases: 9,
      pendingAdmissions: 7,
    },
    kpis: {
      bedOccupancy: 82,
      activeInsights: 14,
      icuAvailable: 5,
      activeEmergencies: 9,
      pendingAdmissions: 7,
    },
    severity: { Critical: 3, High: 5, Medium: 4, Low: 2 },
    domains: { Capacity: 4, Staffing: 3, Equipment: 2, Emergency: 2, "Clinical Risk": 3 },
    domainSeverity: {
      Capacity: { Critical: 1, High: 2, Medium: 1, Low: 0 },
      Staffing: { Critical: 0, High: 1, Medium: 1, Low: 1 },
      Equipment: { Critical: 0, High: 1, Medium: 1, Low: 0 },
      Emergency: { Critical: 1, High: 1, Medium: 0, Low: 0 },
      "Clinical Risk": { Critical: 1, High: 0, Medium: 1, Low: 1 },
    },
    population: {
      departmentsTracked: 6,
      averageAge: 45.2,
      genderSplit: { male: 48, female: 52 },
      ageGroups: [
        { label: "0-17", total: 18 },
        { label: "18-35", total: 25 },
        { label: "36-60", total: 35 },
        { label: "60+", total: 22 },
      ],
    },
    departments: [
      { name: "Cardiology", score: 85 },
      { name: "Internal Medicine", score: 78 },
      { name: "Emergency Department", score: 92 },
      { name: "Pediatrics", score: 65 },
      { name: "Oncology", score: 70 },
      { name: "ENT", score: 55 },
    ],
  };
}

function metricsOf(snapshot) {
  return snapshot?.data?.metrics || snapshot?.metrics || snapshot?.data || {};
}

function listOf(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.insights)) return payload.data.insights;
  if (Array.isArray(payload?.insights)) return payload.insights;
  return [];
}

function normalizeSeverity(raw) {
  const value = String(raw || "").toUpperCase();
  if (value.includes("CRIT")) return "Critical";
  if (value.includes("HIGH")) return "High";
  if (value.includes("MED")) return "Medium";
  if (value.includes("LOW") || value.includes("INFO")) return "Low";
  return null;
}

function classifyDomain(insight) {
  const haystack = `${insight?.insightType || ""} ${insight?.category || ""} ${insight?.domain || ""}`.toUpperCase();
  const hit = DOMAIN_DEFS.find((domain) => domain.match.some((token) => haystack.includes(token)));
  return (hit || DOMAIN_DEFS[DOMAIN_DEFS.length - 1]).key;
}

function tallyInsights(insights) {
  const severity = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  const domains = DOMAIN_DEFS.reduce((acc, domain) => ({ ...acc, [domain.key]: 0 }), {});

  insights.forEach((insight) => {
    const bucket = normalizeSeverity(insight?.severity);
    if (bucket) severity[bucket] += 1;
    domains[classifyDomain(insight)] += 1;
  });

  return { severity, domains };
}

function tallyDomainSeverity(insights) {
  const baseline = DOMAIN_DEFS.reduce(
    (acc, domain) => ({
      ...acc,
      [domain.key]: { Critical: 0, High: 0, Medium: 0, Low: 0 },
    }),
    {},
  );

  insights.forEach((insight) => {
    const domainKey = classifyDomain(insight);
    const level = normalizeSeverity(insight?.severity);
    if (!level) return;
    baseline[domainKey][level] += 1;
  });

  return baseline;
}

function toTime(value) {
  if (!value) return "initializing";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "initializing" : date.toLocaleString();
}

function populationFromReport(reportPayload, fallbackPopulation) {
  const report = reportPayload?.data || reportPayload || {};
  const demographics = report?.demographics || {};
  const ageGroups = Array.isArray(demographics.ageGroups)
    ? demographics.ageGroups.map((group) => ({
        label: group.label,
        total: Number(group.total) || 0,
      }))
    : [];

  return {
    departmentsTracked: Array.isArray(demographics.departments)
      ? demographics.departments.length
      : fallbackPopulation.departmentsTracked,
    averageAge: Number(demographics.averageAge) || fallbackPopulation.averageAge,
    genderSplit: {
      male: Number(demographics.genderSplit?.male) || fallbackPopulation.genderSplit.male,
      female: Number(demographics.genderSplit?.female) || fallbackPopulation.genderSplit.female,
    },
    ageGroups: ageGroups.length ? ageGroups : fallbackPopulation.ageGroups,
  };
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const hospitalId = intelligenceService.defaultHospitalId;

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);

      const fallback = buildPreview();

      try {
        const [overviewRes, insightsRes, reportsRes] = await Promise.allSettled([
          intelligenceService.getAnalyticsOverview(hospitalId),
          intelligenceService.getActiveInsights(hospitalId),
          intelligenceService.getPatientReports({ days: 30 }),
        ]);

        const overviewOk = overviewRes.status === "fulfilled";
        const insightsOk = insightsRes.status === "fulfilled";
        const reportsOk = reportsRes.status === "fulfilled";

        if (!overviewOk && !insightsOk && !reportsOk) {
          throw (
            overviewRes.reason ||
            insightsRes.reason ||
            reportsRes.reason ||
            new Error("Analytics service unavailable")
          );
        }

        const overview = overviewOk ? metricsOf(overviewRes.value) : {};
        const insights = insightsOk ? listOf(insightsRes.value) : [];
        const tallied = insights.length ? tallyInsights(insights) : null;
        const domainSeverity = insights.length ? tallyDomainSeverity(insights) : null;

        const activeInsights = insights.length
          ? insights.length
          : overview.activeInsights ?? fallback.kpis.activeInsights;

        setData({
          generatedAt: new Date().toISOString(),
          overview: {
            totalBeds: overview.totalBeds ?? fallback.overview.totalBeds,
            occupiedBeds: overview.occupiedBeds ?? fallback.overview.occupiedBeds,
            availableBeds: overview.availableBeds ?? fallback.overview.availableBeds,
            totalBedOccupancy: overview.totalBedOccupancy ?? fallback.overview.totalBedOccupancy,
            availableIcuBeds: overview.availableIcuBeds ?? fallback.overview.availableIcuBeds,
            activeEmergencyCases:
              overview.activeEmergencyCases ?? fallback.overview.activeEmergencyCases,
            pendingAdmissions: overview.pendingAdmissions ?? fallback.overview.pendingAdmissions,
          },
          kpis: {
            bedOccupancy: overview.totalBedOccupancy ?? overview.icuOccupancy ?? fallback.kpis.bedOccupancy,
            activeInsights,
            icuAvailable: overview.availableIcuBeds ?? fallback.kpis.icuAvailable,
            activeEmergencies:
              overview.activeEmergencyCases ?? fallback.kpis.activeEmergencies,
            pendingAdmissions: overview.pendingAdmissions ?? fallback.kpis.pendingAdmissions,
          },
          severity: tallied?.severity ?? fallback.severity,
          domains: tallied?.domains ?? fallback.domains,
          domainSeverity: domainSeverity ?? fallback.domainSeverity,
          population: reportsOk
            ? populationFromReport(reportsRes.value, fallback.population)
            : fallback.population,
          // Department performance scoring is supplied by the analytics backend
          // (built later); fall back to representative data until then.
          departments: fallback.departments,
        });
        setPreview(false);
      } catch (error) {
        console.error(error);
        setData(fallback);
        setPreview(true);
      } finally {
        setUpdatedAt(new Date());
        setLoading(false);
        setRefreshing(false);
      }
    },
    [hospitalId],
  );

  useEffect(() => {
    loadData();
    const timer = window.setInterval(() => loadData({ silent: true }), LIVE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadData]);

  const severitySeries = useMemo(() => {
    const severity = data?.severity || {};
    return {
      data: SEVERITY_ORDER.map((label) => Number(severity[label]) || 0),
      labels: SEVERITY_ORDER,
    };
  }, [data]);

  const domainSlices = useMemo(() => {
    const domains = data?.domains || {};
    const domainSeverity = data?.domainSeverity || {};
    return DOMAIN_DEFS.filter((domain) => (Number(domains[domain.key]) || 0) > 0).map((domain) => ({
      key: domain.key,
      label: domain.label,
      desc: domain.desc,
      value: Number(domains[domain.key]) || 0,
      color: domain.color,
      breakdown: domainSeverity[domain.key] || { Critical: 0, High: 0, Medium: 0, Low: 0 },
    }));
  }, [data]);

  if (loading || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
      </div>
    );
  }

  const { kpis, overview, population } = data;
  const domainTotal = domainSlices.reduce((sum, slice) => sum + slice.value, 0);
  const severityTotal = severitySeries.data.reduce((sum, value) => sum + value, 0);
  const populationMax = Math.max(
    ...(population?.ageGroups || []).map((group) => Number(group.total) || 0),
    1,
  );
  const populationTotal = (population?.ageGroups || []).reduce(
    (sum, group) => sum + (Number(group.total) || 0),
    0,
  );
  const genderDonutSlices = [
    { label: "Male", value: Number(population.genderSplit?.male) || 0, color: "#3B82F6" },
    { label: "Female", value: Number(population.genderSplit?.female) || 0, color: "#EC4899" },
  ].filter((slice) => slice.value > 0);

  const kpiCards = [
    { label: "Total Beds", value: overview.totalBeds, tone: "text-slate-900 dark:text-white" },
    { label: "Bed Occupancy", value: `${Math.round(Number(kpis.bedOccupancy) || 0)}%`, tone: "text-purple-500" },
    { label: "ICU Available", value: kpis.icuAvailable, tone: "text-emerald-500" },
    { label: "Active Emergencies", value: kpis.activeEmergencies, tone: "text-rose-500" },
    { label: "Pending Admissions", value: kpis.pendingAdmissions, tone: "text-blue-500" },
  ];

  return (
    <div className="relative flex flex-col px-6 pb-2 pt-3">
      {/* Header */}
      <div className="sticky top-3 z-20 mb-5 rounded-2xl border border-white/60 bg-white/55 px-4 py-3 shadow-lg shadow-slate-900/8 ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45 dark:shadow-black/30 dark:ring-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-950 dark:text-white">
              Analytics Dashboard
            </h1>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
              Intelligence Command for real-time hospital decisions: capacity pressure, active risks, population shifts, and AI-ready outcome forecasting.
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Live snapshot updated {toTime(updatedAt)}
              {refreshing && " · refreshing…"}
            </p>
            {preview && (
              <p className="mt-1 text-xs text-amber-500">
                Showing offline preview — analytics service unavailable.
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center self-start">
            <button
              type="button"
              onClick={() => loadData({ silent: true })}
              className="btn btn-secondary shrink-0 whitespace-nowrap px-4 py-2 text-xs"
            >
              <span className="relative z-[1]">{refreshing ? "Refreshing…" : "Refresh"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Single-screen executive layout */}
      <div className="mb-2 grid grid-cols-1 items-stretch gap-3 xl:grid-cols-12">
        <section className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 xl:col-span-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Capacity &amp; Flow Snapshot</h3>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Live KPIs</span>
          </div>
          <div className="grid flex-1 auto-rows-fr grid-cols-2 gap-2">
            {kpiCards.map((card, index) => (
              <div
                key={card.label}
                className={`flex flex-col justify-center rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/50 ${
                  index === kpiCards.length - 1 ? "col-span-2" : ""
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className={`mt-0.5 text-base font-bold tabular-nums ${card.tone}`}>{card.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 xl:col-span-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Population Snapshot</h3>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{populationTotal} patients</span>
          </div>
          <div className="grid grid-cols-[1fr_1.15fr] gap-2">
            <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Avg Age</p>
              <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">{population.averageAge}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Gender Split</p>
              {genderDonutSlices.length ? (
                <MiniPieChart
                  compact
                  centerLabel={`${populationTotal}\npatients`}
                  slices={genderDonutSlices}
                />
              ) : (
                <p className="py-4 text-center text-[11px] text-slate-400">No gender data</p>
              )}
            </div>
          </div>
          <div className="mt-2 space-y-1.5">
            {(population.ageGroups || []).slice(0, 4).map((group) => {
              const total = Number(group.total) || 0;
              const width = Math.round((total / populationMax) * 100);
              return (
                <div key={group.label}>
                  <div className="mb-1 flex items-center justify-between text-[10px]">
                    <span className="font-medium text-slate-600 dark:text-slate-300">{group.label}</span>
                    <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{total}</span>
                  </div>
                  <div className="h-3.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900 xl:col-span-4 xl:row-span-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Where issues cluster</h3>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {severityTotal} open · {domainSlices.length} areas
            </span>
          </div>
          <p className="mb-2 text-[10px] text-slate-400">
            Each cluster shows total open issues and its severity mix (Critical/High/Medium/Low).
          </p>
          {domainTotal === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No active insights to break down.</p>
          ) : (
            <div className="space-y-1.5">
              {domainSlices
                .slice()
                .sort((a, b) => b.value - a.value)
                .map((slice) => {
                  const pct = Math.round((slice.value / domainTotal) * 100);
                  return (
                    <div key={slice.key} className="rounded-lg bg-slate-50 p-1.5 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
                            <span className="truncate">{slice.label}</span>
                          </p>
                          <p className="ml-3.5 truncate text-[9px] text-slate-400">{slice.desc}</p>
                        </div>
                        <p className="shrink-0 text-right text-[11px] font-bold tabular-nums text-slate-800 dark:text-slate-100">
                          {slice.value}
                        </p>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: slice.color }} />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[9px]">
                        {SEVERITY_ORDER.map((level) => {
                          const meta = SEVERITY_META[level];
                          const count = Number(slice.breakdown?.[level]) || 0;
                          return (
                            <span
                              key={`${slice.key}-${level}`}
                              className={`rounded-full px-1.5 py-0.5 font-semibold ${meta.chip}`}
                              title={`${level}: ${count}`}
                            >
                              {level}: {count}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
        {/* AI placeholder kept but compact */}
        <section className="shrink-0 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 xl:col-span-8">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              AI-Powered Outcome &amp; Risk Forecast
            </h3>
            <span className="rounded-full border border-violet-300 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:border-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              AI Placeholder
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_0.9fr]">
            <div className="h-16">
              <MiniLineChart data={[6, 8, 7, 9, 10, 9, 11]} variant="purple" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <p>
                Outcome
                <strong className="mt-0.5 block text-xs text-slate-900 dark:text-white">Pending AI</strong>
              </p>
              <p>
                Readmission
                <strong className="mt-0.5 block text-xs text-slate-900 dark:text-white">Pending AI</strong>
              </p>
              <p>
                7-day Risk
                <strong className="mt-0.5 block text-xs text-slate-900 dark:text-white">Queued</strong>
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Retained detailed population and department sections intentionally removed
          to keep this dashboard single-screen and focused on highest-signal blocks. */}
    </div>
  );
}
