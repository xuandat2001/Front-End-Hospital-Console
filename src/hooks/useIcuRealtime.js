import { useCallback, useEffect, useMemo, useState } from "react";
import { icuService } from "../services/core-modules/icuApi";

const POLL_INTERVAL = 20000;

export default function useIcuRealtime(filters) {
  const [patients, setPatients] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectionState] = useState("connected");

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
    const timer = window.setInterval(refresh, POLL_INTERVAL);

    return () => {
      window.clearInterval(timer);
    };
  }, [refresh]);

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
