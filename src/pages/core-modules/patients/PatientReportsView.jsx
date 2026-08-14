import { useState } from "react";
import PatientReports from "./PatientReports";
import PatientRegistrationReports from "../../operations/patient-registration/PatientRegistrationReports";

const VIEWS = [
  { id: "patient", label: "Patient Reports" },
  { id: "registration", label: "Registration Reports" },
];

export default function PatientReportsView() {
  const [view, setView] = useState("patient");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700/70">
        <div>
          <h1 className="text-lg font-bold dark:text-white">Reports</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Patient census, demographics, incidents, and registration reports.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === v.id
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
        {view === "patient" ? (
          <PatientReports />
        ) : (
          <PatientRegistrationReports />
        )}
      </div>
    </div>
  );
}
