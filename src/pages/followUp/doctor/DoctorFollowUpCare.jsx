import { useState } from "react";
import { toast } from "../../../components/Toast";
import useSessionStore from "../../../store/useSessionStore";
import followUpApi from "../../../services/followUp/followUpApi";
import CancelFollowUpModal from "./components/CancelFollowUpModal";
import CompleteFollowUpModal from "./components/CompleteFollowUpModal";
import FollowUpDetailModal from "./components/FollowUpDetailModal";
import FollowUpFormModal from "./components/FollowUpFormModal";
import FollowUpQueue from "./components/FollowUpQueue";
import FollowUpStatusChart from "./components/FollowUpStatusChart";
import FollowUpSummaryCards from "./components/FollowUpSummaryCards";
import FollowUpWeekSchedule from "./components/FollowUpWeekSchedule";
import NextFollowUpCard from "./components/NextFollowUpCard";
import useDoctorFollowUpDashboard from "./hooks/useDoctorFollowUpDashboard";
import { taskId } from "./followUpUtils";

function FollowUpTabPlaceholder({ tab }) {
  const title = tab.charAt(0).toUpperCase() + tab.slice(1);
  return <div className="p-4 sm:p-5"><section className="dashboard-card rounded-2xl border p-5"><p className="text-xs font-bold uppercase tracking-wider text-violet-300">Doctor workspace</p><h1 className="mt-1 text-2xl font-bold text-white">{title}</h1><p className="mt-2 text-sm text-slate-400">The Follow-up Care {title} tab is reserved for a future release.</p></section></div>;
}

export default function DoctorFollowUpCare({ activeTab = "dashboard" }) {
  const tab = String(activeTab || "dashboard").toLowerCase();
  if (tab !== "dashboard") return <FollowUpTabPlaceholder tab={tab} />;
  return <DoctorFollowUpDashboard />;
}

function DoctorFollowUpDashboard() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const workspace = useSessionStore((state) => state.activeWorkspace || state.workspace);
  const { tasks, summary, loading, error, updatingId, refresh, update, complete, cancel, weekRows } = useDoctorFollowUpDashboard();
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mode, setMode] = useState("");

  const openDetails = async (task) => {
    setSelected(task);
    setMode("detail");
    setDetailLoading(true);
    try {
      const response = await followUpApi.getMyFollowUpById(taskId(task));
      setSelected(response?.data || task);
    } catch (requestError) {
      console.error("Unable to load follow-up details:", requestError);
      toast("Unable to load follow-up details.", "error");
      setMode("");
    } finally {
      setDetailLoading(false);
    }
  };

  const runMutation = async (action, payload) => {
    const result = await action(selected, payload);
    if (result) { setSelected(null); setMode(""); }
  };

  const doctorName = currentUser?.name || currentUser?.fullName || currentUser?.profileName || currentUser?.ellyId || "Doctor";
  const department = currentUser?.departmentName || currentUser?.specialization || currentUser?.specialty || "Clinical team";
  const hospital = workspace?.workspaceName || workspace?.name || "Current hospital";
  const next = summary?.nextFollowUp || null;

  return (
    <div className="min-w-0 p-4 pb-6 sm:p-5">
      <header className="dashboard-card mb-3 rounded-2xl border p-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">Doctor workspace</p><h1 className="mt-1 text-2xl font-bold text-white">Follow-up Care</h1><p className="mt-1 text-sm text-slate-400">Track patients who need review after their visits.</p><p className="mt-3 text-xs text-slate-300">{doctorName} <span className="px-1 text-slate-600">•</span> {department} <span className="px-1 text-slate-600">•</span> {hospital}</p></header>
      {error && <div className="mb-3 flex items-center justify-between rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><span>{error}</span><button type="button" onClick={() => refresh()} className="font-semibold underline">Try again</button></div>}
      <FollowUpSummaryCards summary={summary} loading={loading} />
      <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]"><FollowUpQueue tasks={tasks} loading={loading} onView={openDetails} /><NextFollowUpCard task={next} loading={loading} updating={Boolean(updatingId)} onView={openDetails} onEdit={(task) => { setSelected(task); setMode("edit"); }} onComplete={(task) => { setSelected(task); setMode("complete"); }} onCancel={(task) => { setSelected(task); setMode("cancel"); }} /></div>
      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2"><FollowUpStatusChart tasks={tasks} loading={loading} /><FollowUpWeekSchedule rows={weekRows} loading={loading} /></div>
      {mode === "detail" && <FollowUpDetailModal task={selected} loading={detailLoading} onClose={() => { setSelected(null); setMode(""); }} onEdit={() => setMode("edit")} onComplete={() => setMode("complete")} onCancel={() => setMode("cancel")} />}
      <FollowUpFormModal open={mode === "edit"} task={selected} submitting={updatingId === taskId(selected)} onClose={() => setMode("detail")} onSubmit={(payload) => runMutation(update, payload)} />
      <CompleteFollowUpModal key={mode === "complete" ? taskId(selected) : "no-complete"} task={mode === "complete" ? selected : null} submitting={updatingId === taskId(selected)} onBack={() => setMode("detail")} onConfirm={(payload) => runMutation(complete, payload)} />
      <CancelFollowUpModal key={mode === "cancel" ? taskId(selected) : "no-cancel"} task={mode === "cancel" ? selected : null} submitting={updatingId === taskId(selected)} onBack={() => setMode("detail")} onConfirm={(payload) => runMutation(cancel, payload)} />
    </div>
  );
}
