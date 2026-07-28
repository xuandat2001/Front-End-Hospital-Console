import useSessionStore from "../../store/useSessionStore";
import { ROLES } from "../../constant/rbac";

const MODULES = {
  [ROLES.HOSPITAL_ADMIN]: [
    { label: "Command Center", desc: "Real-time hospital overview and capacity monitoring" },
    { label: "Core Modules", desc: "Staff, patients, rooms, and ICU management" },
    { label: "Operations", desc: "Emergency workflow and appointment booking" },
    { label: "Clinical Ops", desc: "Registration, admissions, and surgery management" },
    { label: "Analytics", desc: "Performance dashboards and intelligence reports" },
    { label: "Insights", desc: "AI-powered recommendations and clinical insights" },
  ],
  [ROLES.CLINIC_DOCTOR]: [
    { label: "My Clinic", desc: "Personal clinic dashboard and schedule" },
    { label: "Patients", desc: "View and manage patient records" },
    { label: "Appointments", desc: "Manage appointment bookings" },
    { label: "Surgery", desc: "Submit and track surgery requests" },
    { label: "Reports", desc: "Access clinic reports and analytics" },
  ],
};

const MODULE_COLORS = [
  "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
];

export default function WelcomePage() {
  const currentUser = useSessionStore((s) => s.currentUser);
  const workspace = useSessionStore((s) => s.workspace);

  const role = currentUser?.role || ROLES.HOSPITAL_ADMIN;
  const isClinicDoctor = role === ROLES.CLINIC_DOCTOR;
  const modules = MODULES[role] || MODULES[ROLES.HOSPITAL_ADMIN];

  const rawName = currentUser?.fullName || "User";
  const greetingName = rawName.replace(/^Dr\.?\s*/i, "").split(" ")[0];

  const roleTitle = isClinicDoctor ? "Clinic Doctor" : "Hospital Admin";
  const roleDesc = isClinicDoctor
    ? "You have access to your clinic dashboard, patient records, surgery requests, and appointments."
    : "You have full access to manage hospital operations, staff, patients, and system-wide analytics.";

  const info = [
    { label: "Full Name", value: currentUser?.fullName || "-" },
    { label: "ELLY ID", value: currentUser?.ellyId || "-" },
    { label: "Role", value: roleTitle },
    { label: "Department", value: currentUser?.departmentName || currentUser?.departmentId || "-" },
    { label: "Clinic", value: currentUser?.clinicName || "-" },
    { label: "Specialization", value: currentUser?.specialization || "-" },
  ];

  const hospitalName = workspace?.hospitalName || currentUser?.clinicName || "ELLY Workspace";
  const workspaceId = workspace?.ellyHospitalId || "-";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold dark:text-white">
          Welcome to ELLY, {greetingName}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {roleDesc}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Hospital
          </h2>
          <p className="text-lg font-bold dark:text-white">{hospitalName}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {workspaceId}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Status
          </h2>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">Active</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Signed in as {roleTitle}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-8">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
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

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Available Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {modules.map((mod, i) => (
            <div
              key={mod.label}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${MODULE_COLORS[i % MODULE_COLORS.length]}`}>
                {mod.label.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold dark:text-white">{mod.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{mod.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
