import { useMemo, useState } from "react";
import {
  Ambulance,
  CalendarClock,
  Check,
  Clock3,
  HeartPulse,
  IdCard,
  UserRound,
  X,
} from "lucide-react";
import { formatTime, formatShortDateTime } from "../../../../utils/dateFormat";
import {
  formatEmergencyStatus,
  getDeadlineState,
  getEmergencySlaState,
  isActiveEmergencyRequest,
  sortEmergencyRequests,
} from "../../../../utils/emergencyPresentation";

function getSeverityTone(severity) {
  return String(severity || "LOW").toLowerCase();
}

function formatEta(eta) {
  if (!eta) return "Unavailable";
  return formatTime(eta);
}

function formatQueueDate(value) {
  if (!value) return "Unavailable";
  return formatShortDateTime(value) || "Unavailable";
}

function getPatientAlias(request) {
  return (
    request.patientAlias ||
    request.patient?.alias ||
    request.patient?.fullName ||
    request.patientName ||
    request.patientId ||
    "Patient"
  );
}

function sortPastEmergencyRequests(requests) {
  return [...requests].sort((left, right) => {
    const leftTime = new Date(
      left.lastEventAt || left.updatedAt || left.createdAt || left.waitingSince || 0,
    ).getTime();
    const rightTime = new Date(
      right.lastEventAt || right.updatedAt || right.createdAt || right.waitingSince || 0,
    ).getTime();
    return rightTime - leftTime;
  });
}

function canRespondToRequest(request) {
  return Boolean(request?.alertId) && request?.status === "PENDING";
}

function isQueueActiveCase(request) {
  if (!isActiveEmergencyRequest(request)) return false;
  return request.status === "PENDING" || Boolean(request.__queueActive);
}

function SlaBadge({ request, now }) {
  const sla = getEmergencySlaState(request, now);
  if (sla.state === "NOT_APPLICABLE") {
    return (
      <span className="emergency-queue-sla-badge" data-state="none">
        No SLA
      </span>
    );
  }
  const deadline = getDeadlineState(sla.deadlineAt, now);
  return (
    <span className="emergency-queue-sla-badge" data-state={sla.state.toLowerCase()}>
      {sla.state === "BREACHED"
        ? "Breached"
        : sla.state === "AT_RISK"
          ? "At risk"
          : deadline.label.replace(" remaining", "")}
    </span>
  );
}

