import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  BedDouble,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  LoaderCircle,
  PanelRightOpen,
  RefreshCw,
  Scissors,
  Siren,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const SOURCE_COVERAGE_ITEMS = [
  { key: "appointments", label: "Appointments", icon: CalendarDays },
  { key: "surgeries", label: "Surgeries", icon: Scissors },
  { key: "staff", label: "Staff", icon: Users },
  { key: "emergencyCases", label: "Emergency cases", icon: Siren },
  { key: "rooms", label: "Rooms", icon: Building2 },
  { key: "icuStays", label: "ICU stays", icon: HeartPulse },
  { key: "admissions", label: "Admissions", icon: BedDouble },
];

function formatConfidence(value) {
  const confidence = Number(value);

  if (!Number.isFinite(confidence)) {
    return null;
  }

  return `${Math.round(confidence <= 1 ? confidence * 100 : confidence)}% confidence`;
}

function formatGeneratedAt(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatShortDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatPreset(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatRange(range, fallback) {
  if (!range || typeof range !== "object") {
    return formatPreset(range || fallback);
  }

  const label = formatPreset(range.preset || fallback);
  const from = formatShortDate(range.from);
  const to = formatShortDate(range.to);

  return [label, from && to ? `${from} - ${to}` : null]
    .filter(Boolean)
    .join(" - ");
}

function getFindingText(finding) {
  if (typeof finding === "string") {
    return finding;
  }

  return finding?.finding || finding?.summary || finding?.message || null;
}

function getRecommendationText(recommendation) {
  if (typeof recommendation === "string") {
    return recommendation;
  }

  return (
    recommendation?.action ||
    recommendation?.recommendation ||
    recommendation?.summary ||
    null
  );
}

function severityLevel(severity) {
  return (
    {
      CRITICAL: 100,
      HIGH: 84,
      MEDIUM: 62,
      LOW: 36,
      INFO: 18,
    }[String(severity || "INFO").toUpperCase()] || 18
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="recommendation-detail-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function FindingsList({ findings }) {
  const items = findings.map(getFindingText).filter(Boolean);

  if (items.length === 0) {
    return null;
  }

  return (
    <DetailSection title="Key findings">
      <ul className="recommendation-findings-list">
        {items.map((finding, index) => (
          <li key={`${finding}-${index}`}>{finding}</li>
        ))}
      </ul>
    </DetailSection>
  );
}

function RecommendationsList({ recommendations, title = "Recommendations" }) {
  const items = recommendations.map(getRecommendationText).filter(Boolean);

  if (items.length === 0) {
    return null;
  }

  return (
    <DetailSection title={title}>
      <ul className="recommendation-actions-list">
        {items.map((recommendation, index) => (
          <li key={`${recommendation}-${index}`}>
            <CheckCircle2 size={14} strokeWidth={1.9} />
            <span>{recommendation}</span>
          </li>
        ))}
      </ul>
    </DetailSection>
  );
}

function EmptyIntelligenceState({ title, detail }) {
  return (
    <div className="recommendation-empty-state">
      <i>
        <ClipboardList size={21} strokeWidth={1.7} />
      </i>
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

function CapacityPlanningDetails({ result }) {
  const data = result.data || {};
  const summary = data.metrics?.summary || {};
  const sourceCounts = data.dataSource?.sourceRecordCounts || {};
  const risks = data.metrics?.topCapacityRiskDepartments || [];
  const findings = result.findings || [];
  const recommendations = result.recommendations || [];
  const overview = [
    ["Total departments", summary.totalDepartments ?? 0],
    ["Departments with activity", summary.departmentsWithActivity ?? 0],
    ["Bed capacity data", summary.departmentsWithBedCapacityData ?? 0],
    ["Triggered department risks", risks.length],
  ];

  return (
    <div className="strategic-recommendation-details">
      <DetailSection title="Planning window">
        <div className="recommendation-range-row">
          <CalendarDays size={15} strokeWidth={1.8} />
          <span>{formatRange(data.planningWindow, "next_7_days")}</span>
        </div>
      </DetailSection>

      <DetailSection title="Baseline range">
        <div className="recommendation-range-row">
          <CalendarDays size={15} strokeWidth={1.8} />
          <span>{formatRange(data.baselineRange, "last_30_days")}</span>
        </div>
      </DetailSection>

      <DetailSection title="Capacity overview">
        <div className="recommendation-stat-grid">
          {overview.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </DetailSection>

      <DetailSection title="Data coverage">
        <div className="recommendation-source-grid">
          {SOURCE_COVERAGE_ITEMS.map((source) => {
            const SourceIcon = source.icon;

            return (
              <div key={source.key}>
                <SourceIcon size={14} strokeWidth={1.8} />
                <span>{source.label}</span>
                <strong>{Number(sourceCounts[source.key] || 0)}</strong>
              </div>
            );
          })}
        </div>
      </DetailSection>

      <FindingsList findings={findings} />
      <RecommendationsList recommendations={recommendations} />

      {findings.length === 0 && recommendations.length === 0 && (
        <EmptyIntelligenceState
          detail="No recommendations generated"
          title="No triggered findings"
        />
      )}
    </div>
  );
}

function DepartmentPressureDetails({ result }) {
  const data = result.data || {};
  const topDepartments = data.metrics?.topPressureDepartments || [];
  const findings = result.findings || [];
  const recommendations = result.recommendations || [];

  return (
    <div className="strategic-recommendation-details">
      <DetailSection title="Analysis window">
        <div className="recommendation-range-row">
          <CalendarDays size={15} strokeWidth={1.8} />
          <span>{formatRange(data.dateRange, "last_30_days")}</span>
        </div>
      </DetailSection>

      <DetailSection title="Top affected departments">
        {topDepartments.length > 0 ? (
          <div className="department-pressure-grid">
            {topDepartments.slice(0, 5).map((department) => (
              <div
                data-severity={String(department.severity || "INFO").toLowerCase()}
                key={department.departmentId || department.departmentName}
              >
                <strong>{department.departmentName || "Department"}</strong>
                <span>{department.severity || "INFO"}</span>
                <div className="department-pressure-bar">
                  <i
                    style={{
                      width: `${severityLevel(department.severity)}%`,
                    }}
                  />
                </div>
                <small>
                  {department.triggeredRuleCount || 0} findings
                </small>
              </div>
            ))}
          </div>
        ) : (
          <EmptyIntelligenceState
            detail="No departments currently have triggered pressure findings"
            title="No affected departments"
          />
        )}
      </DetailSection>

      <FindingsList findings={findings} />
      <RecommendationsList recommendations={recommendations} />
    </div>
  );
}

function ExecutiveSummaryDetails({ result }) {
  const data = result.data || {};
  const modules = Array.isArray(data.modules) ? data.modules : [];
  const findings = result.findings || [];
  const recommendations = result.recommendations || [];

  return (
    <div className="strategic-recommendation-details">
      <DetailSection title="Executive summary">
        <div className="executive-module-grid">
          {modules.map((module) => (
            <div key={module.key || module.name}>
              <span>{module.name || formatPreset(module.key)}</span>
              <strong
                data-severity={String(module.severity || "INFO").toLowerCase()}
              >
                {module.dataAvailable === false
                  ? "Unavailable"
                  : module.severity || "INFO"}
              </strong>
            </div>
          ))}
        </div>
      </DetailSection>

      <FindingsList findings={findings} />
      <RecommendationsList
        recommendations={recommendations}
        title="Leadership actions"
      />
    </div>
  );
}

function RecommendationDetails({ recommendation, result }) {
  if (recommendation.key === "capacity-planning") {
    return <CapacityPlanningDetails result={result} />;
  }

  if (recommendation.key === "department-pressure") {
    return <DepartmentPressureDetails result={result} />;
  }

  return <ExecutiveSummaryDetails result={result} />;
}

function StrategicRecommendationModal({
  recommendation,
  result,
  loading,
  error,
  onClose,
  onRefresh,
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  const generatedAt = formatGeneratedAt(result?.generatedAt);
  const confidence = formatConfidence(result?.confidence);

  return createPortal(
    <div
      className="console-tinted-popup-layer strategic-recommendation-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby="strategic-recommendation-title"
        aria-describedby="strategic-recommendation-description"
        aria-modal="true"
        className="console-tinted-popup strategic-recommendation-dialog"
        data-tone="strategic-popup"
        role="dialog"
      >
        <header className="strategic-recommendation-dialog-header">
          <i data-tone={recommendation.tone}>
            <PanelRightOpen size={21} strokeWidth={1.8} />
          </i>

          <div>
            <span>Strategic recommendation</span>
            <h2 id="strategic-recommendation-title">
              {recommendation.title}
            </h2>
            <p id="strategic-recommendation-description">
              {recommendation.detail}
            </p>
          </div>

          <button
            aria-label="Close strategic recommendation"
            autoFocus
            className="strategic-recommendation-close"
            onClick={onClose}
            type="button"
          >
            <X size={19} strokeWidth={1.9} />
          </button>
        </header>

        <div className="strategic-recommendation-dialog-body">
          {loading && (
            <div
              aria-live="polite"
              className="strategic-recommendation-loading"
            >
              <LoaderCircle size={24} strokeWidth={1.8} />
              <strong>Generating hospital intelligence...</strong>
              <span>
                Elly is collecting the latest operational data and preparing
                this recommendation.
              </span>
            </div>
          )}

          {!loading && error && (
            <div
              aria-live="assertive"
              className="strategic-recommendation-error"
            >
              <strong>Unable to generate this recommendation</strong>
              <p>{error}</p>
              <button onClick={onRefresh} type="button">
                <RefreshCw size={15} strokeWidth={1.9} />
                Try again
              </button>
            </div>
          )}

          {!loading && !error && result?.answer && (
            <>
              <div className="strategic-recommendation-result-meta">
                {result.severity && (
                  <span data-severity={String(result.severity).toLowerCase()}>
                    {result.severity} priority
                  </span>
                )}
                {confidence && <span>{confidence}</span>}
                {result.requiresHumanReview && (
                  <span>Human review required</span>
                )}
              </div>

              <RecommendationDetails
                recommendation={recommendation}
                result={result}
              />

              <section className="strategic-recommendation-ai-insight">
                <div>
                  <Sparkles size={16} strokeWidth={1.8} />
                  <h3>AI insight</h3>
                </div>
                <article className="strategic-recommendation-answer">
                  <ReactMarkdown>{result.answer}</ReactMarkdown>
                </article>
              </section>
            </>
          )}
        </div>

        {!loading && !error && result?.answer && (
          <footer className="strategic-recommendation-dialog-footer">
            <span>
              {generatedAt ? `Generated ${generatedAt}` : "Generated now"}
            </span>
            <button onClick={onRefresh} type="button">
              <RefreshCw size={14} strokeWidth={1.9} />
              Refresh analysis
            </button>
          </footer>
        )}
      </section>
    </div>,
    document.body,
  );
}

export default StrategicRecommendationModal;
