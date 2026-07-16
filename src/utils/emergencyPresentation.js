export const ACTIVE_EMERGENCY_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "AMBULANCE_DISPATCHED",
  "PATIENT_RECEIVED",
  "ARRIVED_AT_HOSPITAL",
  "UNDER_TREATMENT",
];

export const EMERGENCY_TIMELINE_STAGES = [
  {
    status: "PENDING",
    label: "Request received",
    eventType: "EMERGENCY_ADMISSION_REQUESTED",
  },
  {
    status: "ACCEPTED",
    label: "Hospital accepted",
    eventType: "EMERGENCY_REQUEST_ACCEPTED",
  },
  {
    status: "AMBULANCE_DISPATCHED",
    label: "Ambulance dispatched",
    eventType: "EMERGENCY_AMBULANCE_DISPATCHED",
  },
  {
    status: "PATIENT_RECEIVED",
    label: "Patient picked up",
    eventType: "EMERGENCY_PATIENT_PICKED_UP",
  },
  {
    status: "ARRIVED_AT_HOSPITAL",
    label: "Arrived at hospital",
    eventType: "EMERGENCY_PATIENT_ARRIVED",
  },
  {
    status: "UNDER_TREATMENT",
    label: "Treatment started",
    eventType: "EMERGENCY_TREATMENT_STARTED",
  },
  {
    status: "COMPLETED",
    label: "Workflow completed",
    eventType: "EMERGENCY_CASE_COMPLETED",
  },
];

const terminalStatuses = new Set([
  "REJECTED",
  "TIMED_OUT",
  "ESCALATED",
  "CANCELLED",
]);

const severityOrder = {
  CRITICAL: 4,
  HIGH: 3,
  MODERATE: 2,
  LOW: 1,
};

export function getEmergencySlaState(request, now = null) {
  if (request?.sla) return request.sla;
  if (request?.status !== "PENDING" || !request?.timeoutAt) {
    return { state: "NOT_APPLICABLE", isRisk: false, deadlineAt: request?.timeoutAt || null };
  }
  if (now === null) {
    return { state: "ON_TRACK", isRisk: false, deadlineAt: request.timeoutAt };
  }
  const remainingMs = new Date(request.timeoutAt).getTime() - now;
  return {
    state: remainingMs <= 0 ? "BREACHED" : remainingMs <= 120000 ? "AT_RISK" : "ON_TRACK",
    isRisk: remainingMs <= 120000,
    deadlineAt: request.timeoutAt,
  };
}

