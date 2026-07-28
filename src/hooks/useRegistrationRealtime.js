import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { MOCK_MODE } from "../mocks/mockSession";
import {
  gatewayUrl,
  getRegistrationNotifications,
  getRegistrationUnreadCount,
  hospitalIdentity,
} from "../services/registration/registrationRealtimeApi";
import useRegistrationStore from "./useRegistrationStore";
import { patientService } from "../services/core-modules/patientApi";
import { upsertBy } from "./useEmergencyRealtime";

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

function syncRegistrationToStore(notification, receiveRegistration) {
  if (!notification?.eventId) return;

  receiveRegistration({
    notificationId: notification.notificationId,
    ellyId: notification.ellyId,
    hospitalId: notification.hospitalId,
    hospitalMRN: notification.hospitalMRN,
    eventId: notification.eventId,
    registeredAt: notification.occurredAt,
  });

  if (!notification.ellyId) return;

  patientService
    .getPatientByEllyId(notification.ellyId)
    .then((profileResponse) => {
      const patientProfile = profileResponse.data?.patient || profileResponse.data;
      receiveRegistration({
        notificationId: notification.notificationId,
        ellyId: patientProfile.ellyId,
        fullName: patientProfile.fullName,
        dateOfBirth: patientProfile.dateOfBirth,
        gender: patientProfile.gender,
        hospitalId: notification.hospitalId,
        hospitalMRN: notification.hospitalMRN,
        eventId: notification.eventId,
        registeredAt: notification.occurredAt,
      });
    })
    .catch((enrichError) => {
      console.error(
        "[WebSockets] Failed to enrich registration data:",
        enrichError,
      );
    });
}

function isRegistrationNotification(item) {
  return item?.eventType === "RegistrationSuccessEvent";
}

export default function useRegistrationRealtime() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionState, setConnectionState] = useState(MOCK_MODE ? "mock" : "connecting");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const receiveRegistration = useRegistrationStore(
    (state) => state.receiveRegistration,
  );

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

  const ingestRegistration = useCallback(
    (rawEvent, { notifyStore = true } = {}) => {
      const notification = normalizeRegistrationEvent(rawEvent);
      if (!notification.eventId) {
        console.warn("[WebSockets] Ignoring registration without eventId:", rawEvent);
        return notification;
      }

      if (notifyStore) {
        syncRegistrationToStore(notification, receiveRegistration);
      }

      setNotifications((current) => {
        const exists = current.some(
          (item) => item.eventId === notification.eventId,
        );

        if (exists) {
          return upsertBy(current, notification, "eventId");
        }

        if (!notification.read) {
          setUnreadCount((count) => count + 1);
        }

        return upsertBy(current, notification, "eventId").slice(0, 100);
      });

      return notification;
    },
    [receiveRegistration],
  );

  useEffect(() => {
    queueMicrotask(refresh);

    if (MOCK_MODE) {
      return;
    }

    const socket = io(gatewayUrl, {
      path: "/realtime/socket.io",
      auth: hospitalIdentity,
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socket.on("connection:ready", () => {
      setConnectionState("connected");
      setError("");
      refresh();
    });

    socket.on("disconnect", () => setConnectionState("disconnected"));
    socket.on("connect_error", (connectError) => {
      console.error("[Socket] Registration connection error:", connectError.message);
      setConnectionState("disconnected");
      setError(connectError.message);
    });

    socket.on("notification:new", (notification) => {
      if (!isRegistrationNotification(notification)) return;
      console.log("[WebSockets] Incoming registration notification:", notification);
      ingestRegistration(notification);
    });

    socket.on("RegistrationSuccessEvent", (eventPayload) => {
      console.log("[WebSockets] Incoming RegistrationSuccessEvent:", eventPayload);
      ingestRegistration(eventPayload);
    });

    socket.on("notification:updated", (notification) => {
      if (notification.allRead) {
        setUnreadCount(0);
        setNotifications((current) =>
          current.map((item) => ({ ...item, read: true })),
        );
        return;
      }

      if (!isRegistrationNotification(notification)) return;

      ingestRegistration(notification, { notifyStore: true });
    });

    return () => socket.disconnect();
  }, [ingestRegistration, refresh]);

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
