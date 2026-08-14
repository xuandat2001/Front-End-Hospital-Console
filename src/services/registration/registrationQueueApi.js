import { mockDirectData } from "../mock/mockApi";

const QUEUE_BASE = "/api/intelligence/registration-queue";

async function queueRequest(path) {
  return mockDirectData(path);
}

export function getRegistrationQueue(status = "ALL") {
  return queueRequest(
    `${QUEUE_BASE}?status=${encodeURIComponent(status)}&limit=500`,
  );
}

export function getRegistrationsByEllyId(ellyId, status = "ALL") {
  return queueRequest(
    `${QUEUE_BASE}?status=${encodeURIComponent(status)}&ellyId=${encodeURIComponent(
      ellyId,
    )}&limit=100`,
  );
}

export function applyRegistrationDecision(eventId, action, notes = "") {
  return queueRequest(
    `${QUEUE_BASE}/${encodeURIComponent(eventId)}/decision?action=${encodeURIComponent(
      action,
    )}&notes=${encodeURIComponent(notes || "")}`,
  );
}

export function removeRegistrationEntry(eventId, notes) {
  return applyRegistrationDecision(eventId, "remove", notes);
}

export function readdRegistrationEntry(eventId, notes) {
  return applyRegistrationDecision(eventId, "readd", notes);
}