export function formatEmergencyStatus(status = "") {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function isActiveEmergencyRequest(request) {
  return ACTIVE_EMERGENCY_STATUSES.includes(request.status);
}

export function sortEmergencyRequests(requests, now = null) {
  return [...requests].sort((left, right) => {
    const severityDifference =
      (severityOrder[right.severity] || 0) -
      (severityOrder[left.severity] || 0);
    if (severityDifference) return severityDifference;

    const leftRisk = getEmergencySlaState(left, now).isRisk;
    const rightRisk = getEmergencySlaState(right, now).isRisk;
    if (leftRisk !== rightRisk) return leftRisk ? -1 : 1;

    const leftTime = new Date(
      left.waitingSince || left.createdAt || left.lastEventAt || 0,
    ).getTime();
    const rightTime = new Date(
      right.waitingSince || right.createdAt || right.lastEventAt || 0,
    ).getTime();
    return leftTime - rightTime;
  });
}

const PERSISTED_TIMELINE_STAGES = [
  { id: "created", label: "SOS triggered", actions: ["CASE_CREATED"], statuses: ["CREATED"] },
  { id: "assessed", label: "Risk assessed", actions: ["CASE_CREATED"], statuses: ["CREATED"] },
  { id: "matched", label: "Hospital matched", actions: ["HOSPITALS_MATCHED"], statuses: ["MATCHING_HOSPITAL"] },
  { id: "acknowledged", label: "Hospital acknowledged", actions: ["ALERT_ACCEPTED"], statuses: ["ACKNOWLEDGED"] },
  { id: "dispatched", label: "Ambulance dispatched", statuses: ["AMBULANCE_DISPATCHED"] },
  { id: "pickup", label: "Patient picked up", statuses: ["PATIENT_RECEIVED"] },
  { id: "arrived", label: "Arrived at hospital", statuses: ["ARRIVED_AT_HOSPITAL"] },
  { id: "treatment", label: "Treatment started", statuses: ["UNDER_TREATMENT"] },
  { id: "closed", label: "Case closed", statuses: ["COMPLETED", "CANCELLED"] },
];

export function buildPersistedEmergencyTimeline(request, events = []) {
  const status = request?.currentStage || request?.caseStatus || request?.status;
  const currentIndex = PERSISTED_TIMELINE_STAGES.findIndex((stage) =>
    stage.statuses.includes(status),
  );
  const timedOutEvent = events.find((event) => event.action === "ALERT_TIMED_OUT");

  return PERSISTED_TIMELINE_STAGES.map((stage, index) => {
    const event = events.find(
      (item) =>
        stage.actions?.includes(item.action) ||
        stage.statuses.includes(item.status),
    );
    let state = "pending";
    if (event || (currentIndex >= 0 && index < currentIndex)) state = "completed";
    if (currentIndex === index && !["COMPLETED", "CANCELLED"].includes(status)) {
      state = "current";
    }
    if (
      stage.id === "acknowledged" &&
      timedOutEvent &&
      !events.some((item) => item.action === "ALERT_ACCEPTED")
    ) {
      state = "delayed";
    }

    return {
      ...stage,
      state,
      occurredAt: event?.createdAt || null,
      delayReason: state === "delayed" ? timedOutEvent.notes || "Hospital acknowledgement timed out" : null,
    };
  });
}

export function getDeadlineState(timeoutAt, now = Date.now()) {
  if (!timeoutAt) {
    return { label: "No response deadline", overdue: false };
  }
  if (now === null) {
    return { label: "Calculating deadline...", overdue: false };
  }

  const remainingMs = new Date(timeoutAt).getTime() - now;
  if (remainingMs <= 0) {
    return { label: "Response overdue", overdue: true };
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return {
    label:
      minutes > 0
        ? `${minutes}m ${String(seconds).padStart(2, "0")}s remaining`
        : `${seconds}s remaining`,
    overdue: false,
  };
}

export function notificationsForEmergencyRequest(notifications, request) {
  return notifications
    .filter(
      (notification) =>
        notification.alertId === request.alertId ||
        notification.caseId === request.caseId ||
        notification.payload?.alertId === request.alertId,
    )
    .sort(
      (left, right) =>
        new Date(left.occurredAt || 0).getTime() -
        new Date(right.occurredAt || 0).getTime(),
    );
}

export function buildEmergencyTimeline(request, notifications) {
  const matchingNotifications = notificationsForEmergencyRequest(
    notifications,
    request,
  );
  const currentStageIndex = EMERGENCY_TIMELINE_STAGES.findIndex(
    (stage) => stage.status === request.status,
  );

  return EMERGENCY_TIMELINE_STAGES.map((stage, index) => {
    const event = matchingNotifications.find(
      (notification) => notification.eventType === stage.eventType,
    );
    let state = "upcoming";

    if (event || (currentStageIndex >= 0 && index <= currentStageIndex)) {
      state = "complete";
    }
    if (stage.status === request.status && request.status !== "COMPLETED") {
      state = "current";
    }
    if (terminalStatuses.has(request.status) && index > 0) {
      state = "blocked";
    }

    return {
      ...stage,
      state,
      occurredAt:
        event?.occurredAt ||
        (stage.status === request.status ? request.lastEventAt : null),
    };
  });
}
