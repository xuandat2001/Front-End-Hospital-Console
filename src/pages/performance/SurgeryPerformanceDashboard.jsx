import { useEffect, useState, useMemo } from "react";
import { surgeryPerformanceService } from "../../services/performance/surgeryPerformanceApi";
import { staffService } from "../../services/core-modules/staffApi";
import MiniPieChart from "../../components/graphs/MiniPieChart";
import BarChart from "../../components/graphs/BarChart";

const OUTCOME_COLORS = {
  SUCCESSFUL: "#22C55E",
  COMPLICATIONS: "#F59E0B",
  FAILED: "#EF4444",
  PENDING: "#6B7280",
  CANCELLED: "#3B82F6",
};

const RATING_COLORS = {
  EXCELLENT: "#22C55E",
  GOOD: "#3B82F6",
  AVERAGE: "#F59E0B",
  NEEDS_IMPROVEMENT: "#EF4444",
  POOR: "#EF4444",
  PENDING: "#6B7280",
};

export default function SurgeryPerformanceDashboard() {
  const [performances, setPerformances] = useState([]);
  const [doctorMap, setDoctorMap] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedPerf, setSelectedPerf] = useState(null);

  useEffect(() => {
    Promise.allSettled([
      surgeryPerformanceService.getAllPerformances(),
      staffService.getAllStaff("DOCTOR"),
    ]).then(([perfRes, staffRes]) => {
      const errs = [];
      if (perfRes.status === "fulfilled") {
        const raw = perfRes.value;
        if (raw?.success && Array.isArray(raw.data)) {
          setPerformances(raw.data);
        } else {
          errs.push(`surgery-performance API: unexpected response ${JSON.stringify(raw).slice(0, 200)}`);
        }
      } else {
        errs.push(`surgery-performance API rejected: ${perfRes.reason?.message || "unknown"}`);
      }
      if (staffRes.status === "fulfilled") {
        const raw = staffRes.value;
        if (raw?.success && Array.isArray(raw.data)) {
          const map = {};
          raw.data.forEach((s) => { map[s.ellyId || s._id] = s; });
          setDoctorMap(map);
        } else {
          errs.push(`staff API: unexpected response ${JSON.stringify(raw).slice(0, 200)}`);
        }
      } else {
        errs.push(`staff API rejected: ${staffRes.reason?.message || "unknown"}`);
      }
      if (errs.length) setError(errs.join(" | "));
      else setError(null);
    }).finally(() => setLoading(false));
  }, []);

  const filteredPerformances = useMemo(() => {
    if (!searchTerm.trim()) return performances;
    const q = searchTerm.toLowerCase();
    return performances.filter((p) => {
      const doc = doctorMap[p.doctorId];
      return (
        p.performanceId?.toLowerCase().includes(q) ||
        p.surgeryId?.toLowerCase().includes(q) ||
        p.patientId?.toLowerCase().includes(q) ||
        p.outcome?.toLowerCase().includes(q) ||
        p.performanceRating?.toLowerCase().includes(q) ||
        doc?.firstName?.toLowerCase().includes(q) ||
        doc?.lastName?.toLowerCase().includes(q)
      );
    });
  }, [performances, searchTerm, doctorMap]);

  const outcomeSlices = useMemo(() => {
    const counts = { SUCCESSFUL: 0, COMPLICATIONS: 0, FAILED: 0, PENDING: 0, CANCELLED: 0 };
    filteredPerformances.forEach((p) => {
      const o = p.outcome || "PENDING";
      if (counts[o] !== undefined) counts[o]++;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([label, value]) => ({ label, value, color: OUTCOME_COLORS[label] }));
  }, [filteredPerformances]);

  const ratingSlices = useMemo(() => {
    const counts = {};
    filteredPerformances.forEach((p) => {
      const r = p.performanceRating || "PENDING";
      counts[r] = (counts[r] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([label, value]) => ({ label, value, color: RATING_COLORS[label] || "#6B7280" }));
  }, [filteredPerformances]);

  const avgMetrics = useMemo(() => {
    if (!filteredPerformances.length) return { data: [], labels: [] };
    const completed = filteredPerformances.filter((p) => p.outcome !== "PENDING" && p.outcome !== "CANCELLED");
    if (!completed.length) return { data: [], labels: [] };
    const avg = (field) =>
      Math.round(completed.reduce((s, p) => s + (p[field] || 0), 0) / completed.length);
    return {
      data: [
        Math.round(avg("durationMinutes") / 60 * 10) / 10,
        avg("delayMinutes"),
        avg("operatingRoomUtilization"),
        avg("recoveryDays"),
        avg("patientSatisfaction") * 20,
      ],
      labels: ["Avg Duration (h)", "Avg Delay (min)", "Utilization %", "Avg Recovery (d)", "Satisfaction %"],
    };
  }, [filteredPerformances]);

  const topDoctors = useMemo(() => {
    const byDoctor = {};
    filteredPerformances.forEach((p) => {
      if (p.outcome === "PENDING" || p.outcome === "CANCELLED") return;
      if (!byDoctor[p.doctorId]) byDoctor[p.doctorId] = { total: 0, successful: 0 };
      byDoctor[p.doctorId].total++;
      if (p.outcome === "SUCCESSFUL") byDoctor[p.doctorId].successful++;
    });
    const entries = Object.entries(byDoctor)
      .map(([id, data]) => ({
        id,
        rate: Math.round((data.successful / data.total) * 100),
        total: data.total,
        doctor: doctorMap[id],
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 8);
    return {
      data: entries.map((e) => e.rate),
      labels: entries.map((e) => {
        const name = e.doctor ? `${e.doctor.firstName} ${e.doctor.lastName}` : e.id;
        return `${name}: ${e.rate}% (${e.successful}/${e.total})`;
      }),
    };
  }, [filteredPerformances, doctorMap]);

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const formatDuration = (min) => {
    if (min == null) return "—";
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getDoctorName = (id) => {
    const doc = doctorMap[id];
    return doc ? `${doc.firstName} ${doc.lastName}` : id;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold dark:text-white">Surgery Performance</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Surgery outcomes, duration, delays, and doctor performance metrics.
          </p>
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="btn btn-primary"
          type="button"
        >
          {showSearch ? "Hide Search" : "Search"}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
          <p className="font-semibold">API Error</p>
          <p className="mt-1 font-mono text-xs">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500"
          >
            Retry
          </button>
        </div>
      )}

      {performances.length > 0 && (
        <>
          <div className="mb-8 flex flex-wrap gap-4">
            <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-800 dark:border-slate-700 flex-1 min-w-[280px]">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Outcome Distribution</p>
              <MiniPieChart slices={outcomeSlices} centerLabel={`${filteredPerformances.length}\nSurgeries`} />
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-800 dark:border-slate-700 flex-1 min-w-[280px]">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Performance Rating</p>
              <MiniPieChart slices={ratingSlices} centerLabel={`${filteredPerformances.length}\nRatings`} />
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-800 dark:border-slate-700 flex-1 min-w-[280px]">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Top Doctors by Success Rate</p>
              {topDoctors.data.length > 0 ? (
                <BarChart data={topDoctors.data} labels={topDoctors.labels} compact />
              ) : (
                <p className="text-xs text-slate-400">No data available.</p>
              )}
            </div>
          </div>

          {avgMetrics.data.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-4">
              <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-800 dark:border-slate-700 flex-1 min-w-[320px]">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Average Metrics (Completed Surgeries)</p>
                <BarChart data={avgMetrics.data} labels={avgMetrics.labels} compact />
              </div>
            </div>
          )}

          {showSearch && (<>
          <div className="mb-6 max-w-xs">
            <input
              type="text"
              placeholder="Search by surgery ID, doctor, patient, outcome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-violet-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="p-3 text-left text-sm font-bold text-slate-600 dark:text-slate-300">Surgery ID</th>
                  <th className="p-3 text-left text-sm font-bold text-slate-600 dark:text-slate-300">Doctor</th>
                  <th className="p-3 text-left text-sm font-bold text-slate-600 dark:text-slate-300">Outcome</th>
                  <th className="p-3 text-left text-sm font-bold text-slate-600 dark:text-slate-300">Duration</th>
                  <th className="p-3 text-left text-sm font-bold text-slate-600 dark:text-slate-300">Delay</th>
                  <th className="p-3 text-left text-sm font-bold text-slate-600 dark:text-slate-300">Rating</th>
                  <th className="p-3 text-left text-sm font-bold text-slate-600 dark:text-slate-300">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredPerformances.map((perf) => {
                  const rowId = perf._id || perf.performanceId;
                  const outcome = perf.outcome || "PENDING";
                  const rating = perf.performanceRating || "PENDING";
                  return (
                    <tr
                      key={rowId}
                      onClick={() => setSelectedPerf(perf)}
                      className="cursor-pointer border-t border-slate-200 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                    >
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        {perf.surgeryId}
                      </td>
                      <td className="p-3 text-sm text-slate-700 dark:text-slate-300">
                        {getDoctorName(perf.doctorId)}
                      </td>
                      <td className="p-3">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                          style={{
                            backgroundColor: OUTCOME_COLORS[outcome] || "#6B7280",
                            color: "#fff",
                          }}
                        >
                          {outcome}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-slate-700 dark:text-slate-300">
                        {formatDuration(perf.durationMinutes)}
                      </td>
                      <td className="p-3 text-sm text-slate-700 dark:text-slate-300">
                        {formatDuration(perf.delayMinutes)}
                      </td>
                      <td className="p-3 text-sm text-slate-700 dark:text-slate-300">
                        {rating.replace("_", " ")}
                      </td>
                      <td className="p-3 text-sm text-slate-500">
                        {new Date(perf.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
                {filteredPerformances.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-sm text-slate-400">
                      No surgery performance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="h-16" />
          </>)}
        </>
      )}

      {performances.length === 0 && !error && (
        <p className="text-sm text-slate-400">No surgery performance records found.</p>
      )}

      {selectedPerf && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setSelectedPerf(null)}
        >
          <div
            className="mx-4 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold dark:text-white">
                {selectedPerf.surgeryId}
              </h2>
              <button
                onClick={() => setSelectedPerf(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Performance ID</p>
                <p className="font-medium dark:text-white">{selectedPerf.performanceId}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Patient ID</p>
                <p className="font-medium dark:text-white">{selectedPerf.patientId}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Doctor</p>
                <p className="font-medium dark:text-white">{getDoctorName(selectedPerf.doctorId)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Department</p>
                <p className="font-medium dark:text-white">{selectedPerf.departmentId}</p>
              </div>
            </div>

            <hr className="my-4 dark:border-slate-700" />

            <p className="mb-3 text-xs font-bold uppercase text-slate-500">Timing</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Scheduled Start</p>
                <p className="font-medium dark:text-white">{formatDate(selectedPerf.scheduledStart)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Actual Start</p>
                <p className="font-medium dark:text-white">{formatDate(selectedPerf.actualStart)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Actual End</p>
                <p className="font-medium dark:text-white">{formatDate(selectedPerf.actualEnd)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Duration</p>
                <p className="font-medium dark:text-white">
                  {formatDuration(selectedPerf.durationMinutes)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Delay</p>
                <p className="font-medium dark:text-white">
                  {formatDuration(selectedPerf.delayMinutes)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">OR Utilization</p>
                <p className="font-medium dark:text-white">{selectedPerf.operatingRoomUtilization ?? "—"}%</p>
              </div>
            </div>

            <hr className="my-4 dark:border-slate-700" />

            <p className="mb-3 text-xs font-bold uppercase text-slate-500">Outcome & Recovery</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Outcome</p>
                <span
                  className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                  style={{
                    backgroundColor: OUTCOME_COLORS[selectedPerf.outcome || "PENDING"] || "#6B7280",
                    color: "#fff",
                  }}
                >
                  {selectedPerf.outcome || "PENDING"}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Performance Rating</p>
                <p className="font-medium dark:text-white">
                  {(selectedPerf.performanceRating || "PENDING").replace("_", " ")}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Complication Level</p>
                <p className="font-medium dark:text-white">{selectedPerf.complicationLevel || "NONE"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Infection</p>
                <p className="font-medium dark:text-white">{selectedPerf.infectionOccurred ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">ICU Transfer</p>
                <p className="font-medium dark:text-white">{selectedPerf.icuTransfer ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Recovery Days</p>
                <p className="font-medium dark:text-white">{selectedPerf.recoveryDays ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Patient Satisfaction</p>
                <p className="font-medium dark:text-white">
                  {selectedPerf.patientSatisfaction != null ? `${selectedPerf.patientSatisfaction}/5` : "—"}
                </p>
              </div>
            </div>

            {selectedPerf.issue?.hasIssue && (
              <>
                <hr className="my-4 dark:border-slate-700" />
                <p className="mb-3 text-xs font-bold uppercase text-red-500">Issue</p>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Category</p>
                      <p className="font-medium dark:text-white">{selectedPerf.issue.category}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Severity</p>
                      <p className="font-medium dark:text-white">{selectedPerf.issue.severity}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Description</p>
                      <p className="font-medium dark:text-white">{selectedPerf.issue.description || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Recommendation</p>
                      <p className="font-medium dark:text-white">{selectedPerf.issue.recommendation || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">Status</p>
                      <p className="font-medium dark:text-white">{selectedPerf.issue.status}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
