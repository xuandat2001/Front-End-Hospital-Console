import { useCallback, useEffect, useMemo, useState } from "react";
import {
  acknowledgeEmergencyRequest,
  getActiveEmergencyCases,
  getEmergencyDashboardSummary,
  getEmergencyResourceSnapshot,
  getEmergencyRequests,
  getNotifications,
  getUnreadCount,
  hospitalIdentity,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/emergency/emergencyRealtimeApi";
import { isActiveEmergencyRequest } from "../utils/emergencyPresentation";

export function upsertBy(items, next, key) {
  const existingIndex = items.findIndex((item) => item[key] === next[key]);
  if (existingIndex === -1) return [next, ...items];

  return items.map((item, index) =>
    index === existingIndex ? next : item,
  );
}

export default function useEmergencyRealtime() {
  const [requests, setRequests] = useState([]);
  const [activeCases, setActiveCases] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState(null);
  const [resources, setResources] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionState] = useState("connected");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingAlertId, setPendingAlertId] = useState("");

  const refreshDashboard = useCallback(async () => {
    const [activeCaseData, summaryData, resourceData] = await Promise.all([
      getActiveEmergencyCases(),
      getEmergencyDashboardSummary(),
      getEmergencyResourceSnapshot(),
    ]);
    setActiveCases((activeCaseData || []).filter(isActiveEmergencyRequest));
    setSummary(summaryData || null);
    setResources(resourceData || null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [requestData, notificationData, countData] = await Promise.all([
        getEmergencyRequests(),
        getNotifications(),
        getUnreadCount(),
        refreshDashboard(),
      ]);
      setRequests(requestData || []);
      setNotifications(notificationData || []);
      setUnreadCount(countData?.count || 0);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [refreshDashboard]);

  useEffect(() => {
    queueMicrotask(refresh);
  }, [refresh]);

  const acknowledge = useCallback(
    async (alertId, accepted, rejectionReason) => {
      setPendingAlertId(alertId);
      setError("");

      try {
        const result = await acknowledgeEmergencyRequest(
          alertId,
          accepted,
          rejectionReason,
        );
        setRequests((current) =>
          current.map((request) =>
            request.alertId === alertId
              ? {
                  ...request,
                  status: accepted ? "ACCEPTED" : "REJECTED",
                  rejectionReason: accepted
                    ? request.rejectionReason
                    : rejectionReason,
                  lastEventAt: new Date().toISOString(),
                }
              : request,
          ),
        );
        setActiveCases((current) =>
          current
            .map((request) =>
              request.alertId === alertId
                ? {
                    ...request,
                    status: accepted ? "ACCEPTED" : "REJECTED",
                    rejectionReason: accepted
                      ? request.rejectionReason
                      : rejectionReason,
                    lastEventAt: new Date().toISOString(),
                  }
                : request,
            )
            .filter(isActiveEmergencyRequest),
        );
        await refreshDashboard();
        return result;
      } catch (requestError) {
        setError(requestError.message);
        throw requestError;
      } finally {
        setPendingAlertId("");
      }
    },
    [refreshDashboard],
  );

  const markRead = useCallback(
    async (notificationId) => {
      const notification = notifications.find(
        (item) => item._id === notificationId,
      );
      if (!notification || notification.read) return notification;

      const updated = await markNotificationRead(notificationId);
      setNotifications((current) =>
        current.map((item) =>
          item._id === notificationId
            ? { ...item, ...updated, read: true }
            : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      return updated;
    },
    [notifications],
  );

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true })),
    );
  }, []);

  return useMemo(
    () => ({
      requests,
      activeCases,
      notifications,
      summary,
      resources,
      unreadCount,
      connectionState,
      loading,
      error,
      pendingAlertId,
      hospitalIdentity,
      acknowledge,
      markRead,
      markAllRead,
      refresh,
      refreshDashboard,
    }),
    [
      requests,
      activeCases,
      notifications,
      summary,
      resources,
      unreadCount,
      connectionState,
      loading,
      error,
      pendingAlertId,
      acknowledge,
      markRead,
      markAllRead,
      refresh,
      refreshDashboard,
    ],
  );
}
