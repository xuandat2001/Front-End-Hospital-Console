import { useState } from "react";
import { FileText, RefreshCw, Stethoscope } from "lucide-react";
import AppointmentBookingDetailModal from "../../../components/appointment-booking/AppointmentBookingDetailModal";
import { toast } from "../../../components/Toast";
import { formatDateTime } from "../../../utils/dateFormat";
import { appointmentService } from "../../../services/appointmentBooking/appointmentApi";
import CancelAppointmentModal from "./components/CancelAppointmentModal";
import DoctorWeekSchedule from "./components/DoctorWeekSchedule";
import NextAppointmentCard from "./components/NextAppointmentCard";
import TodaySchedule from "./components/TodaySchedule";
import VisitStatusChart from "./components/VisitStatusChart";
import useDoctorAppointmentDashboard from "./hooks/useDoctorAppointmentDashboard";
import FollowUpFormModal from "../../followUp/doctor/components/FollowUpFormModal";
import followUpApi from "../../../services/followUp/followUpApi";
import useSessionStore from "../../../store/useSessionStore";
import PatientRecordModal from "./components/PatientRecordModal";

function DoctorTabPlaceholder({ tab }) {
  const title = tab.charAt(0).toUpperCase() + tab.slice(1);
  return (
    <div className="p-4 sm:p-5">
      <section className="dashboard-card rounded-2xl border p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-300">Doctor workspace</p>
        <h1 className="mt-1 text-2xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm text-slate-400">
          The doctor Appointment Booking {title} tab is reserved for a future release.
        </p>
      </section>
    </div>
  );
}

export default function DoctorAppointmentBooking({ activeTab = "dashboard" }) {
  const tab = String(activeTab || "dashboard").toLowerCase();
  if (tab !== "dashboard") {
    return <DoctorTabPlaceholder tab={tab} />;
  }
  return <DoctorAppointmentDashboard />;
}

