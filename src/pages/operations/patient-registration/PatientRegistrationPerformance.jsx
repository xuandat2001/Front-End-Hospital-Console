import { useCallback, useEffect, useMemo, useState } from "react";
import { intelligenceService } from "../../../services/intelligence/intelligenceApi";

// Lookback window for the snapshot (matches the 7-point sparkline trend).
const LOOKBACK_DAYS = 7;

// Maps the engine's step keys to the workflow node icons, and supplies the
// terminal "Bed Assigned" node (the endpoint of the door-to-bed interval, which
// is not itself a dwell step the backend reports).
const STEP_ICONS = {
  registration: "register",
  triage: "triage",
  insurance: "insurance",
  attendingReview: "review",
  bedSearch: "search",
  transport: "transport",
};

const PRIORITY_COLORS = {
  CRITICAL: "#EF4444",
  URGENT: "#F97316",
  STANDARD: "#FACC15",
};

// ---------------------------------------------------------------------------
// Preview fallbacks. Rendered only when the logic-based endpoint is
// unreachable, so the page degrades gracefully instead of going blank.
// ---------------------------------------------------------------------------
const DOOR_TO_BED_PREVIEW = { avgMinutes: 55, targetMinutes: 45, trend: [49, 50, 48, 52, 51, 53, 55] };
const ABANDONMENT_PREVIEW = { ratePct: 3.8, previousDayPct: 3.3, trend: [3.1, 3.0, 3.2, 3.4, 3.3, 3.5, 3.8] };
const WORKFLOW_STEPS_PREVIEW = [
  { id: "registration", label: "Registration", icon: "register", avgMinutes: 5 },
  { id: "triage", label: "Triage", icon: "triage", avgMinutes: 8 },
  { id: "insurance", label: "Insurance Verification", icon: "insurance", avgMinutes: 22, flagged: true, callout: { kind: "Workflow Analysis", text: "AI efficiency suggestion pending.", placement: "top" } },
  { id: "attendingReview", label: "Attending Review", icon: "review", avgMinutes: 11 },
  { id: "bedSearch", label: "Bed Search", icon: "search", avgMinutes: 9 },
  { id: "transport", label: "Wait for Transport", icon: "transport", avgMinutes: 18, flagged: true, callout: { kind: "Workflow Analysis", text: "AI efficiency suggestion pending.", placement: "bottom" } },
  { id: "bedAssigned", label: "Bed Assigned", icon: "bed", avgMinutes: 0, terminal: true },
];
const STEP_DISTRIBUTION_PREVIEW = {
  categories: ["Registration", "Triage", "Insurance Verification", "Attending Review", "Bed Search", "Wait for Transport"],
  series: [
    { key: "Critical", color: PRIORITY_COLORS.CRITICAL, values: [5, 10, 14, 9, 8, 16] },
    { key: "Urgent", color: PRIORITY_COLORS.URGENT, values: [4, 7, 18, 5, 7, 16] },
    { key: "Standard", color: PRIORITY_COLORS.STANDARD, values: [4, 6, 24, 5, 6, 16] },
  ],
};

function mapDoorToBed(doorToBed) {
  if (!doorToBed) return DOOR_TO_BED_PREVIEW;
  return {
    avgMinutes: doorToBed.avgMinutes ?? 0,
    targetMinutes: doorToBed.targetMinutes ?? 0,
    trend: (doorToBed.trend || []).map((point) => point.avgMinutes ?? 0),
  };
}

function mapAbandonment(abandonment) {
  if (!abandonment) return ABANDONMENT_PREVIEW;
  return {
    ratePct: abandonment.todayPct ?? abandonment.ratePct ?? 0,
    previousDayPct: abandonment.previousDayPct ?? 0,
    trend: (abandonment.trend || []).map((point) => point.ratePct ?? 0),
  };
}

