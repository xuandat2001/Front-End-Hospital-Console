import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { RefreshCw } from "lucide-react";
import { getEmergencyCaseTimeline } from "../../../services/emergency/emergencyRealtimeApi";
import { getEmergencySlaState } from "../../../utils/emergencyPresentation";
import EmergencyCaseQueue from "./components/EmergencyCaseQueue";
import EmergencyCaseTimeline from "./components/EmergencyCaseTimeline";
import EmergencyKpiStrip from "./components/EmergencyKpiStrip";
import EmergencyPerformanceTab from "./components/EmergencyPerformanceTab";
import EmergencyPlanningTab from "./components/EmergencyPlanningTab";
import EmergencyReportsTab from "./components/EmergencyReportsTab";
import EmergencyResourceSnapshot from "./components/EmergencyResourceSnapshot";
import EmergencyResourceTab from "./components/EmergencyResourceTab";

export default function Emergency({
  activeTab = "dashboard",
  navigationTarget,
  realtime,
}) {
  if (activeTab === "performance") {
    return <EmergencyPerformanceTab />;
  }

  if (activeTab === "planning") {
    return <EmergencyPlanningTab />;
  }

  if (activeTab === "resources") {
    return <EmergencyResourceTab realtime={realtime} />;
  }

  if (activeTab === "reports") {
    return <EmergencyReportsTab />;
  }

  return (
    <EmergencyDashboard
      navigationTarget={navigationTarget}
      realtime={realtime}
    />
  );
}

const REVIEWABLE_STATES = new Set([
  "PENDING",
  "MATCHING",
  "MATCHING_HOSPITAL",
  "CREATED",
]);

const TERMINAL_STATES = new Set([
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
  "TIMED_OUT",
  "CLOSED",
  "RESOLVED",
]);

const QUEUE_CLOSE_ANIMATION_MS = 340;

function isReviewableEmergencyCase(request, now) {
  const state = String(
    request?.currentStage || request?.caseStatus || request?.status || "",
  ).toUpperCase();
  if (!request || TERMINAL_STATES.has(state)) return false;
  const sla = getEmergencySlaState(request, now);
  return (
    REVIEWABLE_STATES.has(state) ||
    request.severity === "CRITICAL" ||
    sla.isRisk
  );
}