function DoctorAppointmentDashboard() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const workspace = useSessionStore((state) => state.activeWorkspace || state.workspace);
  const {
    summary,
    todayAppointments,
    counts,
    weekRows,
    loading,
    updatingId,
    error,
    refresh,
    updateStatus,
  } = useDoctorAppointmentDashboard();
  const [detailAppointment, setDetailAppointment] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelAppointment, setCancelAppointment] = useState(null);
  const [followUpAppointment, setFollowUpAppointment] = useState(null);
  const [creatingFollowUp, setCreatingFollowUp] = useState(false);
  const [patientRecord, setPatientRecord] = useState(null);
  const doctorName =
    currentUser?.name || currentUser?.fullName || currentUser?.profileName ||
    currentUser?.ellyId || "Doctor";
  const department =
    currentUser?.departmentName || currentUser?.specialization ||
    currentUser?.specialty || "Clinical team";
  const hospital = workspace?.workspaceName || workspace?.name || "Current hospital";

  const openDetails = async (appointmentId) => {
    if (!appointmentId) return;
    try {
      setDetailLoading(true);
      const response = await appointmentService.getMyAppointmentById(appointmentId);
      setDetailAppointment(response?.data || null);
    } catch (requestError) {
      console.error("Unable to load appointment details:", requestError);
      toast("Unable to load appointment details.", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const startNext = async () => {
    const appointment = summary?.nextAppointment;
    if (!appointment?._id) return;
    await updateStatus(appointment._id, { status: "IN_PROGRESS" });
  };

  const completeNext = async () => {
    const appointment = summary?.nextAppointment;
    if (!appointment?._id) return;
    await updateStatus(appointment._id, { status: "COMPLETED" });
  };

  const markNextNoShow = async () => {
    const appointment = summary?.nextAppointment;
    if (!appointment?._id) return;
    await updateStatus(appointment._id, {
      status: "NO_SHOW",
      notes: "Patient did not attend",
    });
  };

  const confirmCancellation = async (reason) => {
    if (!cancelAppointment?._id) return;
    const updated = await updateStatus(cancelAppointment._id, {
      status: "CANCELED",
      cancellationReason: reason,
    });
    if (updated) setCancelAppointment(null);
  };

  const createFollowUp = async (payload) => {
    if (!followUpAppointment?._id) return;
    setCreatingFollowUp(true);
    try {
      await followUpApi.createFromAppointment(followUpAppointment._id, payload);
      toast("Follow-up created.", "success");
      setFollowUpAppointment(null);
    } catch (requestError) {
      console.error("Unable to create follow-up:", requestError);
      toast(requestError?.message || "Unable to create follow-up.", "error");
    } finally {
      setCreatingFollowUp(false);
    }
  };

  const viewPatientRecord = () => {
    const patientEllyId =
      detailAppointment?.patient?.ellyId ||
      detailAppointment?.patient?.patientEllyId ||
      detailAppointment?.patientEllyId;
    if (!patientEllyId) {
      toast("Patient ELLY ID is unavailable.", "error");
      return;
    }
    setDetailAppointment(null);
    setPatientRecord({
      ellyId: patientEllyId,
      name: detailAppointment?.patient?.name || "Patient",
    });
  };

  return (
    <div className="min-w-0 p-4 pb-6 sm:p-5">
      <header className="dashboard-card mb-3 flex items-start justify-between gap-4 rounded-2xl border p-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
            Doctor workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white">My Appointments</h1>
          <p className="mt-1 text-sm text-slate-400">
            View today&apos;s schedule, upcoming visits, and appointment status.
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <Stethoscope size={14} className="text-violet-300" />
            <span>{doctorName}</span>
            <span className="text-slate-600">•</span>
            <span>{department}</span>
            <span className="text-slate-600">•</span>
            <span>{hospital}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>
      {error && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <span>{error}</span>
          <button type="button" onClick={() => refresh()} className="font-semibold underline">Try again</button>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(310px,0.85fr)]">
        <TodaySchedule
          appointments={todayAppointments}
          loading={loading}
          onView={openDetails}
        />
        <NextAppointmentCard
          appointment={summary?.nextAppointment || null}
          loading={loading}
          updating={Boolean(updatingId)}
          onStart={startNext}
          onComplete={completeNext}
          onCreateFollowUp={() => setFollowUpAppointment(summary?.nextAppointment || null)}
          onNoShow={markNextNoShow}
          onCancel={() => setCancelAppointment(summary?.nextAppointment || null)}
          onView={() => openDetails(summary?.nextAppointment?._id)}
        />
      </div>

      <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
        <VisitStatusChart counts={counts} loading={loading} />
        <DoctorWeekSchedule rows={weekRows} loading={loading} />
      </div>

      {detailLoading && (
        <div className="fixed inset-0 z-[12999] flex items-center justify-center bg-black/35 text-sm font-semibold text-white">
          Loading appointment details...
        </div>
      )}
      <AppointmentBookingDetailModal
        appointment={detailAppointment}
        onClose={() => setDetailAppointment(null)}
        formatDateTime={formatDateTime}
        footerActions={detailAppointment ? (
          <div className={`grid gap-2 ${["IN_PROGRESS", "COMPLETED"].includes(String(detailAppointment.status).toUpperCase()) ? "sm:grid-cols-2" : ""}`}>
            <button
              type="button"
              onClick={viewPatientRecord}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-500"
            >
              <FileText size={16} />
              View Record
            </button>
            {["IN_PROGRESS", "COMPLETED"].includes(String(detailAppointment.status).toUpperCase()) && (
              <button type="button" onClick={() => setFollowUpAppointment(detailAppointment)} className="w-full rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-2.5 text-sm font-bold text-violet-200 hover:bg-violet-500/20">Create Follow-up</button>
            )}
          </div>
        ) : null}
      />
      <FollowUpFormModal open={Boolean(followUpAppointment)} appointment={followUpAppointment} submitting={creatingFollowUp} onClose={() => setFollowUpAppointment(null)} onSubmit={createFollowUp} />
      <PatientRecordModal
        patient={patientRecord}
        workspace={workspace}
        onClose={() => setPatientRecord(null)}
      />
      <CancelAppointmentModal
        key={cancelAppointment?._id || "no-cancel-appointment"}
        appointment={cancelAppointment}
        submitting={updatingId === cancelAppointment?._id}
        onBack={() => setCancelAppointment(null)}
        onConfirm={confirmCancellation}
      />
    </div>
  );
}

