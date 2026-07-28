import { MOCK_MODE } from "../../mocks/mockSession";
import { mockDirectData } from "../mock/mockApi";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000/api";

export const gatewayUrl =
  import.meta.env.VITE_API_GATEWAY_URL ||
  apiBaseUrl.replace(/\/api\/?$/, "");

export const hospitalIdentity = {
  ellyId: import.meta.env.VITE_ELLY_ID || "ELLY-STAFF-001",
  partnerId: import.meta.env.VITE_ELLY_PARTNER_ID || "HCM-2048",
  role: import.meta.env.VITE_ELLY_ROLE || "EMERGENCY_CHIEF",
};

const identityHeaders = {
  "Content-Type": "application/json",
  "x-elly-id": hospitalIdentity.ellyId,
  "x-elly-partner-id": hospitalIdentity.partnerId,
  "x-elly-role": hospitalIdentity.role,
};

async function emergencyRequest(path, options = {}) {
  if (MOCK_MODE) {
    return mockDirectData(path, options);
  }

  let response;

  try {
    response = await fetch(`${gatewayUrl}${path}`, {
      ...options,
      headers: {
        ...identityHeaders,
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      `Cannot reach API Gateway at ${gatewayUrl}. Make sure the gateway is running.`,
    );
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      body.message || `Emergency request failed with status ${response.status}`,
    );
  }

  return body.data;
}

export function getEmergencyRequests() {
  return emergencyRequest("/api/emergency-requests");
}

export function getEmergencyDashboardSummary() {
  return emergencyRequest("/api/emergency/dashboard/summary");
}

export function getActiveEmergencyCases() {
  return emergencyRequest("/api/emergency/cases/active");
}

export function getEmergencyResourceSnapshot() {
  return emergencyRequest("/api/emergency/resources/snapshot");
}

export function getEmergencyCaseTimeline(caseId) {
  return emergencyRequest(`/api/emergency/cases/${caseId}/timeline`);
}

export function getNotifications() {
  return emergencyRequest("/api/notifications?limit=100");
}

export function getUnreadCount() {
  return emergencyRequest("/api/notifications/unread-count");
}

export function markNotificationRead(notificationId) {
  return emergencyRequest(`/api/notifications/${notificationId}/read`, {
    method: "PATCH",
    body: "{}",
  });
}

export function markAllNotificationsRead() {
  return emergencyRequest("/api/notifications/read-all", {
    method: "PATCH",
    body: "{}",
  });
}

export function acknowledgeEmergencyRequest(
  alertId,
  accepted,
  rejectionReason,
) {
  return emergencyRequest(`/api/emergency/alerts/${alertId}/acknowledge`, {
    method: "POST",
    body: JSON.stringify({ accepted, rejectionReason }),
  });
}
