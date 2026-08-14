import { mockDirectData } from "../mock/mockApi";

export const gatewayUrl = "mock://elly-prototype";

export const hospitalIdentity = {
  ellyId: "ELLY-USER-HOSP-ADMIN-001",
  partnerId: "ELLY-ORG-019EA2DD-FBD5-76B8-9CEC-19DA332BA2CD",
  role: "HOSPITAL_ADMIN",
};

async function emergencyRequest(path) {
  const payload = await mockDirectData(path);
  return payload?.data ?? payload;
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
  return emergencyRequest(`/api/notifications/${notificationId}/read`);
}

export function markAllNotificationsRead() {
  return emergencyRequest("/api/notifications/read-all");
}

export function acknowledgeEmergencyRequest(alertId, accepted, rejectionReason) {
  return emergencyRequest(
    `/api/emergency/alerts/${alertId}/acknowledge?accepted=${accepted}&reason=${encodeURIComponent(
      rejectionReason || "",
    )}`,
  );
}
