import useSessionStore from "../../../store/useSessionStore";
import DoctorPatients from "../../core-modules/patients/DoctorPatients";

export default function ClinicDoctorDashboard() {
  const currentUser = useSessionStore((s) => s.currentUser);
  const workspace = useSessionStore((s) => s.workspace);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-slate-200 bg-white/55 px-5 py-3 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/45">
        <h1 className="text-lg font-bold dark:text-white">My Clinic Dashboard</h1>
        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
          {[currentUser?.fullName, currentUser?.specialization || currentUser?.specialty, workspace?.workspaceName || workspace?.hospitalName]
            .filter(Boolean)
            .join(" · ") || "Welcome back, Doctor"}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <DoctorPatients />
      </div>
    </div>
  );
}
