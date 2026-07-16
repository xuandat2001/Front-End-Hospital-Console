import { AlertCircle, BellRing, CheckCircle2 } from "lucide-react";

const IMPORTANT_EVENTS = new Set([
  "EMERGENCY_ADMISSION_REQUESTED",
  "EMERGENCY_REQUEST_TIMED_OUT",
  "EMERGENCY_CASE_ESCALATED",
  "EMERGENCY_AMBULANCE_DISPATCHED",
  "EMERGENCY_PATIENT_ARRIVED",
  "EMERGENCY_TREATMENT_STARTED",
]);

function alertTime(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EmergencyAlertsFeed({ notifications, onMarkRead, requests }) {
  const requestByAlert = new Map(requests.map((request) => [request.alertId, request]));
  const alerts = notifications
    .filter((notification) => IMPORTANT_EVENTS.has(notification.eventType))
    .map((notification) => ({
      ...notification,
      request: requestByAlert.get(notification.alertId || notification.payload?.alertId),
    }))
    .sort((left, right) => {
      const leftCritical = (left.severity || left.request?.severity) === "CRITICAL";
      const rightCritical = (right.severity || right.request?.severity) === "CRITICAL";
      if (leftCritical !== rightCritical) return leftCritical ? -1 : 1;
      return new Date(right.occurredAt || right.createdAt) - new Date(left.occurredAt || left.createdAt);
    })
    .slice(0, 4);

  return (
    <section className="emergency-alerts-panel">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[var(--text)]">Critical alerts</h2>
          <p className="text-[10px] leading-4 text-[var(--text-muted)]">Operational events requiring awareness</p>
        </div>
        <BellRing size={15} strokeWidth={1.9} aria-label="Live alerts" />
      </header>
      <div className="mt-3 grid gap-1.5">
        {alerts.length ? alerts.map((alert) => {
          const severity = alert.severity || alert.request?.severity || "HIGH";
          return (
            <article key={alert.eventId} className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-2.5">
              <div className="flex items-start gap-2">
                <span
                  className={`emergency-alert-icon ${severity === "CRITICAL" ? "is-critical" : "is-high"}`}
                  aria-hidden="true"
                >
                  <AlertCircle size={13} strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-xs font-bold leading-4 text-[var(--text)]">{alert.title}</p>
                    <span className="shrink-0 text-[9px] text-[var(--text-muted)]">{alertTime(alert.occurredAt || alert.createdAt)}</span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-[10px] leading-4 text-[var(--text-muted)]">{alert.message}</p>
                  {alert.caseId && <p className="mt-0.5 truncate font-mono text-[9px] text-[var(--text-muted)]">Case {alert.caseId}</p>}
                  {!alert.read && alert._id && (
                    <button
                      type="button"
                      className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 hover:underline dark:text-teal-300"
                      onClick={() => onMarkRead(alert._id)}
                    >
                      <CheckCircle2 size={12} strokeWidth={1.9} />
                      Mark acknowledged
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        }) : (
          <div className="grid min-h-40 place-items-center text-center">
            <div>
              <p className="text-sm font-bold text-[var(--text)]">No critical alerts</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Important emergency events will appear here.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
