import { formatEmergencyStatus } from "./emergencyPresentation";
import { formatSmart } from "./dateFormat";

export function getNotificationTime(notification) {
  return new Date(
    notification?.occurredAt || notification?.createdAt || 0,
  ).getTime();
}

export function isEmergencyActionRequired(request) {
  return !request?.status || request.status === "PENDING";
}

export function getEmergencyStatusLabel(request) {
  if (isEmergencyActionRequired(request)) {
    return "Action required";
  }

  return formatEmergencyStatus(request.status);
}

export function getRegistrationStatusLabel() {
  return "Auto-accepted";
}

function mapEmergencyNotification(notification, requestsByAlertId) {
  const alertId = notification.alertId || notification.payload?.alertId;
  const request = alertId ? requestsByAlertId.get(alertId) : null;
  const actionRequired = isEmergencyActionRequired(request);
  const statusLabel = getEmergencyStatusLabel(request);

  return {
    id: notification.eventId,
    type: "emergency",
    alertId,
    eventId: notification.eventId,
    actionRequired,
    statusLabel,
    occurredAt: notification.occurredAt || notification.createdAt || null,
    label: request
      ? `${request.severity || "Emergency"} request for ${
          request.requiredSpecialty || "Emergency Medicine"
        }`
      : notification.title || "Emergency admission request",
    actionLabel: actionRequired ? "Review request" : "View request",
  };
}

function mapRegistrationNotification(notification) {
  const ellyId = notification.ellyId || notification.payload?.data?.ellyId;
  const hospitalId =
    notification.hospitalId || notification.payload?.data?.hospitalId;

  return {
    id: notification.eventId,
    type: "registration",
    eventId: notification.eventId,
    ellyId,
    hospitalId,
    actionRequired: false,
    statusLabel: getRegistrationStatusLabel(),
    occurredAt: notification.occurredAt || notification.createdAt || null,
    label:
      notification.message ||
      `Patient ${ellyId || "unknown"} registered and auto-accepted at ${
        hospitalId || "hospital"
      }`,
    actionLabel: "Open record",
  };
}

export function buildUnifiedNotifications(realtime, registrationRealtime) {
  const requestsByAlertId = new Map(
    (realtime?.requests || []).map((request) => [request.alertId, request]),
  );

  const emergencyItems = [...(realtime?.notifications || [])]
    .filter(
      (notification) =>
        notification.eventType === "EMERGENCY_ADMISSION_REQUESTED",
    )
    .map((notification) =>
      mapEmergencyNotification(notification, requestsByAlertId),
    );

  const registrationItems = [...(registrationRealtime?.notifications || [])]
    .filter(
      (notification) =>
        notification.eventType === "RegistrationSuccessEvent",
    )
    .map((notification) => mapRegistrationNotification(notification));

  return [...emergencyItems, ...registrationItems].sort(
    (left, right) => getNotificationTime(right) - getNotificationTime(left),
  );
}

export function getLatestNotification(realtime, registrationRealtime) {
  return buildUnifiedNotifications(realtime, registrationRealtime)[0] || null;
}

export function filterNotifications(notifications, filter) {
  if (filter === "action-required") {
    return notifications.filter((notification) => notification.actionRequired);
  }

  if (filter === "completed") {
    return notifications.filter((notification) => !notification.actionRequired);
  }

  return notifications;
}

export function countActionRequiredNotifications(notifications) {
  return notifications.filter((notification) => notification.actionRequired)
    .length;
}
export function formatNotificationTime(value) {
  if (!value) return "\u2014";
  return formatSmart(value);
}

export function buildAllNotifications(realtime, registrationRealtime) {
  return buildUnifiedNotifications(realtime, registrationRealtime);
}

export function buildActiveNotifications(realtime, registrationRealtime) {
  return filterNotifications(
    buildUnifiedNotifications(realtime, registrationRealtime),
    "action-required",
  );
}

// Backward-compatible aliases
export function countUnprocessedNotifications(notifications) {
  return countActionRequiredNotifications(notifications);
}
