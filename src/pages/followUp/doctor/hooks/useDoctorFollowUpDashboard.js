import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "../../../../components/Toast";
import followUpApi from "../../../../services/followUp/followUpApi";
import { dueThisWeek, statusCounts, taskId } from "../followUpUtils";

export default function useDoctorFollowUpDashboard() {
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const [listResponse, summaryResponse] = await Promise.all([
        followUpApi.getMyFollowUps({ limit: 100, sort: "dueAt:asc" }),
        followUpApi.getMyFollowUpSummary(),
      ]);
      setTasks(listResponse?.data || []);
      setSummary(summaryResponse?.data || null);
    } catch (requestError) {
      console.error("Unable to load follow-ups:", requestError);
      setError(
        requestError?.status === 403
          ? "You do not have permission to view Follow-up Care."
          : "Unable to load follow-ups.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const mutate = useCallback(async (id, action, successMessage) => {
    setUpdatingId(id);
    try {
      const response = await action();
      toast(successMessage, "success");
      await refresh({ quiet: true });
      return response?.data || null;
    } catch (requestError) {
      console.error(successMessage, requestError);
      toast(requestError?.message || "Unable to update follow-up.", "error");
      return null;
    } finally {
      setUpdatingId("");
    }
  }, [refresh]);

  const update = useCallback((task, payload) => {
    const id = taskId(task);
    return mutate(id, () => followUpApi.updateMyFollowUp(id, payload), "Follow-up updated.");
  }, [mutate]);

  const complete = useCallback((task, payload) => {
    const id = taskId(task);
    return mutate(id, () => followUpApi.completeMyFollowUp(id, payload), "Follow-up completed.");
  }, [mutate]);

  const cancel = useCallback((task, payload) => {
    const id = taskId(task);
    return mutate(id, () => followUpApi.cancelMyFollowUp(id, payload), "Follow-up canceled.");
  }, [mutate]);

  const counts = useMemo(() => statusCounts(tasks), [tasks]);
  const weekRows = useMemo(() => dueThisWeek(tasks), [tasks]);

  return { tasks, summary, loading, error, updatingId, refresh, update, complete, cancel, counts, weekRows };
}
