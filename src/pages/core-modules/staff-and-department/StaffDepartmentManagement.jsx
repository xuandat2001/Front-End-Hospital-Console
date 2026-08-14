import { useState } from "react";
import StaffManagement from "./StaffManagement";
import DepartmentManagement from "./DepartmentManagement";

export default function StaffDepartmentManagement() {
  const [activeTab, setActiveTab] = useState("staff");

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex gap-0 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 px-6 pt-4">
        <button
          type="button"
          onClick={() => setActiveTab("staff")}
          className={
            "px-5 py-3 text-sm font-semibold border-b-2 transition-colors " +
            (activeTab === "staff"
              ? "border-teal-500 text-teal-600"
              : "border-transparent text-slate-500 hover:text-slate-700")
          }
        >
          Staff Management
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("department")}
          className={
            "px-5 py-3 text-sm font-semibold border-b-2 transition-colors " +
            (activeTab === "department"
              ? "border-teal-500 text-teal-600"
              : "border-transparent text-slate-500 hover:text-slate-700")
          }
        >
          Department Management
        </button>
      </div>
      {activeTab === "staff" ? <StaffManagement /> : <DepartmentManagement />}
    </div>
  );
}
