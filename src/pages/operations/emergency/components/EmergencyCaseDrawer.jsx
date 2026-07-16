import { useEffect, useRef, useState } from "react";
import { formatEmergencyStatus, getDeadlineState } from "../../../../utils/emergencyPresentation";

export default function EmergencyCaseDrawer({ now, onClose, open, realtime, request }) {
  const closeButtonRef = useRef(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("Hospital capacity unavailable");

  useEffect(() => {
    if (!open) return undefined;
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open || !request) return null;
  const canRespond = request.status === "PENDING" && realtime.hospitalIdentity.role === "EMERGENCY_CHIEF";
  const isSubmitting = realtime.pendingAlertId === request.alertId;
  const deadline = getDeadlineState(request.timeoutAt, now);

  const accept = async () => {
    try {
      await realtime.acknowledge(request.alertId, true);
      onClose();
    } catch {
      // The shared emergency state displays the request error.
    }
  };
  const reject = async () => {
    if (!rejectionReason.trim()) return;
    try {
      await realtime.acknowledge(request.alertId, false, rejectionReason.trim());
      onClose();
    } catch {
      // The shared emergency state displays the request error.
    }
  };

  return (
    <div className="emergency-drawer-layer" role="presentation" onMouseDown={onClose}>
      <aside
        aria-label={`Review emergency case ${request.caseId}`}
        aria-modal="true"
        className="emergency-case-drawer"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Emergency case</p>
            <h2 className="mt-1 break-all text-xl font-bold text-[var(--text)]">{request.caseId}</h2>
            <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">{request.ellyId || "ELLY ID unavailable"}</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="emergency-liquid-button emergency-liquid-button--quiet rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-bold text-[var(--text)] hover:bg-[var(--surface-muted)]">
            Close
          </button>
        </header>
        <div className="grid gap-6 overflow-y-auto p-5">
          <section className="grid grid-cols-2 gap-3">
            <Detail label="Severity" value={request.severity} />
            <Detail label="Status" value={formatEmergencyStatus(request.status)} />
            <Detail label="Specialty" value={request.requiredSpecialty || "Emergency Medicine"} />
            <Detail label="SLA" value={request.status === "PENDING" ? deadline.label : "Not applicable"} />
          </section>
          <section>
            <h3 className="text-sm font-bold text-[var(--text)]">Clinical summary</h3>
            <dl className="mt-3 grid gap-4 sm:grid-cols-2">
              <Detail label="Symptoms" value={request.symptoms?.join(", ") || "Not provided"} />
              <Detail label="Location" value={request.location?.address || request.location?.region || "Not provided"} />
              <Detail label="Department" value={request.assignedDepartmentId || "Unassigned"} />
              <Detail label="Attending" value={request.assignedAttendingId || "Unassigned"} />
            </dl>
          </section>
          {request.riskFlags?.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-[var(--text)]">Risk flags</h3>
              <ul className="mt-3 grid gap-2">
                {request.riskFlags.map((flag, index) => (
                  <li key={`${flag.code || flag.reason || flag}-${index}`} className="border-l-2 border-red-500 pl-3 text-sm leading-6 text-[var(--text)]">
                    {typeof flag === "string" ? flag : flag.reason || flag.code || "Clinical risk identified"}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {canRespond && (
            <section className="border-t border-[var(--line)] pt-5">
              <h3 className="text-sm font-bold text-[var(--text)]">Admission decision</h3>
              {!rejecting ? (
                <div className="mt-3 flex flex-wrap gap-3">
                  <button type="button" disabled={isSubmitting} onClick={accept} className="emergency-liquid-button emergency-liquid-button--success rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50">
                    {isSubmitting ? "Submitting..." : "Accept request"}
                  </button>
                  <button type="button" disabled={isSubmitting} onClick={() => setRejecting(true)} className="emergency-liquid-button emergency-liquid-button--danger rounded-lg border border-red-300 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30">
                    Reject request
                  </button>
                </div>
              ) : (
                <div className="mt-3 grid gap-3">
                  <label htmlFor="emergency-drawer-rejection" className="text-sm font-semibold text-[var(--text)]">Rejection reason</label>
                  <textarea id="emergency-drawer-rejection" rows={3} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} className="rounded-lg border border-[var(--line-strong)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)]" />
                  <div className="flex gap-3">
                    <button type="button" disabled={isSubmitting || !rejectionReason.trim()} onClick={reject} className="emergency-liquid-button emergency-liquid-button--danger rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Confirm rejection</button>
                    <button type="button" onClick={() => setRejecting(false)} className="emergency-liquid-button emergency-liquid-button--quiet rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--text)]">Cancel</button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--text)]">{value || "Unavailable"}</p>
    </div>
  );
}
