import { useState } from "react";
import ReportList from "./ReportList";

const VIEWS = [
  { id: "equipment", label: "Equipment", category: "EQUIPMENT", title: "Equipment Reports" },
  { id: "incident", label: "Incident", category: "INCIDENT", title: "Incident Reports" },
  { id: "maintenance", label: "Maintenance", category: "MAINTENANCE", title: "Maintenance Reports" },
];

export default function RoomReports() {
  const [view, setView] = useState("equipment");

  const active = VIEWS.find((v) => v.id === view) || VIEWS[0];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3 dark:border-slate-700/70">
        <div>
          <h1 className="text-lg font-bold dark:text-white">Room Reports</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Equipment, incident, and maintenance reports for rooms and beds.
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ReportList
          key={active.id}
          category={active.category}
          title={active.title}
          showCreate
        />
      </div>
    </div>
  );
}
