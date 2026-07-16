import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getRegistrationQueue,
  readdRegistrationEntry,
  removeRegistrationEntry,
} from "../services/registration/registrationQueueApi";

const DEFAULT_POLL_MS = 5000;

const ACTION_FN = {
  remove: removeRegistrationEntry,
  readd: readdRegistrationEntry,
};

/**
 * Reads the assessed registration roster from hospital-intelligence-service
 * and exposes remove / re-add actions. Polls on an interval so the dashboard
 * graphs stay in sync with backend acceptance decisions.
 */
export default function useRegistrationQueue({ pollIntervalMs = DEFAULT_POLL_MS } = {}) {
  const [queue, setQueue] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionState, setActionState] = useState({});
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const body = await getRegistrationQueue("ALL");
      if (!mountedRef.current) return;
      setQueue(Array.isArray(body.data) ? body.data : []);
      setSummary(body.summary || null);
      setError("");
    } catch (refreshError) {
      if (!mountedRef.current) return;
      setError(refreshError.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const timer = setInterval(refresh, pollIntervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [refresh, pollIntervalMs]);

  const runAction = useCallback(
    async (eventId, action, notes) => {
      const actionFn = ACTION_FN[action];
      if (!actionFn) throw new Error(`Unsupported action: ${action}`);

      setActionState((current) => ({ ...current, [eventId]: action }));
      try {
        await actionFn(eventId, notes);
        await refresh();
      } finally {
        if (mountedRef.current) {
          setActionState((current) => {
            const next = { ...current };
            delete next[eventId];
            return next;
          });
        }
      }
    },
    [refresh],
  );

  return useMemo(
    () => ({
      queue,
      summary,
      loading,
      error,
      actionState,
      refresh,
      remove: (eventId, notes) => runAction(eventId, "remove", notes),
      readd: (eventId, notes) => runAction(eventId, "readd", notes),
    }),
    [queue, summary, loading, error, actionState, refresh, runAction],
  );
}
