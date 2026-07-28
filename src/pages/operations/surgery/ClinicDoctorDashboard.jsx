import useSessionStore from "../../../store/useSessionStore";

export default function ClinicDoctorDashboard() {
  const currentUser = useSessionStore((s) => s.currentUser);
  const workspace = useSessionStore((s) => s.workspace);

  const info = [
    { label: "Full Name", value: currentUser?.fullName || "-" },
    { label: "ELLY ID", value: currentUser?.ellyId || "-" },
    { label: "Role", value: currentUser?.role || "Doctor" },
    { label: "Department", value: currentUser?.departmentName || currentUser?.departmentId || "-" },
    { label: "Clinic", value: currentUser?.clinicName || workspace?.workspaceName || "-" },
    { label: "Specialization", value: currentUser?.specialization || currentUser?.specialty || "-" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold dark:text-white mb-1">My Clinic Dashboard</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Welcome back, {currentUser?.fullName || "Doctor"}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Hospital
          </h2>
          <p className="text-lg font-bold dark:text-white">
            {workspace?.workspaceName || workspace?.hospitalName || "-"}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {workspace?.workspaceEllyId || workspace?.ellyHospitalId || ""}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Status
          </h2>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">Active</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Signed in as {currentUser?.role || "Doctor"}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Profile
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          {info.map((item) => (
            <div key={item.label} className="flex items-baseline gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[120px]">{item.label}</span>
              <span className="text-sm font-medium dark:text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