// Logic-based flags drive the red workflow nodes; the callout text stays an
// "AI pending" placeholder until the AI Workflow Analysis layer is built.
function mapWorkflowSteps(steps, aiEnabled) {
  if (!steps || steps.length === 0) return WORKFLOW_STEPS_PREVIEW;

  let flaggedSeen = 0;
  const nodes = steps.map((step) => {
    const node = {
      id: step.key,
      label: step.label,
      icon: STEP_ICONS[step.key] || "register",
      avgMinutes: step.avgMinutes ?? 0,
      flagged: Boolean(step.flagged),
    };
    if (step.flagged) {
      node.callout = {
        kind: "Workflow Analysis",
        text: aiEnabled ? step.suggestion || "" : "AI efficiency suggestion pending.",
        placement: flaggedSeen % 2 === 0 ? "top" : "bottom",
      };
      flaggedSeen += 1;
    }
    return node;
  });

  nodes.push({ id: "bedAssigned", label: "Bed Assigned", icon: "bed", avgMinutes: 0, terminal: true });
  return nodes;
}

function mapStepDistribution(distribution) {
  if (!distribution || !distribution.series) return STEP_DISTRIBUTION_PREVIEW;
  return {
    categories: distribution.categories || [],
    series: distribution.series.map((s) => ({
      key: s.label || s.priority,
      color: PRIORITY_COLORS[s.priority] || "#94A3B8",
      values: s.values || [],
    })),
  };
}

