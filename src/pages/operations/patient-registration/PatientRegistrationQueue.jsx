import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useRegistrationStore from "../../../hooks/useRegistrationStore";
import useRegistrationQueue from "../../../hooks/useRegistrationQueue";
import { patientService } from "../../../services/core-modules/patientApi";
import { formatDateTime, formatTime, formatRelative } from "../../../utils/dateFormat";

function isSameDay(value) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function hashString(input) {
  let hash = 0;
  const str = String(input || "");
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

// Triage vitals are not part of the registration event yet, so they remain a
// cosmetic, stable derivation for the drill-down. Severity / priority / source
// all come from the backend assessment.
function deriveVitals(seedSource) {
  const seed = hashString(seedSource);
  return {
    heartRate: 60 + (seed % 65),
    bloodPressure: `${110 + (seed % 55)}/${65 + (seed % 30)}`,
    temperature: (36 + (seed % 35) / 10).toFixed(1),
    spo2: 90 + (seed % 10),
  };
}

const PRIORITY_META = {
  CRITICAL: {
    label: "CRITICAL",
    rank: 3,
    color: "var(--danger)",
    badge:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
    text: "text-red-600 dark:text-red-400",
  },
  URGENT: {
    label: "URGENT",
    rank: 2,
    color: "var(--warning)",
    badge:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300",
    text: "text-orange-600 dark:text-orange-400",
  },
  STANDARD: {
    label: "STANDARD",
    rank: 1,
    color: "var(--primary)",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    text: "text-amber-600 dark:text-amber-400",
  },
};

const STATUS_META = {
  PENDING: {
    label: "Pending",
    dot: "var(--warning)",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  },
  ACCEPTED: {
    label: "Accepted",
    dot: "var(--success)",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  REMOVED: {
    label: "Removed",
    dot: "var(--text-muted)",
    badge:
      "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  REJECTED: {
    label: "Rejected",
    dot: "var(--danger)",
    badge:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  },
};

const ACTIVE_STATUSES = ["PENDING", "ACCEPTED"];

const STATUS_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "ACCEPTED", label: "Accepted" },
  { id: "INACTIVE", label: "Removed" },
];

function priorityRank(priority) {
  return PRIORITY_META[priority]?.rank || 0;
}

