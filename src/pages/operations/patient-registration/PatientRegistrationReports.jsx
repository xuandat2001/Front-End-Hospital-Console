import { useMemo } from "react";

// ---------------------------------------------------------------------------
// Illustrative, logic-based preview data. These are static placeholders that
// mirror the shape the data-aggregation backend will eventually return. The
// intelligence layer (historical registration logs + referral source data)
// will replace these constants later.
// ---------------------------------------------------------------------------
const TOTALS = { total: 12, active: 10, inactive: 2 };

const HEATMAP = {
  days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  // 12 two-hour buckets across the day (00:00 → 22:00).
  hours: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22],
  // intensity rows align with `days`; values 0-10 (illustrative).
  grid: [
    [1, 1, 2, 4, 7, 9, 8, 5, 4, 8, 9, 3],
    [1, 1, 2, 5, 8, 10, 7, 4, 5, 9, 8, 2],
    [0, 1, 2, 4, 7, 9, 6, 5, 4, 7, 9, 3],
    [1, 2, 3, 5, 8, 10, 8, 6, 5, 8, 10, 4],
    [1, 1, 2, 4, 6, 8, 7, 5, 4, 7, 8, 3],
    [0, 0, 1, 2, 4, 5, 5, 4, 3, 5, 6, 2],
    [0, 0, 1, 2, 3, 4, 4, 3, 2, 4, 5, 1],
  ],
  peakWindows: ["10 AM – 12 PM", "6 PM – 8 PM"],
  // Mini bar chart on the right (hourly intake distribution, illustrative).
  miniBars: [4, 6, 9, 12, 15, 11, 7, 13, 16, 8],
};

const SOURCE_BREAKDOWN = [
  { key: "Emergency", value: 65, color: "#8B5CF6" },
  { key: "Direct Transfer", value: 20, color: "#14B8A6" },
  { key: "Elective Admission", value: 15, color: "#F59E0B" },
];

const WARD_BREAKDOWN = [
  { ward: "Emergency", pct: 65 },
  { ward: "Direct Transfer", pct: 7 },
  { ward: "Clean", pct: 25 },
  { ward: "General", pct: 20 },
  { ward: "Maternity", pct: 22 },
  { ward: "Pediatrics", pct: 15 },
];

const SOURCE_TRENDS = {
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  series: [
    { key: "Emergency", color: "#8B5CF6", values: [120, 160, 210, 260, 300, 340] },
    { key: "Direct Transfer", color: "#EF4444", values: [70, 90, 110, 130, 150, 170] },
    { key: "Elective Admission", color: "#34D399", values: [60, 80, 95, 110, 130, 150] },
  ],
  totalAdmissions: 850,
  rangeLabel: "last 6 months",
};

const IMPACT_RADAR = {
  axes: [
    { label: "Wait Time", value: 0.9 },
    { label: "Dept. Congestion", value: 0.75 },
    { label: "Bed Demand", value: 0.6 },
    { label: "Triage Delay", value: 0.5 },
    { label: "Staffing Load", value: 0.8 },
    { label: "Throughput", value: 0.55 },
  ],
};

const IMPACT_CARDS = [
  { title: "Wait Time", metric: "+20 min", caption: "Peak-hour intake impact", tone: "rose" },
  { title: "Department Congestion Index", metric: "High", caption: "During 6–8 PM surge", tone: "amber" },
  { title: "Wait Time Impact", metric: "Elevated", caption: "Vs. off-peak baseline", tone: "rose" },
  { title: "Department Congestion Index", metric: "Watch", caption: "Trending upward", tone: "amber" },
];