export default function EmergencyCaseQueue({
  cases,
  highlightedAlertId,
  loading,
  now,
  onClose,
  onRespond,
  onSelect,
  pendingAlertId,
  selectedCaseId,
}) {
  const [queueMode, setQueueMode] = useState("active");
  const [rejectingAlertId, setRejectingAlertId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("Hospital capacity unavailable");
  const [localStatuses, setLocalStatuses] = useState({});
  const projectedCases = useMemo(
    () =>
      cases.map((request) => {
        const local = localStatuses[request.alertId];
        return local ? { ...request, ...local } : request;
      }),
    [cases, localStatuses],
  );
  const activeCases = useMemo(
    () =>
      sortEmergencyRequests(
        projectedCases.filter((request) => isQueueActiveCase(request)),
        now,
      ),
    [now, projectedCases],
  );
  const pastCases = useMemo(
    () =>
      sortPastEmergencyRequests(
        projectedCases.filter((request) => !isQueueActiveCase(request)),
      ),
    [projectedCases],
  );
  const visibleCases = queueMode === "past" ? pastCases : activeCases;
  const emptyTitle =
    queueMode === "past" ? "No past emergency cases" : "No active emergency cases";
  const emptyCopy =
    queueMode === "past"
      ? "Closed, rejected, timed out, or cancelled requests will appear here."
      : "New emergency requests will appear here in real time.";

  async function respondToRequest(request, accepted) {
    if (!onRespond || !canRespondToRequest(request)) return;
    const reason = accepted ? undefined : rejectionReason.trim();
    if (!accepted && !reason) return;
    try {
      await onRespond(request.alertId, accepted, reason);
      setLocalStatuses((current) => ({
        ...current,
        [request.alertId]: {
          status: accepted ? "ACCEPTED" : "REJECTED",
          rejectionReason: accepted ? request.rejectionReason : reason,
          lastEventAt: new Date().toISOString(),
        },
      }));
      setRejectingAlertId("");
    } catch {
      // The shared emergency realtime state displays the request error.
    }
  }

  return (
    <section className="emergency-queue-panel">
      <header className="emergency-queue-popover-header">
        <div className="emergency-queue-header-copy">
          <h2>Case queue</h2>
          <p>Active triage and past request history</p>
        </div>
        <div className="emergency-queue-header-actions">
          <span className="emergency-queue-count-pill">{activeCases.length} active</span>
          <button
            aria-label="Close emergency queue"
            className="emergency-queue-close"
            onClick={onClose}
            type="button"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="emergency-queue-mode-switch" aria-label="Case queue view">
        <button
          aria-pressed={queueMode === "active"}
          className={queueMode === "active" ? "is-active" : ""}
          onClick={() => setQueueMode("active")}
          type="button"
        >
          Active
          <span>{activeCases.length}</span>
        </button>
        <button
          aria-pressed={queueMode === "past"}
          className={queueMode === "past" ? "is-active" : ""}
          onClick={() => setQueueMode("past")}
          type="button"
        >
          Past
          <span>{pastCases.length}</span>
        </button>
      </div>

      <div className="emergency-queue-scroll">
        <div className="emergency-queue-list" role="list" aria-label={`${queueMode} emergency cases`}>
          {loading && !visibleCases.length ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="emergency-queue-skeleton" aria-hidden="true">
                <div className="h-16 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
              </div>
            ))
          ) : visibleCases.length ? (
            visibleCases.map((request) => {
              const selected = request.caseId === selectedCaseId;
              const canRespond = canRespondToRequest(request);
              const isSubmitting = pendingAlertId === request.alertId;
              const isRejecting = rejectingAlertId === request.alertId;
              const status = formatEmergencyStatus(
                request.currentStage || request.status,
              );
              return (
                <div
                  key={request.alertId || request.caseId}
                  className="emergency-queue-list-entry"
                  role="listitem"
                >
                  <button
                    aria-current={selected ? "true" : undefined}
                    aria-label={`Track emergency case ${request.caseId}`}
                    className={`emergency-command-row emergency-queue-item ${
                      selected ? "is-selected" : ""
                    } ${highlightedAlertId === request.alertId ? "is-new-critical" : ""}`}
                    onClick={() => onSelect(request)}
                    type="button"
                  >
                    <div className="emergency-queue-item-shell">
                      <div className="emergency-queue-item-header">
                        <span
                          className="emergency-queue-severity"
                          data-severity={getSeverityTone(request.severity)}
                        >
                          {request.severity || "Unknown"}
                        </span>
                        <SlaBadge request={request} now={now} />
                      </div>
                      <div className="emergency-queue-case-line">
                        <span>{status}</span>
                        <strong>{request.caseId}</strong>
                      </div>
                      <div className="emergency-queue-details">
                        {[
                          [
                            Ambulance,
                            "Transport",
                            request.transport?.ambulanceLabel ||
                              request.transport?.ambulanceId ||
                              "Unassigned",
                          ],
                          [
                            CalendarClock,
                            "Created",
                            formatQueueDate(
                              request.createdAt || request.waitingSince || request.lastEventAt,
                            ),
                          ],
                          [Clock3, "ETA", formatEta(request.transport?.eta)],
                          [UserRound, "Patient Alias", getPatientAlias(request)],
                          [HeartPulse, "Clinical State", status],
                          [IdCard, "ELLY ID", request.ellyId || "Unavailable"],
                        ].map(([Icon, label, value]) => (
                          <div className="emergency-queue-detail" key={label}>
                            <Icon size={13} strokeWidth={2} />
                            <span>{label}</span>
                            <strong>{value}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>
                  {canRespond && (
                    <div className="emergency-queue-decision-panel">
                      {isRejecting ? (
                        <div className="emergency-queue-rejection-form">
                          <label htmlFor={`emergency-queue-reject-${request.alertId}`}>
                            Rejection reason
                          </label>
                          <textarea
                            disabled={isSubmitting}
                            id={`emergency-queue-reject-${request.alertId}`}
                            onChange={(event) => setRejectionReason(event.target.value)}
                            rows={2}
                            value={rejectionReason}
                          />
                          <div className="emergency-queue-decision-actions">
                            <button
                              className="emergency-queue-decision-button is-danger"
                              disabled={isSubmitting || !rejectionReason.trim()}
                              onClick={() => respondToRequest(request, false)}
                              type="button"
                            >
                              {isSubmitting ? "Rejecting..." : "Confirm reject"}
                            </button>
                            <button
                              className="emergency-queue-decision-button is-quiet"
                              disabled={isSubmitting}
                              onClick={() => setRejectingAlertId("")}
                              type="button"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="emergency-queue-decision-actions">
                          <button
                            className="emergency-queue-decision-button is-success"
                            disabled={isSubmitting}
                            onClick={() => respondToRequest(request, true)}
                            type="button"
                          >
                            <Check size={14} strokeWidth={2.3} />
                            {isSubmitting ? "Accepting..." : "Accept"}
                          </button>
                          <button
                            className="emergency-queue-decision-button is-danger"
                            disabled={isSubmitting}
                            onClick={() => setRejectingAlertId(request.alertId)}
                            type="button"
                          >
                            <X size={14} strokeWidth={2.3} />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-bold text-[var(--text)]">{emptyTitle}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{emptyCopy}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
