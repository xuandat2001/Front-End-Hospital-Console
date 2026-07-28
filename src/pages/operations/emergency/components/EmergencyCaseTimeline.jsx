import { buildPersistedEmergencyTimeline } from "../../../../utils/emergencyPresentation";
import { formatTime } from "../../../../utils/dateFormat";

function getActiveStageIndex(stages) {
  if (!stages.length) return 0;
  const delayedIndex = stages.findIndex((stage) => stage.state === "delayed");
  const currentIndex = stages.findIndex((stage) => stage.state === "current");
  const lastCompletedIndex = stages.reduce(
    (latest, stage, index) => (stage.state === "completed" ? index : latest),
    -1,
  );

  if (delayedIndex >= 0) return delayedIndex;
  if (currentIndex >= 0) return currentIndex;
  if (lastCompletedIndex >= 0) return lastCompletedIndex;
  return 0;
}

function stagePhase(index, activeIndex) {
  if (index === activeIndex) return "active";
  if (index === activeIndex - 1) return "previous";
  if (index === activeIndex + 1) return "next";
  return index < activeIndex ? "past" : "future";
}

export default function EmergencyCaseTimeline({ events, loading, request }) {
  const stages = request ? buildPersistedEmergencyTimeline(request, events) : [];
  const activeIndex = getActiveStageIndex(stages);
  const stageCount = Math.max(stages.length, 1);
  const visibleStageCount = Math.min(stageCount, 3);
  const timelineOffset =
    stages.length > 3
      ? `${-Math.max(0, Math.min(activeIndex - 1, stages.length - 3)) * (100 / stageCount)}%`
      : "0%";

  return (
    <section className="emergency-timeline-panel">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-[var(--text)]">Live case tracking</h2>
          <p className="text-[10px] leading-4 text-[var(--text-muted)]">
            {request ? `Case ${request.caseId}` : "Select a case to inspect its emergency flow"}
          </p>
        </div>
        {request?.ellyId && <span className="max-w-52 truncate font-mono text-[10px] font-bold text-[var(--text-muted)]">{request.ellyId}</span>}
      </header>

      {!request ? (
        <div className="grid min-h-20 place-items-center text-center text-xs text-[var(--text-muted)]">
          Select a queue row to load its timeline.
        </div>
      ) : loading && !stages.length ? (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
          ))}
        </div>
      ) : (
        <div
          className="emergency-timeline-viewport"
          aria-live="polite"
          data-loading={loading ? "true" : "false"}
        >
          <ol
            className="emergency-timeline-track emergency-timeline-track--focused"
            style={{
              "--timeline-stage-count": stageCount,
              "--timeline-visible-stage-count": visibleStageCount,
              "--timeline-offset": timelineOffset,
            }}
          >
            {stages.map((stage, index) => {
              const phase = stagePhase(index, activeIndex);
              return (
                <li
                  key={stage.id}
                  className="emergency-timeline-stage emergency-timeline-stage--focused"
                  data-phase={phase}
                >
                  {index < stages.length - 1 && (
                    <span className="emergency-timeline-connector" />
                  )}
                  <span
                    className="emergency-command-timeline-node"
                    data-phase={phase}
                    data-state={phase === "active" ? stage.state : "ghost"}
                  />
                  <p className="emergency-timeline-label" title={stage.label}>
                    {stage.label}
                  </p>
                  <p className="emergency-timeline-time">
                    {formatTime(stage.occurredAt) ||
                      (stage.state === "pending" ? "Pending" : formatTime(request.updatedAt))}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
