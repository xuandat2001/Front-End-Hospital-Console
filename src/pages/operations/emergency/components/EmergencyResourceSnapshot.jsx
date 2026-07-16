import { Ambulance, Bed, ShieldCheck, Users } from "lucide-react";

const RESOURCES = [
  ["ambulances", "Ambulances", Ambulance],
  ["erBeds", "ER beds", Bed],
  ["icuBeds", "ICU beds", ShieldCheck],
  ["emergencyStaff", "Emergency staff", Users],
];

function resourceTone(available, total) {
  if (available === null || available === undefined) return "unknown";
  if (Number(available) <= 0) return "critical";
  if (total && Number(available) / Number(total) <= 0.2) return "warning";
  return "stable";
}

function resourceStatus(tone) {
  if (tone === "critical") return "Full";
  if (tone === "warning") return "Tight";
  if (tone === "stable") return "Ready";
  return "Unknown";
}

function availabilityLabel(available, total) {
  if (available === null || available === undefined) return "Unavailable";
  if (total === null || total === undefined) return `${available} open`;
  return `${available} / ${total} open`;
}

export default function EmergencyResourceSnapshot({ resources }) {
  return (
    <section className="emergency-resources-panel">
      <header className="emergency-resource-header">
        <div>
          <h2>Resource snapshot</h2>
          <p>Current emergency capacity</p>
        </div>
        {resources?.missingMetrics?.length > 0 && (
          <span>Partial data</span>
        )}
      </header>
      <div className="emergency-resource-stack">
        {RESOURCES.map(([key, label, ResourceIcon]) => {
          const metric = resources?.[key];
          const available = metric?.available;
          const total = metric?.total;
          const tone = resourceTone(available, total);
          const percentage =
            metric?.occupancyPercent === null || metric?.occupancyPercent === undefined
              ? null
              : Math.max(0, Math.min(100, metric.occupancyPercent));
          return (
            <article className="emergency-resource-item" data-tone={tone} key={key}>
              <div className="emergency-resource-item-main">
                <span className="emergency-resource-icon" aria-hidden="true">
                  <ResourceIcon size={14} strokeWidth={1.9} />
                </span>
                <div className="emergency-resource-copy">
                  <p>{label}</p>
                  <strong>{availabilityLabel(available, total)}</strong>
                </div>
                <span className="emergency-resource-status">
                  {resourceStatus(tone)}
                </span>
              </div>
              <div
                aria-label={
                  percentage === null
                    ? `${label} occupancy unavailable`
                    : `${label} ${percentage}% occupied`
                }
                className="emergency-resource-meter"
                role="img"
              >
                {percentage !== null && (
                  <span
                    style={{ width: `${percentage}%` }}
                  />
                )}
              </div>
            </article>
          );
        })}
      </div>
      {resources?.missingMetrics?.length > 0 && (
        <p className="emergency-resource-note">
          Partial data: {resources.missingMetrics.join(", ")}.
        </p>
      )}
    </section>
  );
}
