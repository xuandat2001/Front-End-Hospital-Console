import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { MOCK_MODE } from "../mocks/mockSession";
import { icuService } from "../services/core-modules/icuApi";

const POLL_INTERVAL = 20000;
const SEVERITY_ORDER = {
  Critical: 0,
  "High Attention": 1,
  Watch: 2,
  Stable: 3,
  "Stale / Device Issue": 4,
};

function sortPatients(a, b) {
  const severity = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
  if (severity !== 0) return severity;
  return new Date(b.latestUpdateAt || b.updatedAt || 0) - new Date(a.latestUpdateAt || a.updatedAt || 0);
}

function upsertPatient(items, next) {
  if (!next?.id && !next?._id) return items;
  const key = next.id || next._id;
  const found = items.some((item) => (item.id || item._id) === key);
  const merged = found
    ? items.map((item) => ((item.id || item._id) === key ? { ...item, ...next, id: key } : item))
    : [{ ...next, id: key }, ...items];
  return merged.sort(sortPatients);
}

export default function useIcuRealtime(filters) {
  const [patients, setPatients] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectionState, setConnectionState] = useState(MOCK_MODE ? "mock" : "connecting");
  const socketRef = useRef(null);

  const refreshOverview = useCallback(async () => {
    const response = await icuService.getOverview();
    setOverview(response.data || null);
  }, []);

  const refreshPatients = useCallback(async () => {
    const response = await icuService.getPatients(filters);
    setPatients(response.data || []);
  }, [filters]);

  const refresh = useCallback(async () => {
    try {
      const [overviewResponse, patientResponse] = await Promise.all([
        icuService.getOverview(),
        icuService.getPatients(filters),
      ]);
      setOverview(overviewResponse.data || null);
      setPatients(patientResponse.data || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Unable to load ICU monitoring data.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    queueMicrotask(refresh);
  }, [refresh]);

  useEffect(() => {
    if (MOCK_MODE) {
      return;
    }

    const socket = io(icuService.gatewayUrl, {
      path: "/realtime/socket.io",
      auth: icuService.hospitalIdentity,
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connection:ready", () => {
      setConnectionState("connected");
      refresh();
    });
    socket.on("disconnect", () => setConnectionState("disconnected"));
    socket.on("connect_error", () => setConnectionState("disconnected"));

    socket.on("icu:patient-admitted", (patient) => {
      setPatients((current) => upsertPatient(current, patient));
      refreshOverview().catch(() => {});
    });
    socket.on("icu:vitals-updated", (patient) => {
      setPatients((current) => upsertPatient(current, patient));
      refreshOverview().catch(() => {});
    });
    socket.on("icu:severity-changed", () => {
      refreshPatients().catch(() => {});
      refreshOverview().catch(() => {});
    });
    socket.on("icu:patient-transferred", ({ id }) => {
      setPatients((current) => current.filter((patient) => (patient.id || patient._id) !== id));
      refreshOverview().catch(() => {});
    });
    socket.on("icu:patient-discharged", ({ id }) => {
      setPatients((current) => current.filter((patient) => (patient.id || patient._id) !== id));
      refreshOverview().catch(() => {});
    });
    socket.on("icu:alert-created", () => {
      refreshPatients().catch(() => {});
      refreshOverview().catch(() => {});
    });
    socket.on("icu:alert-acknowledged", () => {
      refreshPatients().catch(() => {});
      refreshOverview().catch(() => {});
    });
    socket.on("icu:device-connected", () => {
      refreshPatients().catch(() => {});
      refreshOverview().catch(() => {});
    });
    socket.on("icu:device-disconnected", () => {
      refreshPatients().catch(() => {});
      refreshOverview().catch(() => {});
    });
    socket.on("icu:signoff-updated", () => {
      refreshOverview().catch(() => {});
    });

    const timer = window.setInterval(refresh, POLL_INTERVAL);

    return () => {
      socket.disconnect();
      window.clearInterval(timer);
    };
  }, [refresh, refreshOverview, refreshPatients]);

  return useMemo(
    () => ({
      patients,
      overview,
      loading,
      error,
      connectionState,
      refresh,
      setPatients,
    }),
    [patients, overview, loading, error, connectionState, refresh]
  );
}
