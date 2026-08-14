import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock3,
  ExternalLink,
  FileSearch,
  Info,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";
import { formatDateTime } from "../../../../utils/dateFormat";
import { resolveBodyModelVariant } from "./patientBodyModelConfig";
import {
  getAnatomyAvailability,
  getPatientSystemConfig,
} from "./patientSystemClinicalConfig";
import { displayMeasurementValue } from "./patientSystemDataNormalizer";

const STATUS_PRESENTATION = {
  "within-reference-range": {
    label: "Within Reference Range",
    Icon: CheckCircle2,
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
  "within-target": {
    label: "Within Target",
    Icon: CheckCircle2,
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
  borderline: {
    label: "Borderline",
    Icon: AlertTriangle,
    classes:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
  },
  abnormal: {
    label: "Abnormal",
    Icon: AlertTriangle,
    classes:
      "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-200",
  },
  "urgent-review": {
    label: "Urgent Review",
    Icon: ShieldAlert,
    classes:
      "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200",
  },
  "critical-review": {
    label: "Critical Review",
    Icon: ShieldAlert,
    classes:
      "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-100",
  },
  "clinician-review-required": {
    label: "Clinician Review Required",
    Icon: Stethoscope,
    classes:
      "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200",
  },
  "insufficient-data": {
    label: "Insufficient Data",
    Icon: CircleDashed,
    classes:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300",
  },
  outdated: {
    label: "May Be Outdated",
    Icon: Clock3,
    classes:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
  },
  "result-pending": {
    label: "Result Pending",
    Icon: Clock3,
    classes:
      "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200",
  },
  "conflicting-data": {
    label: "Conflicting Data",
    Icon: AlertTriangle,
    classes:
      "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200",
  },
  "outside-supported-population": {
    label: "Outside Supported Population",
    Icon: Info,
    classes:
      "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200",
  },
  recorded: {
    label: "Recorded",
    Icon: CheckCircle2,
    classes:
      "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200",
  },
  unavailable: {
    label: "Unavailable",
    Icon: CircleDashed,
    classes:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300",
  },
};

function StatusBadge({ status, compact = false }) {
  const meta = STATUS_PRESENTATION[status] || STATUS_PRESENTATION["clinician-review-required"];
  const StatusIcon = meta.Icon;
  return (
    <span
      role="status"
      aria-label={`Status: ${meta.label}`}
      className={`inline-flex items-center gap-1 rounded-md border font-semibold ${meta.classes} ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
    >
      <StatusIcon size={compact ? 11 : 12} strokeWidth={2.4} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function formatObservedAt(value) {
  return value ? formatDateTime(value) || "Date unavailable" : "Date unavailable";
}

function sourceTypeLabel(value) {
  const labels = {
    "patient-reported": "Patient-reported",
    "wearable-derived": "Wearable-derived (unverified)",
    "manually-entered": "Manually entered",
    device: "Device-derived",
    laboratory: "Laboratory",
    "vital-sign": "Vital sign",
    imaging: "Imaging",
    questionnaire: "Questionnaire",
    "clinician-assessment": "Clinician assessment",
    calculated: "Calculated",
    "medical-profile": "Medical profile",
    "FHIR observation": "FHIR observation",
  };
  return labels[value] || value || "Source type unavailable";
}

function verificationLabel(value) {
  if (value === "reviewed") return "Reviewed";
  if (value === "unreviewed") return "Unreviewed";
  return "Verification unavailable";
}

function Sparkline({ trend, label }) {
  if (!trend?.available || trend.points.length < 2) return null;
  const values = trend.points.map((point) => point.numericValue);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = trend.points
    .map((point, index) => {
      const x = trend.points.length === 1 ? 50 : (index / (trend.points.length - 1)) * 100;
      const y = 28 - ((point.numericValue - min) / range) * 24;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 32"
      role="img"
      aria-label={`${label} trend. ${trend.summary}`}
      className="mt-2 h-10 w-full overflow-visible text-violet-600 dark:text-violet-300"
      preserveAspectRatio="none"
    >
      <title>{trend.summary}</title>
      <line
        x1="0"
        y1="28"
        x2="100"
        y2="28"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {trend.points.map((point, index) => {
        const [x, y] = points.split(" ")[index].split(",");
        return (
          <circle
            key={point.id || `${point.observedAt}-${index}`}
            cx={x}
            cy={y}
            r="1.8"
            fill="currentColor"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}

function ProvenanceBlock({ record }) {
  return (
    <dl className="grid grid-cols-1 gap-2 text-[11px] text-slate-600 dark:text-slate-300 sm:grid-cols-2">
      <div>
        <dt className="font-semibold text-slate-500 dark:text-slate-400">Observed</dt>
        <dd>{formatObservedAt(record.observedAt)}</dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-500 dark:text-slate-400">Source type</dt>
        <dd>{sourceTypeLabel(record.sourceType)}</dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-500 dark:text-slate-400">Source</dt>
        <dd>{record.sourceLabel || "Source unavailable"}</dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-500 dark:text-slate-400">Verification</dt>
        <dd>
          {verificationLabel(record.verificationStatus)}
          {record.reviewedBy ? ` · ${record.reviewedBy}` : ""}
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="font-semibold text-slate-500 dark:text-slate-400">
          Reference range used
        </dt>
        <dd>
          {record.referenceRange?.text || "Reference range unavailable"}
          {record.referenceRange?.source ? ` · ${record.referenceRange.source}` : ""}
        </dd>
      </div>
      {record.referenceRange?.reportedAtTime && (
        <div className="sm:col-span-2">
          <dt className="font-semibold text-slate-500 dark:text-slate-400">
            Source-reported range at the time
          </dt>
          <dd>
            {record.referenceRange.reportedAtTime.text ||
              [
                record.referenceRange.reportedAtTime.low !== null
                  ? `low ${record.referenceRange.reportedAtTime.low}`
                  : "",
                record.referenceRange.reportedAtTime.high !== null
                  ? `high ${record.referenceRange.reportedAtTime.high}`
                  : "",
              ]
                .filter(Boolean)
                .join(", ") ||
              "Reference range unavailable"}
          </dd>
        </div>
      )}
      {record.referenceRange?.requirement && (
        <div className="sm:col-span-2">
          <dt className="font-semibold text-slate-500 dark:text-slate-400">
            Interpretation requirement
          </dt>
          <dd>{record.referenceRange.requirement}</dd>
        </div>
      )}
      <div className="sm:col-span-2">
        <dt className="font-semibold text-slate-500 dark:text-slate-400">
          Complete report
        </dt>
        <dd>
          {record.completeReportReference?.href ? (
            <a
              href={record.completeReportReference.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-sky-700 underline-offset-2 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-sky-300"
            >
              {record.completeReportReference.label || "Open report"}
              <ExternalLink size={11} aria-hidden="true" />
            </a>
          ) : (
            record.completeReportReference?.label || "Complete report reference unavailable"
          )}
        </dd>
      </div>
    </dl>
  );
}

function MeasurementCard({ measurement }) {
  const { config, latest, currentRecords, history, trend, hasData } = measurement;

  return (
    <article
      className="rounded-lg border border-slate-200/80 bg-white/35 p-3.5 dark:border-white/10 dark:bg-white/[0.025]"
      data-measurement-id={config.id}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {config.clinicalName}
          </h4>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {config.patientFriendlyName}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <StatusBadge status={latest.status} />
          {latest.status === "outdated" &&
            latest.classificationStatus &&
            latest.classificationStatus !== "outdated" && (
              <StatusBadge status={latest.classificationStatus} compact />
            )}
        </div>
      </div>

      {hasData ? (
        <div className="mt-3 space-y-2">
          {currentRecords.map((record) => (
            <div
              key={record.id}
              className={`border-l-2 px-3 py-1.5 ${
                currentRecords.length > 1
                  ? "border-rose-400 bg-rose-50/50 dark:bg-rose-950/15"
                  : "border-violet-400 bg-slate-50/45 dark:bg-white/[0.025]"
              }`}
            >
              <p className="text-lg font-bold tabular-nums text-slate-950 dark:text-white">
                {displayMeasurementValue(record)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {formatObservedAt(record.observedAt)} · {record.sourceLabel || "Source unavailable"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 border-l-2 border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
          No data recorded.
        </p>
      )}

      {(hasData || latest.clinicianMessage !== "No data recorded.") && (
        <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {latest.clinicianMessage}
        </p>
      )}

      {latest.contextApplied?.length > 0 && (
        <ul className="mt-2 space-y-1 text-[11px] text-violet-700 dark:text-violet-300">
          {latest.contextApplied.map((item) => (
            <li key={item} className="flex gap-1.5">
              <Info size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      {latest.recommendedAction && (
        <p className="mt-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
          Safe next step: {latest.recommendedAction}
        </p>
      )}

      <details className="group mt-3 rounded-md border border-slate-200/80 bg-transparent dark:border-slate-700/80">
        <summary
          aria-label={`Show trend, provenance, and interpretation details for ${config.clinicalName}`}
          className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-3 py-2 text-xs font-semibold text-slate-700 outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-slate-200"
        >
          Trend, provenance & interpretation
          <ChevronDown
            size={14}
            className="transition-transform motion-reduce:transition-none group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="space-y-3 border-t border-slate-200 px-3 py-3 dark:border-slate-700">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Trend
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {trend.summary}
            </p>
            <Sparkline trend={trend} label={config.clinicalName} />
          </div>

          {hasData ? (
            <div className="space-y-3">
              {history.slice(0, 10).map((record) => (
                <div
                  key={`provenance-${record.id}`}
                  className="border-t border-slate-200 pt-3 first:border-t-0 first:pt-0 dark:border-slate-700"
                >
                  <p className="mb-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {displayMeasurementValue(record)}
                  </p>
                  <ProvenanceBlock record={record} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No provenance is available because no value is recorded.
            </p>
          )}

          <div className="border-l-2 border-slate-300 bg-slate-50/60 px-3 py-2 text-[11px] text-slate-600 dark:border-slate-600 dark:bg-white/[0.025] dark:text-slate-300">
            <p className="font-semibold text-slate-700 dark:text-slate-200">Rule governance</p>
            <p className="mt-1">
              Version {latest.ruleGovernance?.version || "unavailable"} ·{" "}
              {latest.ruleGovernance?.status || "draft"} · Clinical approval not recorded
            </p>
          </div>
        </div>
      </details>
    </article>
  );
}

function SafetyContextList({ title, items }) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white/30 p-3.5 dark:border-white/10 dark:bg-white/[0.025]">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
        {title}
      </h4>
      {items.length ? (
        <ul className="mt-2 space-y-1.5">
          {items.map((item) => (
            <li key={`${title}-${item.text}`} className="text-sm text-slate-800 dark:text-slate-100">
              <span className="font-medium">{item.text}</span>
              <span className="ml-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                {item.statusLabel || verificationLabel(item.verificationStatus)} ·{" "}
                {item.sourceLabel}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          No data recorded.
        </p>
      )}
    </div>
  );
}

function RelatedReports({ reports }) {
  if (!reports.length) return null;
  return (
    <details className="group rounded-lg border border-slate-200/80 bg-white/30 dark:border-white/10 dark:bg-white/[0.025]">
      <summary
        aria-label="Show related complete clinical reports"
        className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg p-3.5 text-sm font-semibold text-slate-800 outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-slate-100"
      >
        <span className="flex items-center gap-2">
          <FileSearch size={16} aria-hidden="true" />
          Related reports ({reports.length})
        </span>
        <ChevronDown
          size={15}
          className="transition-transform motion-reduce:transition-none group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <ul className="space-y-2 border-t border-slate-200 p-3.5 dark:border-slate-700">
        {reports.map((report) => (
          <li key={report.id || report.title} className="border-l-2 border-slate-300 px-3 py-1.5 dark:border-slate-600">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              {report.title}
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {formatObservedAt(report.observedAt)} · {report.sourceLabel} ·{" "}
              {verificationLabel(report.verificationStatus)}
            </p>
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
              {report.completeReportReference?.label}
            </p>
          </li>
        ))}
      </ul>
    </details>
  );
}

function SystemClinicalView({ systemId, data, modelVariant }) {
  const system = data?.systems?.[systemId];
  const config = system?.config || getPatientSystemConfig(systemId);
  const anatomyAvailability = getAnatomyAvailability(systemId, modelVariant);
  const measurements = system?.measurements || [];

  return (
    <>
      <div
        className={`border-l-2 px-3 py-2.5 ${
          anatomyAvailability.represented
            ? "border-violet-400 bg-violet-50/35 text-slate-700 dark:bg-violet-950/15 dark:text-slate-200"
            : "border-amber-400 bg-amber-50/35 text-slate-700 dark:bg-amber-950/15 dark:text-slate-200"
        }`}
      >
        <div className="flex items-start gap-2">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">3D representation</p>
            <p className="mt-1 text-xs leading-relaxed">{anatomyAvailability.message}</p>
            {anatomyAvailability.productGap && (
              <p className="mt-1 text-[11px] opacity-85">
                {anatomyAvailability.productGap}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200/80 bg-white/25 divide-x divide-y divide-slate-200/80 dark:border-white/10 dark:bg-white/[0.02] dark:divide-white/10 sm:grid-cols-4 sm:divide-y-0">
        {[
          ["Available", system?.availableCount || 0],
          ["Require review", system?.reviewCount || 0],
          ["Outdated", system?.outdatedCount || 0],
          ["No data", Math.max(0, measurements.length - (system?.availableCount || 0))],
        ].map(([label, value]) => (
          <div
            key={label}
            className="px-3 py-2.5 text-left"
          >
            <p className="text-xl font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </p>
          </div>
        ))}
      </div>

      {systemId === "immune" && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <SafetyContextList title="Allergies" items={data?.allergies || []} />
          <SafetyContextList title="Vaccinations" items={data?.vaccinations || []} />
        </div>
      )}

      <div className="space-y-3" aria-label={`${config.label} measurements`}>
        {measurements.map((item) => (
          <MeasurementCard key={item.config.id} measurement={item} />
        ))}
      </div>

      <RelatedReports reports={system?.relatedReports || []} />
    </>
  );
}

function OverviewPriorityCard({ priority }) {
  return (
    <article className="rounded-lg border border-slate-200/80 bg-white/30 p-3.5 dark:border-white/10 dark:bg-white/[0.025]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 text-[11px] font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200">
            {priority.rank}
          </span>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {priority.label}
          </h4>
        </div>
        <StatusBadge status={priority.status} compact />
      </div>

      {priority.items.length ? (
        <ul className="mt-3 space-y-2">
          {priority.items.slice(0, 2).map((item, index) => (
            <li
              key={`${priority.id}-${item.text}-${index}`}
              className="border-l-2 border-slate-300 px-3 py-1.5 text-xs text-slate-700 dark:border-slate-600 dark:text-slate-200"
            >
              <p className="font-medium">{item.text}</p>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                {item.statusLabel ? `${item.statusLabel} · ` : ""}
                {item.observedAt ? `${formatObservedAt(item.observedAt)} · ` : ""}
                {item.sourceLabel || "Source unavailable"}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {priority.emptyMessage}
        </p>
      )}

      {priority.note && (
        <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">{priority.note}</p>
      )}

      {priority.items.length > 2 && (
        <details className="group mt-2">
          <summary
            aria-label={`Show all ${priority.label}`}
            className="cursor-pointer list-none rounded text-[11px] font-semibold text-violet-700 outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-300"
          >
            Show {priority.items.length - 2} more
          </summary>
          <ul className="mt-2 space-y-1.5">
            {priority.items.slice(2).map((item, index) => (
              <li
                key={`${priority.id}-more-${item.text}-${index}`}
                className="text-xs text-slate-600 dark:text-slate-300"
              >
                {item.text}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

function WholeBodyOverview({ data }) {
  const priorities = data?.overview?.priorities || [];
  const secondary = data?.overview?.secondary;
  return (
    <>
      <div className="border-l-2 border-violet-400 bg-violet-50/35 px-3 py-2.5 text-xs leading-relaxed text-slate-700 dark:bg-violet-950/15 dark:text-slate-200">
        <div className="flex items-start gap-2">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            Whole-body orientation uses connected records only. The 3D view shows the exterior
            body and keeps embedded organs hidden.
          </p>
        </div>
      </div>

      <div className="space-y-3" aria-label="Whole-body clinical priorities">
        {priorities.slice(0, 8).map((priority) => (
          <OverviewPriorityCard key={priority.id} priority={priority} />
        ))}
      </div>

      <details className="group rounded-lg border border-slate-200/80 bg-white/30 dark:border-white/10 dark:bg-white/[0.025]">
        <summary
          aria-label="Show secondary whole-body context"
          className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg p-3.5 text-sm font-semibold text-slate-800 outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-slate-100"
        >
          Secondary context
          <ChevronDown
            size={15}
            className="transition-transform motion-reduce:transition-none group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="space-y-3 border-t border-slate-200 p-3.5 dark:border-slate-700">
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Current symptoms
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {secondary?.symptoms?.emptyMessage || "No data recorded."}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Historical admissions
            </p>
            {secondary?.admissions?.length ? (
              <ul className="mt-2 space-y-1.5">
                {secondary.admissions.slice(0, 5).map((item, index) => (
                  <li
                    key={`${item.text}-${item.observedAt}-${index}`}
                    className="text-xs text-slate-600 dark:text-slate-300"
                  >
                    {item.text} · {formatObservedAt(item.observedAt)} · {item.statusLabel}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                No data recorded.
              </p>
            )}
          </div>
        </div>
      </details>
    </>
  );
}

export default function PatientSystemInsightsPanel({
  activeSystem = "overview",
  data,
  patientGender,
}) {
  const config = getPatientSystemConfig(activeSystem);
  const modelResolution = resolveBodyModelVariant(patientGender);
  return (
    <section
      aria-labelledby="system-insights-title"
      data-testid="patient-system-insights-panel"
      data-active-system={activeSystem}
      className="system-insights-panel space-y-4 pb-2"
    >
      <header className="border-b border-slate-200/80 px-1 pb-4 dark:border-white/10">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-violet-200 text-violet-700 dark:border-violet-400/25 dark:text-violet-300">
            {activeSystem === "overview" ? (
              <FileSearch size={18} aria-hidden="true" />
            ) : (
              <Stethoscope size={18} aria-hidden="true" />
            )}
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-700 dark:text-violet-300">
              System insights
            </p>
            <h2
              id="system-insights-title"
              className="mt-0.5 text-xl font-semibold tracking-tight text-slate-950 dark:text-white"
            >
              {config.label}
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {config.summary}
            </p>
          </div>
        </div>
      </header>

      {activeSystem === "overview" ? (
        <WholeBodyOverview data={data} />
      ) : (
        <SystemClinicalView
          systemId={activeSystem}
          data={data}
          modelVariant={modelResolution.variant}
        />
      )}

    </section>
  );
}

export { StatusBadge };