export default function PatientRegistrationPerformance() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await intelligenceService.getRegistrationPerformance({ days: LOOKBACK_DAYS });
      setSnapshot(res?.data || null);
      setError("");
    } catch (loadError) {
      console.error(loadError);
      setSnapshot(null);
      setError(loadError.message || "Failed to load registration performance intelligence.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const doorToBed = useMemo(() => mapDoorToBed(snapshot?.doorToBed), [snapshot]);
  const abandonment = useMemo(() => mapAbandonment(snapshot?.abandonment), [snapshot]);
  const aiEnabled = Boolean(snapshot?.bottleneck?.aiAnalysis?.enabled);
  const workflowSteps = useMemo(
    () => mapWorkflowSteps(snapshot?.steps, aiEnabled),
    [snapshot, aiEnabled],
  );
  const distribution = useMemo(() => mapStepDistribution(snapshot?.stepDistribution), [snapshot]);

  const doorAboveTarget = doorToBed.avgMinutes > doorToBed.targetMinutes;
  const abandonmentUp = abandonment.ratePct > abandonment.previousDayPct;

  if (loading && !snapshot) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="relative px-6 pb-6 pt-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-violet-700 dark:text-violet-300 sm:text-3xl">
              Patient Registration Performance
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Analyze intake speed, identify workflow delays, and view abandonment metrics.
            </p>
            {error && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Showing preview data — {error}
              </p>
            )}
          </div>
          <span className="rounded-full border border-violet-300/60 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold text-violet-700 dark:border-violet-400/30 dark:text-violet-300">
            Hybrid intelligence · Logic + AI
          </span>
        </div>
      </div>

      {/* 2 x 2 metric grid */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DoorToBedCard data={doorToBed} aboveTarget={doorAboveTarget} />
        <AbandonmentCard data={abandonment} trendingUp={abandonmentUp} />
        <BottleneckCard steps={workflowSteps} aiEnabled={aiEnabled} />
        <StepDistributionCard data={distribution} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card 1 — Average Door-to-Bed Time (Logic-Based Analytics)          */
/* ------------------------------------------------------------------ */
function DoorToBedCard({ data, aboveTarget }) {
  return (
    <Card>
      <CardTitle accent="logic">Average Door-to-Bed Time (Logic-Based Analytics)</CardTitle>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl leading-none ${aboveTarget ? "text-red-500" : "text-emerald-500"}`}>
            {aboveTarget ? "↑" : "↓"}
          </span>
          <span className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {data.avgMinutes}
          </span>
          <span className="text-xl font-semibold text-slate-500 dark:text-slate-400">min (avg)</span>
        </div>
        <Sparkline
          values={data.trend}
          stroke="#8B5CF6"
          fill="rgba(139,92,246,0.12)"
          className="h-14 w-40 shrink-0"
        />
      </div>
      <div className="mt-4 space-y-1 text-xs">
        <p className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-violet-400" />
          Target: <span className="font-semibold text-slate-700 dark:text-slate-200">{data.targetMinutes} min</span>
        </p>
        <p className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span className="inline-block h-0 w-3 border-t-2 border-dashed border-slate-400" />
          Segmented by Priority
        </p>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Card 2 — Intake Process Abandonment Rate (Logic-Based Metrics)     */
/* ------------------------------------------------------------------ */
function AbandonmentCard({ data, trendingUp }) {
  return (
    <Card>
      <CardTitle accent="logic">Intake Process Abandonment Rate (Logic-Based Metrics)</CardTitle>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-block h-2 w-7 rounded-full bg-orange-400" />
          <span className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {data.ratePct.toFixed(1)}%
          </span>
        </div>
        <Sparkline
          values={data.trend}
          stroke="#F97316"
          fill="rgba(249,115,22,0.12)"
          endDot
          className="h-14 w-40 shrink-0"
        />
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span className={`font-semibold ${trendingUp ? "text-red-500" : "text-emerald-500"}`}>
          {trendingUp ? "▲" : "▼"}
        </span>
        Previous Day:{" "}
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {data.previousDayPct.toFixed(1)}%
        </span>
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Card 3 — Admission Workflow Bottleneck Identifier (AI-Based)       */
/* ------------------------------------------------------------------ */
function BottleneckCard({ steps, aiEnabled }) {
  const topCallouts = steps.filter((s) => s.callout?.placement === "top" && s.flagged);
  const bottomCallouts = steps.filter((s) => s.callout?.placement === "bottom" && s.flagged);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <CardTitle accent="ai">Admission Workflow Bottleneck Identifier (AI-Based Analysis)</CardTitle>
        {!aiEnabled && (
          <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            AI analysis pending
          </span>
        )}
      </div>

      {/* Top callouts */}
      <div className="mt-4 flex flex-wrap gap-2">
        {topCallouts.map((step) => (
          <Callout key={step.id} step={step} />
        ))}
      </div>

      {/* Workflow chain */}
      <div className="mt-3 flex items-start justify-between gap-1 overflow-x-auto pb-1">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-start">
            <WorkflowStep step={step} />
            {idx < steps.length - 1 && (
              <div className="mt-5 flex h-px w-4 items-center sm:w-6">
                <span className="h-0.5 w-full bg-slate-300 dark:bg-slate-600" />
                <span className="-ml-1 text-slate-300 dark:text-slate-600">›</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom callouts */}
      <div className="mt-3 flex flex-wrap gap-2">
        {bottomCallouts.map((step) => (
          <Callout key={step.id} step={step} />
        ))}
      </div>
    </Card>
  );
}

function Callout({ step }) {
  return (
    <div className="max-w-[15rem] rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-[10px] leading-snug shadow-sm dark:border-red-500/40 dark:bg-red-500/10">
      <p className="font-bold text-red-600 dark:text-red-400">
        RED Step: Avg {step.avgMinutes} min.
      </p>
      <p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">{step.callout.kind}:</p>
      <p className="text-slate-600 dark:text-slate-300">{step.callout.text}</p>
    </div>
  );
}

function WorkflowStep({ step }) {
  const flagged = step.flagged;
  return (
    <div className="flex w-16 shrink-0 flex-col items-center text-center sm:w-[4.5rem]">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full border ${
          flagged
            ? "border-red-400 bg-red-100 text-red-600 ring-2 ring-red-300/50 dark:border-red-500/60 dark:bg-red-500/20 dark:text-red-300"
            : step.terminal
              ? "border-emerald-300 bg-emerald-100 text-emerald-600 dark:border-emerald-500/50 dark:bg-emerald-500/15 dark:text-emerald-300"
              : "border-violet-200 bg-violet-100 text-violet-600 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300"
        }`}
      >
        <StepIcon name={step.icon} />
      </div>
      <p className="mt-1.5 text-[9px] font-semibold leading-tight text-slate-600 dark:text-slate-300">
        {step.label}
      </p>
    </div>
  );
}

function StepIcon({ name }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "register":
      return (
        <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>
      );
    case "triage":
      return (
        <svg {...common}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" /></svg>
      );
    case "insurance":
      return (
        <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
      );
    case "review":
      return (
        <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 15l2 2 4-4" /></svg>
      );
    case "search":
      return (
        <svg {...common}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
      );
    case "transport":
      return (
        <svg {...common}><path d="M10 17h4V5H2v12h3" /><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" /><circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>
      );
    case "bed":
      return (
        <svg {...common}><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20" /><circle cx="7" cy="11" r="2" /></svg>
      );
    default:
      return <svg {...common}><circle cx="12" cy="12" r="9" /></svg>;
  }
}

