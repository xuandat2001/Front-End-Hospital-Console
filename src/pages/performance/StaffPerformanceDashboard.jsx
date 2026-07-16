import { useEffect, useState, useMemo } from "react";
import { performanceService } from "../../services/performance/performanceApi";
import { staffService } from "../../services/core-modules/staffApi";
import { hospitalService } from "../../services/core-modules/hospitalApi";
import StaffSearchBar from "../../components/staff/StaffSearchBar";
import MiniPieChart from "../../components/graphs/MiniPieChart";
import BarChart from "../../components/graphs/BarChart";

const RISK_COLORS = {
  LOW: "#22C55E",
  MODERATE: "#F59E0B",
  HIGH: "#EF4444",
  CRITICAL: "#7C3AED",
};

const getCasesRate = (p) => p.successfulCasesRate ?? p.succesfulCasesRate ?? 0;

export default function StaffPerformanceDashboard() {
  const [performances, setPerformances] = useState([]);
  const [staffMap, setStaffMap] = useState({});
  const [deptMap, setDeptMap] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      performanceService.getAllPerformances(),
      staffService.getAllStaff(),
      hospitalService.getAllDepartmentsList(),
    ]).then(([perfRes, staffRes, deptRes]) => {
      if (perfRes.status === "fulfilled") setPerformances(perfRes.value.data || []);
      if (staffRes.status === "fulfilled") {
        const map = {};
        (staffRes.value.data || []).forEach((s) => {
          map[s.ellyId || s._id] = s;
        });
        setStaffMap(map);
      }
      if (deptRes.status === "fulfilled") {
        const map = {};
        (deptRes.value || []).forEach((d) => {
          map[d.ellyDepartmentId || d._id] = d.name;
        });
        setDeptMap(map);
      }
    }).finally(() => setLoading(false));
  }, []);

  const filteredPerformances = useMemo(() => {
    if (!searchTerm.trim()) return performances;
    const q = searchTerm.toLowerCase();
    return performances.filter((p) => {
      const s = staffMap[p.staffId];
      return (
        s?.fullName?.toLowerCase().includes(q) ||
        s?.ellyId?.toLowerCase().includes(q) ||
        p.staffId?.toLowerCase().includes(q)
      );
    });
  }, [performances, searchTerm, staffMap]);

  const burnoutSlices = useMemo(() => {
    const counts = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };
    filteredPerformances.forEach((p) => { if (counts[p.burnoutRisk] !== undefined) counts[p.burnoutRisk]++; });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([label, value]) => ({ label, value, color: RISK_COLORS[label] }));
  }, [filteredPerformances]);

  const stressSlices = useMemo(() => {
    const counts = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };
    filteredPerformances.forEach((p) => { if (counts[p.stressLevel] !== undefined) counts[p.stressLevel]++; });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([label, value]) => ({ label, value, color: RISK_COLORS[label] }));
  }, [filteredPerformances]);

  const sortedBySuccess = useMemo(() => {
    return [...filteredPerformances].sort((a, b) => getCasesRate(b) - getCasesRate(a));
  }, [filteredPerformances]);

  const topPerformers = useMemo(() => {
    return sortedBySuccess.slice(0, 6).map((p) => {
      const s = staffMap[p.staffId];
      return {
        id: p._id || p.performanceId,
        name: s?.fullName || p.staffId,
        rate: Math.round(getCasesRate(p)),
      };
    });
  }, [sortedBySuccess, staffMap]);

  const avgScores = useMemo(() => {
    if (!filteredPerformances.length) return { data: [], labels: [] };
    const avg = (field) => Math.round(filteredPerformances.reduce((s, p) => s + (p[field] || 0), 0) / filteredPerformances.length);
    return {
      data: [avg("teamworkScore"), avg("mentalHealthScore"), avg("attendanceRate"), avg("taskCompletionRate")],
      labels: ["Teamwork", "Mental Health", "Attendance", "Task Completion"],
    };
    }, [filteredPerformances]);

  const attendanceByDept = useMemo(() => {
    const groups = {};
    filteredPerformances.forEach((p) => {
      const s = staffMap[p.staffId];
      const deptId = s?.departmentId || "unknown";
      if (!groups[deptId]) groups[deptId] = { total: 0, count: 0 };
      groups[deptId].total += p.attendanceRate || 0;
      groups[deptId].count += 1;
    });
    const entries = Object.entries(groups).map(([id, { total, count }]) => ({
      id,
      avg: Math.round(total / count),
    }));
    entries.sort((a, b) => b.avg - a.avg);
    return {
      data: entries.map((e) => e.avg),
      labels: entries.map((e) => `${deptMap[e.id] || e.id}: ${e.avg}%`),
    };
  }, [filteredPerformances, staffMap, deptMap]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold dark:text-white">Staff Performance</h1>
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Performance ratings, mental health scores, and risk indicators.
          </p>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="btn btn-primary"
            type="button"
          >
            {showSearch ? "Hide Search" : "Search"}
          </button>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Burnout Risk</p>
          <MiniPieChart slices={burnoutSlices} centerLabel={`${filteredPerformances.length}\nStaff`} />
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Stress Level</p>
          <MiniPieChart slices={stressSlices} centerLabel={`${filteredPerformances.length}\nStaff`} />
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-800 dark:border-slate-700 sm:col-span-2">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Top Performers by Success Rate</p>
          <div className="space-y-2">
            {topPerformers.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className="w-5 text-center text-sm font-bold text-slate-400">#{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium dark:text-white">{item.name}</span>
                    <span className="text-sm font-bold dark:text-white">{item.rate}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                      style={{ width: `${item.rate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {performances.length > 1 && (
        <div className="mb-8 flex flex-wrap gap-4">
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-800 dark:border-slate-700 flex-1 min-w-[320px]">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Average Scores</p>
            <BarChart data={avgScores.data} labels={avgScores.labels} compact />
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-800 dark:border-slate-700 flex-1 min-w-[320px]">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Attendance by Department</p>
            <BarChart data={attendanceByDept.data} labels={attendanceByDept.labels} compact />
          </div>
        </div>
      )}

      {showSearch && (<>
      <div className="mb-6 max-w-xs">
        <StaffSearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      </div>

      {filteredPerformances.length === 0 && (
        <p className="text-sm text-slate-400">No performance records found.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filteredPerformances.map((perf) => {
          const staff = staffMap[perf.staffId];
          return (
            <div key={perf._id || perf.performanceId} className="rounded-xl border bg-white p-5 shadow-sm dark:bg-slate-800 dark:border-slate-700">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold dark:text-white">
                    {staff?.fullName || perf.staffId}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {staff?.role === "DOCTOR" ? "Doctor" : staff?.role === "NURSE" ? "Nurse" : ""}
                    {staff?.specialization && <span> — {staff.specialization}</span>}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400">{new Date(perf.calculatedAt).toLocaleDateString()}</span>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400">Success</span>
                  <p className="font-bold dark:text-white">{getCasesRate(perf)}%</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400">Attendance</span>
                  <p className="font-bold dark:text-white">{perf.attendanceRate ?? "—"}%</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400">Task Completion</span>
                  <p className="font-bold dark:text-white">{perf.taskCompletionRate ?? "—"}%</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400">Patient Satisfaction</span>
                  <p className="font-bold dark:text-white">{perf.patientSatisfactionScore ?? "—"}/5</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 border-t pt-3 dark:border-slate-700">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-medium text-slate-500 dark:text-slate-400">Teamwork:</span>
                  <span className="font-semibold dark:text-white">{perf.teamworkScore ?? "—"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-medium text-slate-500 dark:text-slate-400">Mental:</span>
                  <span className="font-semibold dark:text-white">{perf.mentalHealthScore ?? "—"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: RISK_COLORS[perf.burnoutRisk] || "#6B7280" }} />
                  <span className="font-medium text-slate-500 dark:text-slate-400">Burnout:</span>
                  <span className="font-semibold dark:text-white">{perf.burnoutRisk || "—"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: RISK_COLORS[perf.stressLevel] || "#6B7280" }} />
                  <span className="font-medium text-slate-500 dark:text-slate-400">Stress:</span>
                  <span className="font-semibold dark:text-white">{perf.stressLevel || "—"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </>)}
    </div>
  );
}
