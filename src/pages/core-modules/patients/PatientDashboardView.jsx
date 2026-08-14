import { useState } from "react";
import PatientDashboard from "./PatientDashboard";
import DoctorPatients from "./DoctorPatients";
import PatientRegistrationQueue from "../../operations/patient-registration/PatientRegistrationQueue";
import useSessionStore from "../../../store/useSessionStore";
import { ROLES } from "../../../constant/rbac";

const VIEWS = [
  { id: "patient", label: "Patient Dashboard" },
  { id: "registration", label: "Registration Dashboard" },
];

const DOCTOR_VIEWS = [{ id: "my-patients", label: "My Patients" }];

function isDoctorRole(role) {
  return (
    String(role || "").toUpperCase() === ROLES.DOCTOR ||
    String(role || "").toUpperCase() === ROLES.CLINIC_DOCTOR
  );
}

export default function PatientDashboardView() {
  const role = useSessionStore((state) => state.role);
  const doctorView = isDoctorRole(role);

  const [view, setView] = useState(doctorView ? "my-patients" : "patient");
  const activeViews = doctorView ? DOCTOR_VIEWS : VIEWS;
  const activeView = activeViews.some((v) => v.id === view) ? view : activeViews[0].id;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700/70">
        <div>
          <h1 className="text-lg font-bold dark:text-white">
            {doctorView ? "Patient Module" : "Dashboard"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {doctorView
              ? "Overview of the patients you take care of, and access requests to their medical history."
              : "Patient census and registration workflow overview."}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {activeViews.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeView === v.id
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
              type="button"
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {doctorView ? (
          <DoctorPatients />
        ) : activeView === "patient" ? (
          <PatientDashboard />
        ) : (
          <PatientRegistrationQueue />
        )}
      </div>
    </div>
  );
}