/* ------------------------------------------------------------------ */
/* Card 4 — Detailed Step Time Distribution by Triage Priority        */
/* ------------------------------------------------------------------ */
function StepDistributionCard({ data }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <CardTitle accent="logic">Detailed Step Time Distribution by Triage Priority (Logic-Based)</CardTitle>
        <div className="flex shrink-0 flex-wrap gap-3">
          {data.series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
              {s.key}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <GroupedBarChart data={data} />
      </div>
    </Card>
  );
}

function GroupedBarChart({ data }) {
  const { categories, series } = data;
  const max = useMemo(() => {
    const all = series.flatMap((s) => s.values);
    return Math.max(120, Math.ceil(Math.max(...all) / 20) * 20);
  }, [series]);

  const yTicks = useMemo(() => {
    const ticks = [];
    for (let v = 0; v <= max; v += 20) ticks.push(v);
    return ticks.reverse();
  }, [max]);

  const chartHeight = 220;

  return (
    <div className="flex">
      {/* Y axis */}
      <div className="mr-1 flex flex-col items-end justify-between" style={{ height: chartHeight }}>
        {yTicks.map((t) => (
          <span key={t} className="text-[9px] leading-none text-slate-400">{t}</span>
        ))}
      </div>

      <div className="relative flex-1">
        <span className="absolute -left-1 top-1/2 origin-center -translate-x-full -rotate-90 whitespace-nowrap text-[9px] font-medium text-slate-400">
          Average (m)
        </span>

        {/* Gridlines */}
        <div className="absolute inset-0 flex flex-col justify-between" style={{ height: chartHeight }}>
          {yTicks.map((t) => (
            <span key={t} className="block w-full border-t border-slate-100 dark:border-slate-800" />
          ))}
        </div>

        {/* Bars */}
        <div
          className="relative flex items-end justify-between gap-2 border-b border-slate-200 dark:border-slate-700"
          style={{ height: chartHeight }}
        >
          {categories.map((cat, ci) => (
            <div key={cat} className="flex h-full flex-1 items-end justify-center gap-[3px]">
              {series.map((s) => {
                const value = s.values[ci] || 0;
                const heightPct = (value / max) * 100;
                return (
                  <div key={s.key} className="flex h-full w-full max-w-[14px] flex-col items-center justify-end">
                    {value > 0 && (
                      <span className="mb-0.5 text-[8px] font-semibold text-slate-500 dark:text-slate-400">
                        {value}
                      </span>
                    )}
                    <div
                      className="w-full rounded-t-sm"
                      style={{ height: `${heightPct}%`, backgroundColor: s.color }}
                      title={`${cat.replace(/\n/g, " ")} · ${s.key}: ${value} min`}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* X axis labels */}
        <div className="mt-1 flex justify-between gap-2">
          {categories.map((cat) => (
            <span
              key={cat}
              className="flex-1 whitespace-pre-line text-center text-[9px] font-medium leading-tight text-slate-500 dark:text-slate-400"
            >
              {cat}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared primitives                                                  */
/* ------------------------------------------------------------------ */
function Card({ children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {children}
    </div>
  );
}

function CardTitle({ children, accent }) {
  const dot = accent === "ai" ? "bg-violet-500" : "bg-sky-500";
  return (
    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
      {children}
    </h3>
  );
}

function Sparkline({ values, stroke, fill, endDot = false, className = "" }) {
  const width = 160;
  const height = 56;
  const pad = 6;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = (width - pad * 2) / (values.length - 1);

  const points = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (height - pad * 2) * (1 - (v - min) / span);
    return [x, y];
  });

  const line = "M " + points.map(([x, y]) => `${x} ${y}`).join(" L ");
  const area = `${line} L ${points[points.length - 1][0]} ${height - pad} L ${points[0][0]} ${height - pad} Z`;
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} preserveAspectRatio="none">
      <path d={area} fill={fill} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {endDot && <circle cx={last[0]} cy={last[1]} r="3" fill="none" stroke={stroke} strokeWidth="2" />}
    </svg>
  );
}