function VelocityChart({ series }) {
  const counts = series.map((point) => point.count);
  const peak = Math.max(...counts, 1);
  const maxY = Math.max(20, Math.ceil(peak / 5) * 5);
  const ticks = [maxY, (maxY * 3) / 4, maxY / 2, maxY / 4, 0];

  const width = 320;
  const height = 150;
  const padX = 6;
  const padY = 8;

  const points = series.map((point, index) => {
    const x =
      padX + (index * (width - padX * 2)) / Math.max(series.length - 1, 1);
    const y = height - padY - (point.count / maxY) * (height - padY * 2);
    return { x, y, ...point };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div className="flex gap-2">
      <div className="flex w-8 flex-col justify-between py-1 text-right text-[10px] font-medium text-slate-400">
        {ticks.map((tick) => (
          <span key={tick}>{Math.round(tick)}</span>
        ))}
      </div>
      <div className="relative flex-1">
        <span className="absolute right-1 top-0 text-[10px] font-semibold text-violet-500 dark:text-violet-300">
          patients/hour
        </span>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-40 w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="velocityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => {
            const y = height - padY - (tick / maxY) * (height - padY * 2);
            return (
              <line
                key={tick}
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeWidth="1"
                className="text-slate-200 dark:text-slate-700"
              />
            );
          })}
          <path d={areaPath} fill="url(#velocityFill)" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((point) => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="3.5" fill="var(--primary)" />
              <text
                x={point.x}
                y={point.y - 8}
                textAnchor="middle"
                className="fill-slate-500 dark:fill-slate-300"
                fontSize="9"
                fontWeight="600"
              >
                {point.count}
              </text>
            </g>
          ))}
        </svg>
        <div className="mt-1 flex justify-between text-[10px] font-medium text-slate-400">
          {series.map((point) => (
            <span key={point.label}>{point.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function WaitTimesChart({ bars }) {
  const peak = Math.max(...bars.map((bar) => bar.minutes), 1);
  const maxY = Math.max(20, Math.ceil(peak / 10) * 10);
  const ticks = [maxY, (maxY * 3) / 4, maxY / 2, maxY / 4, 0];

  return (
    <div className="flex gap-2">
      <div className="flex w-8 flex-col justify-between py-1 text-right text-[10px] font-medium text-slate-400">
        {ticks.map((tick) => (
          <span key={tick}>{Math.round(tick)}</span>
        ))}
      </div>
      <div className="flex-1">
        <div className="flex h-40 items-end justify-around gap-4 border-b border-slate-200 dark:border-slate-700">
          {bars.map((bar) => (
            <div
              key={bar.priority}
              className="flex h-full w-full max-w-[64px] flex-col items-center justify-end"
            >
              <span className="mb-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                {bar.minutes} min
              </span>
              <div
                className="w-full rounded-t-lg transition-all"
                style={{
                  height: `${(bar.minutes / maxY) * 100}%`,
                  backgroundColor: PRIORITY_META[bar.priority].color,
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-around gap-4">
          {bars.map((bar) => (
            <div
              key={bar.priority}
              className="mt-1 w-full max-w-[64px] text-center"
            >
              <p className="m-0 text-[11px] font-semibold capitalize text-slate-600 dark:text-slate-300">
                {PRIORITY_META[bar.priority].label.toLowerCase()}
              </p>
              <p className="m-0 text-[10px] text-slate-400">
                {bar.count} waiting
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusActionButtons({ entry, onAction, pending, size = "sm" }) {
  const padding = size === "lg" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs";
  const isActive = ACTIVE_STATUSES.includes(entry.status);
  const busyLabel = {
    remove: "Removing…",
    readd: "Re-adding…",
  }[pending];

  return (
    <div className="flex flex-wrap gap-2">
      {isActive && (
        <button
          type="button"
          disabled={Boolean(pending)}
          onClick={() => onAction(entry.eventId, "remove")}
          className={`rounded-lg border border-red-300 font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40 ${padding}`}
        >
          {pending === "remove" ? busyLabel : "Remove"}
        </button>
      )}

      {!isActive && (
        <button
          type="button"
          disabled={Boolean(pending)}
          onClick={() => onAction(entry.eventId, "readd")}
          className={`rounded-lg bg-violet-600 font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-60 ${padding}`}
        >
          {pending === "readd" ? busyLabel : "Re-add"}
        </button>
      )}
    </div>
  );
}

function ViewMoreRosterCard({ hiddenCount, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View ${hiddenCount} more registrations`}
      className="group relative flex min-h-[280px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-violet-300/70 bg-violet-50/70 p-4 text-center transition-all hover:border-violet-400 hover:shadow-md dark:border-violet-800/70 dark:bg-violet-950/30 dark:hover:border-violet-600"
    >
      <span className="relative text-lg font-bold text-violet-700 transition-colors group-hover:text-violet-600 dark:text-violet-300 dark:group-hover:text-violet-200">
        View more
      </span>
      <span className="relative mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        +{hiddenCount} registration{hiddenCount === 1 ? "" : "s"}
      </span>
    </button>
  );
}

function RegistrationCard({
  entry,
  onOpenDrillDown,
  onAction,
  pendingAction,
  rowRef,
}) {
  const meta = PRIORITY_META[entry.priority] || PRIORITY_META.STANDARD;
  const statusMeta = STATUS_META[entry.status] || STATUS_META.PENDING;

  return (
    <article
      key={entry.eventId}
      ref={rowRef}
      className="card flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition-shadow dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="m-0 text-lg font-bold text-slate-900 dark:text-white">
          {entry.ellyId || "Unknown ID"}
        </h3>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusMeta.badge}`}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: statusMeta.dot }}
          />
          {statusMeta.label}
        </span>
      </div>

      <span
        className={`mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-bold ${meta.badge}`}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: meta.color }}
        />
        {meta.label}
      </span>

      <p className={`mt-2 mb-3 text-sm font-semibold ${meta.text}`}>
        Triage Severity: {entry.severity.toFixed(1)}
      </p>

      <dl className="m-0 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
        <div>
          <dt className="inline font-semibold text-slate-900 dark:text-white">
            Name:
          </dt>{" "}
          <dd className="inline">{entry.fullName || entry.ellyId || "—"}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-slate-900 dark:text-white">
            Hospital ID:
          </dt>{" "}
          <dd className="inline">{entry.hospitalId || "—"}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-slate-900 dark:text-white">
            Registration Source:
          </dt>{" "}
          <dd className="inline">{entry.source}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-slate-900 dark:text-white">
            Registered:
          </dt>{" "}
          <dd className="inline">
            {formatTime(entry.registeredAt)}
            {isSameDay(entry.registeredAt) ? " (Current Day)" : ""}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => onOpenDrillDown(entry.eventId)}
          className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-violet-600 hover:text-violet-500 dark:text-violet-400"
        >
          <span aria-hidden="true">↳</span> Review Triage Note
        </button>
        <StatusActionButtons
          entry={entry}
          onAction={onAction}
          pending={pendingAction}
        />
      </div>
    </article>
  );
}

function TriageDrillDown({ registration, onClose, onAction, pending }) {
  const meta = PRIORITY_META[registration.priority] || PRIORITY_META.STANDARD;
  const statusMeta = STATUS_META[registration.status] || STATUS_META.PENDING;
  const { vitals } = registration;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Triage Note · Clinical Drill-down
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {registration.ellyId || "Unknown patient"}
            </h2>
            <p className="m-0 text-sm text-slate-500 dark:text-slate-400">
              {registration.fullName || "Name pending EMR sync"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex flex-col gap-2">
              <span
                className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${meta.badge}`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                {meta.label}
              </span>
              <span
                className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.badge}`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: statusMeta.dot }}
                />
                {statusMeta.label}
              </span>
            </div>
            <div className="text-right">
              <p className="m-0 text-xs uppercase tracking-wide text-slate-400">
                Triage Severity
              </p>
              <p className={`m-0 text-2xl font-bold ${meta.text}`}>
                {registration.severity.toFixed(1)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="m-0 text-xs uppercase tracking-wide text-slate-400">
                Hospital ID
              </p>
              <p className="m-0 font-semibold text-slate-800 dark:text-slate-200">
                {registration.hospitalId || "—"}
              </p>
            </div>
            <div>
              <p className="m-0 text-xs uppercase tracking-wide text-slate-400">
                Registration Source
              </p>
              <p className="m-0 font-semibold text-slate-800 dark:text-slate-200">
                {registration.source}
              </p>
            </div>
            <div>
              <p className="m-0 text-xs uppercase tracking-wide text-slate-400">
                Registered
              </p>
              <p className="m-0 font-semibold text-slate-800 dark:text-slate-200">
                {formatDateTime(registration.registeredAt)}
              </p>
            </div>
            <div>
              <p className="m-0 text-xs uppercase tracking-wide text-slate-400">
                Time in Queue
              </p>
              <p className="m-0 font-semibold text-slate-800 dark:text-slate-200">
                {formatRelative(registration.registeredAt)}
              </p>
            </div>
          </div>

          {registration.chiefComplaint && (
            <div>
              <p className="m-0 mb-1 text-xs uppercase tracking-wide text-slate-400">
                Chief Complaint
              </p>
              <p className="m-0 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
                {registration.chiefComplaint}
              </p>
            </div>
          )}

          {registration.reasons.length > 0 && (
            <div>
              <p className="m-0 mb-1 text-xs uppercase tracking-wide text-slate-400">
                Logic-Based Assessment
              </p>
              <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
                {registration.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="m-0 mb-2 text-xs uppercase tracking-wide text-slate-400">
              Triage Vitals
            </p>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: "HR", value: `${vitals.heartRate}` },
                { label: "BP", value: vitals.bloodPressure },
                { label: "Temp", value: `${vitals.temperature}°` },
                { label: "SpO₂", value: `${vitals.spo2}%` },
              ].map((vital) => (
                <div
                  key={vital.label}
                  className="rounded-lg border border-slate-200 p-2 dark:border-slate-800"
                >
                  <p className="m-0 text-[10px] uppercase tracking-wide text-slate-400">
                    {vital.label}
                  </p>
                  <p className="m-0 text-sm font-bold text-slate-800 dark:text-slate-200">
                    {vital.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {registration.decision?.action && (
            <p className="m-0 text-xs text-slate-400">
              Last action: {registration.decision.action}
              {registration.decision.automated ? " (automated)" : ""}
              {registration.decision.actorId
                ? ` · by ${registration.decision.actorId}`
                : ""}
              {registration.decision.decidedAt
                ? ` · ${formatDateTime(registration.decision.decidedAt)}`
                : ""}
            </p>
          )}

          {registration.hospitalMRN && (
            <p className="m-0 text-xs text-slate-400">
              EMR Record · MRN {registration.hospitalMRN}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-5 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
          <StatusActionButtons
            entry={registration}
            onAction={onAction}
            pending={pending}
            size="lg"
          />
        </div>
      </div>
    </div>
  );
}

export default function PatientRegistrationQueue() {
  const { queue, summary, loading, error, actionState, refresh, remove, readd } =
    useRegistrationQueue();

  const focusRegistrationEventId = useRegistrationStore(
    (state) => state.focusRegistrationEventId,
  );
  const clearFocusRegistration = useRegistrationStore(
    (state) => state.clearFocusRegistration,
  );

  const [names, setNames] = useState({});
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [drillDownId, setDrillDownId] = useState(null);
  const [showFullRoster, setShowFullRoster] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const rowRefs = useRef({});

  // Normalise backend assessments into the shape the UI renders. Severity,
  // priority, source, and reasons all come from the intelligence service.
  const entries = useMemo(
    () =>
      queue.map((entry) => {
        const priority = PRIORITY_META[entry.priority] ? entry.priority : "STANDARD";
        return {
          ...entry,
          priority,
          severity:
            typeof entry.severityScore === "number" ? entry.severityScore : 0,
          fullName: entry.fullName || names[entry.ellyId] || null,
          source: entry.registrationSource || "—",
          chiefComplaint: entry.chiefComplaint || "",
          reasons: Array.isArray(entry.assessmentReasons)
            ? entry.assessmentReasons
            : [],
          vitals: deriveVitals(entry.eventId),
        };
      }),
    [queue, names],
  );

  const activeEntries = useMemo(
    () => entries.filter((entry) => ACTIVE_STATUSES.includes(entry.status)),
    [entries],
  );

  // Enrich missing patient names from patient-service (the registration event
  // carries only the ellyId). Attempts are cached (including misses) so polling
  // does not refetch the same ids.
  useEffect(() => {
    const pendingIds = [
      ...new Set(
        queue
          .filter((entry) => entry.ellyId && !entry.fullName && !(entry.ellyId in names))
          .map((entry) => entry.ellyId),
      ),
    ];
    if (!pendingIds.length) return;

    let cancelled = false;
    Promise.all(
      pendingIds.map(async (ellyId) => {
        try {
          const response = await patientService.getPatientByEllyId(ellyId);
          const profile = response.data?.patient || response.data;
          return [ellyId, profile?.fullName || null];
        } catch {
          return [ellyId, null];
        }
      }),
    ).then((pairs) => {
      if (cancelled) return;
      setNames((prev) => {
        const next = { ...prev };
        pairs.forEach(([id, name]) => {
          next[id] = name;
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [queue, names]);

  const intakeSeries = useMemo(() => {
    const now = new Date();
    const buckets = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const start = new Date(now);
      start.setMinutes(0, 0, 0);
      start.setHours(start.getHours() - offset);
      buckets.push({
        label: `${String(start.getHours()).padStart(2, "0")}:00`,
        start: start.getTime(),
        count: 0,
      });
    }

    entries.forEach((entry) => {
      const time = new Date(entry.registeredAt || 0).getTime();
      const bucket = buckets.find(
        (item) => time >= item.start && time < item.start + 3600000,
      );
      if (bucket) bucket.count += 1;
    });

    return buckets;
  }, [entries]);

  const waitTimeBars = useMemo(() => {
    const byPriority = summary?.byPriority || {};
    const averageWait = summary?.averageWaitMinutes || {};
    const hasSummary = Boolean(summary?.byPriority);

    const fallback = { CRITICAL: { total: 0, count: 0 }, URGENT: { total: 0, count: 0 }, STANDARD: { total: 0, count: 0 } };
    if (!hasSummary) {
      activeEntries.forEach((entry) => {
        const group = fallback[entry.priority];
        if (!group) return;
        group.total += minutesSince(entry.registeredAt);
        group.count += 1;
      });
    }

    return ["CRITICAL", "URGENT", "STANDARD"].map((priority) => ({
      priority,
      count: hasSummary ? byPriority[priority] || 0 : fallback[priority].count,
      minutes: hasSummary
        ? averageWait[priority] || 0
        : fallback[priority].count
          ? Math.round(fallback[priority].total / fallback[priority].count)
          : 0,
    }));
  }, [summary, activeEntries]);

  const statusCounts = useMemo(() => {
    if (summary?.byStatus) return summary.byStatus;
    return entries.reduce(
      (acc, entry) => {
        acc[entry.status] = (acc[entry.status] || 0) + 1;
        return acc;
      },
      { PENDING: 0, ACCEPTED: 0, REMOVED: 0, REJECTED: 0 },
    );
  }, [summary, entries]);

  const filteredEntries = useMemo(() => {
    const filtered = entries.filter((entry) => {
      if (statusFilter === "ALL") return true;
      if (statusFilter === "INACTIVE") {
        return !ACTIVE_STATUSES.includes(entry.status);
      }
      return entry.status === statusFilter;
    });

    return [...filtered].sort((left, right) => {
      const rankDelta = priorityRank(right.priority) - priorityRank(left.priority);
      if (rankDelta !== 0) return rankDelta;
      return (
        new Date(right.registeredAt || 0).getTime() -
        new Date(left.registeredAt || 0).getTime()
      );
    });
  }, [entries, statusFilter]);

  const visibleEntries = useMemo(
    () => filteredEntries.slice(0, 3),
    [filteredEntries],
  );
  const hasMoreEntries = filteredEntries.length > 3;
  const hiddenEntryCount = filteredEntries.length - visibleEntries.length;

  useEffect(() => {
    if (!focusRegistrationEventId) return;

    const row = rowRefs.current[focusRegistrationEventId];
    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      row.classList.add("ring-2", "ring-teal-400");
      const timeoutId = setTimeout(() => {
        row.classList.remove("ring-2", "ring-teal-400");
        clearFocusRegistration();
      }, 2400);
      return () => clearTimeout(timeoutId);
    }

    if (
      hasMoreEntries &&
      filteredEntries.some((entry) => entry.eventId === focusRegistrationEventId)
    ) {
      setShowFullRoster(true);
      return;
    }

    clearFocusRegistration();
  }, [
    focusRegistrationEventId,
    filteredEntries,
    hasMoreEntries,
    clearFocusRegistration,
  ]);

  const handleAction = useCallback(
    async (eventId, action) => {
      setFeedback(null);
      const verb = { remove: "removed", readd: "re-added" }[action];
      try {
        if (action === "remove") await remove(eventId);
        else if (action === "readd") await readd(eventId);
        setFeedback({ type: "success", message: `Patient ${verb}.` });
      } catch (actionError) {
        setFeedback({ type: "error", message: actionError.message });
      }
    },
    [remove, readd],
  );

  const drillDownRegistration = useMemo(
    () => entries.find((entry) => entry.eventId === drillDownId) || null,
    [entries, drillDownId],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-1 text-3xl font-bold text-slate-900 dark:text-white">
            Patient Registrations
          </h1>
          <p className="m-0 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Oversee the intake pipeline, review triage priorities, and manage
            flow. Patients are auto-accepted by logical priority — review the
            graphs and remove or re-add patients based on their current status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            {summary?.activeCount ?? activeEntries.length} active
          </span>
          <button
            type="button"
            onClick={refresh}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {feedback && (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            feedback.type === "error"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="m-0 mb-1 text-sm font-bold text-slate-800 dark:text-slate-200">
            Intake Velocity
            <span className="ml-1 font-normal text-slate-400">
              (Registrations/Hr, Logic-Based Queue)
            </span>
          </h2>
          <p className="m-0 mb-3 text-xs text-slate-400">Last 6 hours</p>
          <VelocityChart series={intakeSeries} />
        </div>

        <div className="card rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="m-0 mb-1 text-sm font-bold text-slate-800 dark:text-slate-200">
            Live Wait Times by Priority
            <span className="ml-1 font-normal text-slate-400">
              (Chronological Sort)
            </span>
          </h2>
          <p className="m-0 mb-3 text-xs text-slate-400">
            Average minutes in active queue
          </p>
          <WaitTimesChart bars={waitTimeBars} />
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="m-0 text-lg font-bold text-slate-900 dark:text-white">
          Registration Roster
          <span className="ml-1 text-sm font-normal text-slate-400">
            (Logic-Based Priority, Triage Integrated)
          </span>
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((filter) => {
            const count =
              filter.id === "ALL"
                ? entries.length
                : filter.id === "INACTIVE"
                  ? (statusCounts.REMOVED || 0) + (statusCounts.REJECTED || 0)
                  : statusCounts[filter.id] || 0;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === filter.id
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {filter.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {loading && entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading registration roster…
          </p>
        </div>
      ) : filteredEntries.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {visibleEntries.map((entry) => (
            <RegistrationCard
              key={entry.eventId}
              entry={entry}
              onOpenDrillDown={setDrillDownId}
              onAction={handleAction}
              pendingAction={actionState[entry.eventId]}
              rowRef={(node) => {
                if (node) rowRefs.current[entry.eventId] = node;
              }}
            />
          ))}
          {hasMoreEntries && (
            <ViewMoreRosterCard
              hiddenCount={hiddenEntryCount}
              onClick={() => setShowFullRoster(true)}
            />
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            No registrations in this view
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            New registrations will appear here as portal, EMR, and triage feeds
            stream in and are assessed by logical priority.
          </p>
        </div>
      )}

      {drillDownRegistration && (
        <TriageDrillDown
          registration={drillDownRegistration}
          onClose={() => setDrillDownId(null)}
          onAction={handleAction}
          pending={actionState[drillDownRegistration.eventId]}
        />
      )}

      {showFullRoster && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onClick={() => setShowFullRoster(false)}
        >
          <div
            className="max-h-[88vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h3 className="m-0 text-lg font-bold text-slate-900 dark:text-white">
                  Full Registration Roster
                </h3>
                <p className="m-0 mt-1 text-xs text-slate-400">
                  Showing {filteredEntries.length} registrations
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFullRoster(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            <div className="max-h-[72vh] overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredEntries.map((entry) => (
                  <RegistrationCard
                    key={entry.eventId}
                    entry={entry}
                    onOpenDrillDown={setDrillDownId}
                    onAction={handleAction}
                    pendingAction={actionState[entry.eventId]}
                    rowRef={(node) => {
                      if (node) rowRefs.current[entry.eventId] = node;
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
