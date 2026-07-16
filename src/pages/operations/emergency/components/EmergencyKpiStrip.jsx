import {
  Activity,
  AlertTriangle,
  Ambulance,
  Clock3,
  ListChecks,
} from "lucide-react";

const KPI_CONFIG = [
  ["slaRiskCases", "SLA risk", "Due within two minutes", Clock3, "warning"],
  ["criticalCases", "Critical", "Immediate attention", AlertTriangle, "critical"],
  ["availableAmbulances", "Ambulances", "Currently available", Ambulance, "neutral"],
];

function displayValue(value) {
  if (value === null || value === undefined) return "Unavailable";
  return value;
}

function trendLabel(value) {
  if (value === null || value === undefined) return null;
  const direction = value > 0 ? "up" : value < 0 ? "down" : "flat";
  return `${direction} ${Math.abs(value)}`;
}

export default function EmergencyKpiStrip({
  activeCaseCount,
  loading,
  onQueueToggle,
  queueOpen,
  reviewableCaseCount,
  selectedSeverity,
  summary,
}) {
  const activeCases =
    summary?.activeCases ?? activeCaseCount ?? (loading ? null : 0);
  const hasReviewableCases = reviewableCaseCount > 0;

  return (
    <section
      aria-label="Emergency command signals"
      className="emergency-command-signals"
    >
      <article className="emergency-active-signal">
        {loading && !summary ? (
          <div className="animate-pulse">
            <div className="h-3 w-24 rounded bg-[var(--surface-muted)]" />
            <div className="mt-3 h-8 w-20 rounded bg-[var(--surface-muted)]" />
          </div>
        ) : (
          <>
            <span className="emergency-kpi-icon" aria-hidden="true">
              <Activity size={16} strokeWidth={1.9} />
            </span>
            <div className="emergency-active-signal-copy">
              <p>Active cases</p>
              <strong>{displayValue(activeCases)}</strong>
              <span>{selectedSeverity || "No selected case"}</span>
            </div>
            <button
              aria-controls="emergency-queue-popover"
              aria-expanded={queueOpen}
              aria-label="Open active emergency queue"
              className={`emergency-queue-trigger ${
                hasReviewableCases ? "has-reviewable-cases" : ""
              }`}
              onClick={onQueueToggle}
              type="button"
            >
              <ListChecks size={16} strokeWidth={1.9} />
              <span>{reviewableCaseCount} need review</span>
            </button>
          </>
        )}
      </article>

      <div className="emergency-signal-chip-grid">
        {KPI_CONFIG.map(([key, label, description, KpiIcon, tone]) => {
        const trend = trendLabel(summary?.trends?.[key]);
        return (
          <article className="emergency-signal-chip" data-tone={tone} key={key}>
            {loading && !summary ? (
              <div className="animate-pulse">
                <div className="h-3 w-16 rounded bg-[var(--surface-muted)]" />
                <div className="mt-2 h-5 w-12 rounded bg-[var(--surface-muted)]" />
              </div>
            ) : (
              <>
                <div>
                  <span className="emergency-signal-chip-icon" aria-hidden="true">
                    <KpiIcon size={15} strokeWidth={1.9} />
                  </span>
                  <p>{label}</p>
                </div>
                <strong>{displayValue(summary?.[key])}</strong>
                  {trend && (
                  <span className="emergency-signal-trend">
                      {trend}
                    </span>
                  )}
                <small>{description}</small>
              </>
            )}
          </article>
        );
      })}
      </div>
    </section>
  );
}