export default function PatientRegistrationReports() {
  return (
    <div className="relative px-6 pb-6 pt-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-violet-700 dark:text-violet-300 sm:text-3xl">
              Patient Registration Reports
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Retrospective data to help administration plan future shifts and understand where patient volume originates.
            </p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {TOTALS.total} total patients — {TOTALS.active} active, {TOTALS.inactive} inactive.
            </p>
          </div>
          <span className="rounded-full border border-sky-300/60 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-700 dark:border-sky-400/30 dark:text-sky-300">
            Logic-Based · Data Aggregation
          </span>
        </div>
      </div>

      {/* 2 x 2 report grid */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PeakIntakeHeatmapCard data={HEATMAP} />
        <AdmissionSourceBreakdownCard sources={SOURCE_BREAKDOWN} wards={WARD_BREAKDOWN} />
        <AdmissionSourceTrendsCard data={SOURCE_TRENDS} />
        <PeakIntakeImpactCard radar={IMPACT_RADAR} cards={IMPACT_CARDS} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card 1 — Peak Intake Hour Heatmap (Logic-Based Trend Plotting)     */
/* ------------------------------------------------------------------ */
function PeakIntakeHeatmapCard({ data }) {
  const { days, hours, grid, peakWindows, miniBars } = data;

  const cellColor = (value) => {
    // Teal → violet ramp keyed on intensity (0-10).
    const t = Math.max(0, Math.min(1, value / 10));
    const r = Math.round(20 + (139 - 20) * t);
    const g = Math.round(184 + (92 - 184) * t);
    const b = Math.round(166 + (246 - 166) * t);
    const alpha = 0.18 + 0.72 * t;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <Card>
      <CardTitle accent="logic">Peak Intake Hour Heatmap (Logic-Based Trend Plotting)</CardTitle>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row">
        {/* Heatmap grid */}
        <div className="min-w-0 flex-1">
          <div className="flex">
            <span className="mr-1.5 flex items-center text-[9px] font-semibold uppercase tracking-wide text-slate-400 [writing-mode:vertical-rl] [transform:rotate(180deg)]">
              Days of week
            </span>
            <div className="min-w-0 flex-1">
              {days.map((day, ri) => (
                <div key={day} className="flex items-center gap-1">
                  <span className="w-7 shrink-0 text-right text-[9px] font-medium text-slate-500 dark:text-slate-400">
                    {day}
                  </span>
                  <div className="flex flex-1 gap-[2px] py-[1px]">
                    {grid[ri].map((value, ci) => (
                      <div
                        key={ci}
                        className="h-4 flex-1 rounded-[2px]"
                        style={{ backgroundColor: cellColor(value) }}
                        title={`${day} ${hours[ci]}:00 — ${value} registrations`}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {/* X axis */}
              <div className="mt-1 flex items-center gap-1">
                <span className="w-7 shrink-0" />
                <div className="flex flex-1 gap-[2px]">
                  {hours.map((h) => (
                    <span key={h} className="flex-1 text-center text-[8px] text-slate-400">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-1 pl-8 text-center text-[9px] font-medium text-slate-400">
                Hours of day
              </p>
            </div>
          </div>
        </div>

        {/* Peak windows + mini bar chart */}
        <div className="w-full shrink-0 border-t border-slate-100 pt-3 lg:w-40 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0 dark:border-slate-800">
          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
            Peak Registration Times:
          </p>
          <ul className="mt-1 space-y-0.5">
            {peakWindows.map((w) => (
              <li key={w} className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-300">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500" />
                {w}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex h-16 items-end gap-1">
            {miniBars.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-sky-400/70 dark:bg-sky-500/60"
                style={{ height: `${(v / Math.max(...miniBars)) * 100}%` }}
              />
            ))}
          </div>
          <p className="mt-1.5 text-center text-[9px] italic text-slate-400">
            illustrative logic-based data
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Card 2 — Admission Source Breakdown (Data Aggregation)            */
/* ------------------------------------------------------------------ */
function AdmissionSourceBreakdownCard({ sources, wards }) {
  return (
    <Card>
      <CardTitle accent="logic">Admission Source Breakdown (Data Aggregation)</CardTitle>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Big labelled percentages */}
        <div className="min-w-0 flex-1 space-y-3">
          {sources.map((s) => (
            <div key={s.key}>
              <p className="text-lg font-extrabold leading-tight" style={{ color: s.color }}>
                {s.key}: {s.value}%
              </p>
              <p className="text-[10px] italic text-slate-400">(illustrative data)</p>
            </div>
          ))}
        </div>

        {/* Donut chart */}
        <Donut segments={sources} className="mx-auto shrink-0" />

        {/* Breakdown per ward */}
        <div className="w-full shrink-0 border-t border-slate-100 pt-3 sm:w-36 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0 dark:border-slate-800">
          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Breakdown per Ward</p>
          <ul className="mt-1.5 space-y-1">
            {wards.map((w) => (
              <li key={w.ward} className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                <span>{w.ward}</span>
                <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">{w.pct}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function Donut({ segments, size = 132, thickness = 26, className = "" }) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  let offset = 0;
  const arcs = segments.map((s) => {
    const fraction = s.value / total;
    const dash = fraction * circumference;
    const arc = {
      color: s.color,
      dashArray: `${dash} ${circumference - dash}`,
      dashOffset: -offset,
    };
    offset += dash;
    return arc;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className="stroke-slate-100 dark:stroke-slate-800"
        />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={thickness}
            strokeDasharray={arc.dashArray}
            strokeDashoffset={arc.dashOffset}
            strokeLinecap="butt"
          />
        ))}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Card 3 — Admission Source Trends (Historical Trend Plotting)      */
/* ------------------------------------------------------------------ */
function AdmissionSourceTrendsCard({ data }) {
  return (
    <Card>
      <CardTitle accent="logic">Admission Source Trends (Historical Trend Plotting)</CardTitle>
      <div className="mt-3 flex flex-wrap gap-3">
        {data.series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.key}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-stretch gap-4">
        <div className="min-w-0 flex-1">
          <StackedAreaChart series={data.series} months={data.months} />
        </div>
        <div className="flex w-28 shrink-0 flex-col justify-center border-l border-slate-100 pl-4 dark:border-slate-800">
          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Total Admissions:</p>
          <p className="text-4xl font-extrabold tracking-tight text-violet-600 dark:text-violet-300">
            {data.totalAdmissions}
          </p>
          <p className="text-[10px] text-slate-400">({data.rangeLabel})</p>
        </div>
      </div>
    </Card>
  );
}

function StackedAreaChart({ series, months }) {
  const width = 320;
  const height = 200;
  const pad = { top: 8, right: 6, bottom: 18, left: 26 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const count = months.length;

  // Cumulative stacked totals per month.
  const stacked = useMemo(() => {
    const cum = new Array(count).fill(0);
    return series.map((s) => {
      const layer = s.values.map((v, i) => {
        const base = cum[i];
        cum[i] += v;
        return { base, top: cum[i] };
      });
      return { color: s.color, layer };
    });
  }, [series, count]);

  const max = useMemo(() => {
    const totals = new Array(count).fill(0);
    series.forEach((s) => s.values.forEach((v, i) => (totals[i] += v)));
    return Math.max(700, Math.ceil(Math.max(...totals) / 100) * 100);
  }, [series, count]);

  const x = (i) => pad.left + (count === 1 ? 0 : (i / (count - 1)) * plotW);
  const y = (v) => pad.top + plotH * (1 - v / max);

  const yTicks = [];
  for (let v = 0; v <= max; v += 100) yTicks.push(v);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Gridlines + Y labels */}
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={pad.left} y1={y(t)} x2={width - pad.right} y2={y(t)} className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="1" />
          <text x={pad.left - 4} y={y(t) + 3} textAnchor="end" className="fill-slate-400 text-[8px]">{t}</text>
        </g>
      ))}

      {/* Stacked areas (draw bottom layer first) */}
      {stacked.map((s, si) => {
        const topPts = s.layer.map((p, i) => `${x(i)},${y(p.top)}`);
        const basePts = s.layer.map((p, i) => `${x(i)},${y(p.base)}`).reverse();
        const path = `M ${topPts.join(" L ")} L ${basePts.join(" L ")} Z`;
        return <path key={si} d={path} fill={s.color} fillOpacity="0.85" />;
      })}

      {/* X labels */}
      {months.map((m, i) => (
        <text key={m} x={x(i)} y={height - 4} textAnchor="middle" className="fill-slate-400 text-[8px]">{m}</text>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Card 4 — Peak Intake Impact Analysis (Logic-Based)                */
/* ------------------------------------------------------------------ */
function PeakIntakeImpactCard({ radar, cards }) {
  const left = cards.slice(0, 2);
  const right = cards.slice(2, 4);

  return (
    <Card>
      <CardTitle accent="logic">Peak Intake Impact Analysis (Logic-Based)</CardTitle>
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex w-28 shrink-0 flex-col gap-2">
          {left.map((c, i) => (
            <ImpactChip key={i} {...c} />
          ))}
        </div>
        <RadarChart axes={radar.axes} className="shrink-0" />
        <div className="flex w-28 shrink-0 flex-col gap-2">
          {right.map((c, i) => (
            <ImpactChip key={i} {...c} />
          ))}
        </div>
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Summary: peak-hour surges drive longer intake wait times and elevated department congestion. Use these
        illustrative historical patterns to inform shift planning and staffing decisions ahead of recurring peaks.
      </p>
    </Card>
  );
}

const CHIP_TONES = {
  rose: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300",
  amber: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300",
};

function ImpactChip({ title, metric, caption, tone }) {
  return (
    <div className={`rounded-lg border px-2.5 py-2 text-center ${CHIP_TONES[tone] || CHIP_TONES.amber}`}>
      <p className="text-[10px] font-semibold leading-tight">{title}</p>
      <p className="text-sm font-extrabold leading-tight">{metric}</p>
      <p className="text-[9px] opacity-80">{caption}</p>
    </div>
  );
}

function RadarChart({ axes, size = 168, className = "" }) {
  const center = size / 2;
  const radius = size / 2 - 26;
  const count = axes.length;
  const levels = 4;

  const point = (value, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const r = radius * value;
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)];
  };

  const ringPoints = (level) =>
    axes
      .map((_, i) => {
        const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
        const r = radius * (level / levels);
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
      })
      .join(" ");

  const dataPoints = axes.map((a, i) => point(a.value, i).join(",")).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      {/* Concentric rings */}
      {Array.from({ length: levels }, (_, l) => (
        <polygon
          key={l}
          points={ringPoints(l + 1)}
          fill="none"
          className="stroke-slate-200 dark:stroke-slate-700"
          strokeWidth="1"
        />
      ))}
      {/* Spokes */}
      {axes.map((_, i) => {
        const [px, py] = point(1, i);
        return <line key={i} x1={center} y1={center} x2={px} y2={py} className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />;
      })}
      {/* Data polygon */}
      <polygon points={dataPoints} fill="rgba(139,92,246,0.25)" stroke="#8B5CF6" strokeWidth="2" />
      {axes.map((a, i) => {
        const [px, py] = point(a.value, i);
        return <circle key={i} cx={px} cy={py} r="2.5" fill="#8B5CF6" />;
      })}
      {/* Axis labels */}
      {axes.map((a, i) => {
        const [lx, ly] = point(1.18, i);
        const anchor = Math.abs(lx - center) < 6 ? "middle" : lx > center ? "start" : "end";
        return (
          <text key={a.label} x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle" className="fill-slate-500 text-[7px] dark:fill-slate-400">
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Shared primitives (mirrors PatientRegistrationPerformance)         */
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