function EmergencyDashboard({ navigationTarget, realtime }) {
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState("");
  const [queueOpen, setQueueOpen] = useState(false);
  const [queueMounted, setQueueMounted] = useState(false);
  const [queueClosing, setQueueClosing] = useState(false);
  const [highlightedAlertId, setHighlightedAlertId] = useState("");
  const [now, setNow] = useState(null);
  const previousAlertIds = useRef(new Set());
  const queueCloseTimerRef = useRef(null);

  const activeCases = useMemo(
    () => realtime.activeCases || [],
    [realtime.activeCases],
  );
  const queueCases = useMemo(() => {
    const byAlert = new Map();
    for (const request of activeCases) {
      const key = request?.alertId || request?.caseId;
      if (key) byAlert.set(key, { ...request, __queueActive: true });
    }
    for (const request of realtime.requests || []) {
      const key = request?.alertId || request?.caseId;
      if (key) {
        byAlert.set(key, {
          ...(byAlert.get(key) || {}),
          ...request,
        });
      }
    }
    return Array.from(byAlert.values());
  }, [activeCases, realtime.requests]);
  const reviewableCaseCount = useMemo(
    () =>
      activeCases.filter((request) => isReviewableEmergencyCase(request, now))
        .length,
    [activeCases, now],
  );

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(
    () => () => {
      if (queueCloseTimerRef.current) {
        window.clearTimeout(queueCloseTimerRef.current);
      }
    },
    [],
  );

  const openQueue = useCallback(() => {
    if (queueCloseTimerRef.current) {
      window.clearTimeout(queueCloseTimerRef.current);
      queueCloseTimerRef.current = null;
    }
    setQueueMounted(true);
    setQueueClosing(false);
    setQueueOpen(true);
  }, []);

  const closeQueue = useCallback(() => {
    if (queueClosing || (!queueOpen && !queueMounted)) return;
    if (queueCloseTimerRef.current) {
      window.clearTimeout(queueCloseTimerRef.current);
    }
    setQueueOpen(false);
    setQueueClosing(true);
    queueCloseTimerRef.current = window.setTimeout(() => {
      setQueueMounted(false);
      setQueueClosing(false);
      queueCloseTimerRef.current = null;
    }, QUEUE_CLOSE_ANIMATION_MS);
  }, [queueClosing, queueMounted, queueOpen]);

  const toggleQueue = useCallback(() => {
    if (queueOpen && !queueClosing) {
      closeQueue();
    } else {
      openQueue();
    }
  }, [closeQueue, openQueue, queueClosing, queueOpen]);

  useEffect(() => {
    const currentIds = new Set(activeCases.map((item) => item.alertId).filter(Boolean));
    const criticalNewCase = activeCases.find(
      (item) =>
        item.severity === "CRITICAL" &&
        item.alertId &&
        previousAlertIds.current.size > 0 &&
        !previousAlertIds.current.has(item.alertId),
    );
    previousAlertIds.current = currentIds;
    if (!criticalNewCase) return undefined;
    setHighlightedAlertId(criticalNewCase.alertId);
    const timer = window.setTimeout(() => setHighlightedAlertId(""), 3600);
    return () => window.clearTimeout(timer);
  }, [activeCases]);

  useEffect(() => {
    if (!navigationTarget?.alertId) return undefined;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      openQueue();
      setHighlightedAlertId(navigationTarget.alertId);
    });
    return () => {
      cancelled = true;
    };
  }, [navigationTarget?.alertId, navigationTarget?.navigationId, openQueue]);

  const targetedCase = navigationTarget?.alertId
    ? queueCases.find((item) => item.alertId === navigationTarget.alertId)
    : null;
  const selectedCase =
    targetedCase ||
    queueCases.find((item) => item.caseId === selectedCaseId) ||
    activeCases[0] ||
    null;

  const loadTimeline = useCallback(async (caseId) => {
    if (!caseId) {
      setTimeline([]);
      return;
    }
    setTimelineLoading(true);
    setTimelineError("");
    try {
      const events = await getEmergencyCaseTimeline(caseId);
      setTimeline(events || []);
    } catch (error) {
      setTimeline([]);
      setTimelineError(error.message || "Unable to load case timeline.");
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  useEffect(() => {
    const caseId = selectedCase?.caseId;
    queueMicrotask(() => loadTimeline(caseId));
  }, [loadTimeline, selectedCase?.caseId, selectedCase?.updatedAt]);

  useEffect(() => {
    if (!queueMounted || queueClosing) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") closeQueue();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeQueue, queueClosing, queueMounted]);

  function handleCaseSelect(request) {
    setSelectedCaseId(request.caseId);
    closeQueue();
  }

  const queueSheet =
    queueMounted && typeof document !== "undefined"
      ? createPortal(
          <div
            aria-modal="true"
            className={`emergency-queue-sheet-layer ${queueClosing ? "is-closing" : ""}`}
            id="emergency-queue-popover"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) closeQueue();
            }}
            role="dialog"
          >
            <button
              aria-label="Close emergency queue"
              className="emergency-queue-sheet-scrim"
              onClick={closeQueue}
              type="button"
            />
            <div
              className="emergency-queue-popover"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <EmergencyCaseQueue
                cases={queueCases}
                highlightedAlertId={highlightedAlertId}
                loading={realtime.loading}
                now={now}
                onClose={closeQueue}
                onRespond={realtime.acknowledge}
                pendingAlertId={realtime.pendingAlertId}
                onSelect={handleCaseSelect}
                selectedCaseId={selectedCase?.caseId || ""}
              />
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="emergency-command-scroll">
        <div className="emergency-command-shell">
          <header className="emergency-command-header">
            <div>
              <h1 className="text-xl font-bold leading-tight text-[var(--text)] 2xl:text-2xl">
                Emergency command center
              </h1>
              <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                Immediate workload, response risk, capacity, and critical events.
              </p>
            </div>
            <div className="emergency-header-actions">
              <button type="button" onClick={realtime.refresh}>
                <RefreshCw size={14} strokeWidth={1.9} />
                Refresh live data
              </button>
            </div>
          </header>

          {realtime.error && (
            <div
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              {realtime.error}
            </div>
          )}

          <div className="emergency-command-metrics-zone">
            <EmergencyKpiStrip
              activeCaseCount={activeCases.length}
              loading={realtime.loading}
              onQueueToggle={toggleQueue}
              queueOpen={queueOpen}
              reviewableCaseCount={reviewableCaseCount}
              selectedSeverity={selectedCase?.severity}
              summary={realtime.summary}
            />
          </div>

          {timelineError && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              {timelineError}
            </div>
          )}

          <div className="emergency-command-focus-row">
            <div className="emergency-command-primary">
              <EmergencyCaseTimeline
                events={timeline}
                loading={timelineLoading}
                request={selectedCase}
              />
            </div>

            <aside className="emergency-command-side">
              <EmergencyResourceSnapshot resources={realtime.resources} />
            </aside>
          </div>
        </div>
      </div>
      {queueSheet}
    </>
  );
}
