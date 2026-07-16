import { gatewayUrl, hospitalIdentity } from "./registrationRealtimeApi";
import { isMockMode } from "../mockApi";
import { mockRegistrationNotifications } from "../../mocks/mockAlerts";

const QUEUE_BASE = "/api/intelligence/registration-queue";

const identityHeaders = {
  "Content-Type": "application/json",
  "x-elly-id": hospitalIdentity.ellyId,
  "x-elly-partner-id": hospitalIdentity.partnerId,
  "x-elly-role": hospitalIdentity.role,
};

async function readResponseBody(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => ({}));
  }

  const text = await response.text().catch(() => "");
  return text ? { message: text } : {};
}

async function queueRequest(path, { method = "GET", body } = {}) {
  if (isMockMode) {
    return {
      success: true,
      data: mockRegistrationNotifications.map((item) => ({
        ...item,
        status: "PENDING",
        notes: body?.notes || "",
      })),
    };
  }

  let response;

  const headers = { ...identityHeaders };
  const fetchOptions = { method, headers };

  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    response = await fetch(`${gatewayUrl}${path}`, fetchOptions);
  } catch {
    throw new Error(
      `Cannot reach the intelligence service at ${gatewayUrl}. Make sure the API gateway and hospital-intelligence-service are running.`,
    );
  }

  const payload = await readResponseBody(response);
  if (!response.ok) {
    throw new Error(
      payload.message ||
        `Registration queue request failed with status ${response.status}`,
    );
  }

  return payload;
}

export function getRegistrationQueue(status = "ALL") {
  return queueRequest(
    `${QUEUE_BASE}?status=${encodeURIComponent(status)}&limit=500`,
  );
}

// Server-side per-EllyID lookup (scoped to the session hospital via identity
// headers). Returns only this patient's registration assessments.
export function getRegistrationsByEllyId(ellyId, status = "ALL") {
  return queueRequest(
    `${QUEUE_BASE}?status=${encodeURIComponent(status)}&ellyId=${encodeURIComponent(
      ellyId,
    )}&limit=100`,
  );
}

// Uses POST /:eventId/decision with the action in the JSON body so the gateway
// always forwards a non-empty POST body and URL paths never contain "/remove".
export function applyRegistrationDecision(eventId, action, notes = "") {
  return queueRequest(
    `${QUEUE_BASE}/${encodeURIComponent(eventId)}/decision`,
    {
      method: "POST",
      body: {
        action,
        notes: notes || `Updated from operations dashboard (${action})`,
      },
    },
  );
}

export function removeRegistrationEntry(eventId, notes) {
  return applyRegistrationDecision(eventId, "remove", notes);
}

export function readdRegistrationEntry(eventId, notes) {
  return applyRegistrationDecision(eventId, "readd", notes);
}
