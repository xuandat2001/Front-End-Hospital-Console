import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getRegistrationNotifications,
  getRegistrationUnreadCount,
  hospitalIdentity,
} from "../services/registration/registrationRealtimeApi";

export function getRegistrationEventId(event) {
  const data = event?.data || event?.payload?.data || event || {};

  if (event?.eventId) return event.eventId;
  if (event?._id) return String(event._id);

  const hospitalId = data.hospitalId || data.partnerId || event?.hospitalId;
  if (data.ellyId && hospitalId) {
    return `reg_${data.ellyId}_${hospitalId}`;
  }

  if (data.ellyId && event?.timestamp) {
    return `reg_${data.ellyId}_${event.timestamp}`;
  }

  return null;
}

export function normalizeRegistrationEvent(event) {
  const data = event?.data || event?.payload?.data || event || {};
  const hospitalId = data.hospitalId || data.partnerId || event?.hospitalId;

  return {
    notificationId: event?._id ? String(event._id) : null,
    eventId: getRegistrationEventId(event),
    eventType: "RegistrationSuccessEvent",
    ellyId: data.ellyId,
    hospitalId,
    hospitalMRN: data.hospitalMRN,
    title: event?.title || "Patient registered",
    message:
      event?.message ||
      `Patient ${data.ellyId || "unknown"} registered and auto-accepted at ${hospitalId || "hospital"}`,
    occurredAt:
      event?.occurredAt || event?.timestamp || new Date().toISOString(),
    read: Boolean(event?.read),
    payload: event?.payload || event,
  };
}

export default function useRegistrationRealtime() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionState] = useState("connected");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [notificationData, countData] = await Promise.all([
        getRegistrationNotifications(),
        getRegistrationUnreadCount(),
      ]);

      const normalized = (notificationData || []).map((item) =>
        normalizeRegistrationEvent(item),
      );

      setNotifications(normalized);
      setUnreadCount(countData?.count || 0);
      setError("");
    } catch (refreshError) {
      setError(refreshError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(refresh);
  }, [refresh]);

  const dismissNotification = useCallback((eventId) => {
    setNotifications((current) =>
      current.map((item) =>
        item.eventId === eventId ? { ...item, read: true } : item,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true })),
    );
    setUnreadCount(0);
  }, []);

  return useMemo(
    () => ({
      notifications,
      unreadCount,
      connectionState,
      loading,
      error,
      hospitalIdentity,
      dismissNotification,
      clearAllNotifications,
      refresh,
    }),
    [
      notifications,
      unreadCount,
      connectionState,
      loading,
      error,
      dismissNotification,
      clearAllNotifications,
      refresh,
    ],
  );
}
