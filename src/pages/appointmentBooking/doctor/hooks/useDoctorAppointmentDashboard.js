import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "../../../../components/Toast";
import { appointmentService } from "../../../../services/appointmentBooking/appointmentApi";
import { connectAppointmentRealtime } from "../../../../services/appointmentBooking/appointmentRealtimeApi";
import { buildWeekRows, getWeekRange, localDateKey, statusCounts } from "../doctorAppointmentUtils";

export default function useDoctorAppointmentDashboard() {
  const [summary, setSummary] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [weekAppointments, setWeekAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [realtimeState, setRealtimeState] = useState("connecting");

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    const today = localDateKey();
    const { start, end } = getWeekRange();

    try {
      const [summaryResponse, todayResponse, weekResponse] = await Promise.all([
        appointmentService.getMyAppointmentSummary(today),
        appointmentService.getMyTodayAppointments({ date: today, page: 1, limit: 100 }),
        appointmentService.getMyAppointments({
          from: start.toISOString(),
          to: end.toISOString(),
          page: 1,
          limit: 100,
          sort: "appointmentDateTime:asc",
        }),
      ]);

      setSummary(summaryResponse?.data || null);
      setTodayAppointments(todayResponse?.data || []);
      setWeekAppointments(weekResponse?.data || []);
    } catch (requestError) {
      console.error("Unable to load doctor appointments:", requestError);
      const message = requestError?.status === 403
        ? "You do not have permission to view these appointments."
        : "Unable to load appointments.";
      setError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => refresh(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  useEffect(() => {
    let refreshTimer;
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => refresh({ silent: true }), 100);
    };

    const socket = connectAppointmentRealtime({
      onReady: () => {
        setRealtimeState("connected");
        scheduleRefresh();
      },
      onChanged: scheduleRefresh,
      onDisconnect: () => setRealtimeState("disconnected"),
      onError: (socketError) => {
        console.warn("Appointment realtime connection failed:", socketError.message);
        setRealtimeState("disconnected");
      },
    });

    return () => {
      window.clearTimeout(refreshTimer);
      socket.disconnect();
    };
  }, [refresh]);

  const updateStatus = useCallback(async (appointmentId, payload) => {
    try {
      setUpdatingId(appointmentId);
      await appointmentService.updateMyAppointmentStatus(appointmentId, payload);
      await refresh({ silent: true });
      toast("Appointment status updated.", "success");
      return true;
    } catch (requestError) {
      console.error("Unable to update appointment status:", requestError);
      toast("Unable to update appointment status.", "error");
      return false;
    } finally {
      setUpdatingId("");
    }
  }, [refresh]);

  const counts = useMemo(() => statusCounts(todayAppointments), [todayAppointments]);
  const weekRows = useMemo(() => buildWeekRows(weekAppointments), [weekAppointments]);

  return {
    summary,
    todayAppointments,
    weekAppointments,
    counts,
    weekRows,
    loading,
    updatingId,
    error,
    realtimeState,
    refresh,
    updateStatus,
  };
}
