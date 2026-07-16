import { useEffect, useMemo, useState } from "react";
import { roomService } from "../../services/core-modules/roomApi";
import { admissionService, surgeryService } from "../../services/core-modules/hospitalApi";
import { icuService } from "../../services/core-modules/icuApi";
import { getDailyEmergencySummary } from "../../services/emergency/emergencyCommandApi";

function KpiCard({ label, value, unit = "", status }) {
  const color = status === "good" ? "text-emerald-600 dark:text-emerald-400"
    : status === "warning" ? "text-amber-600 dark:text-amber-400"
    : status === "bad" ? "text-rose-600 dark:text-rose-400"
    : "text-slate-800 dark:text-white/90";
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-white/50">{label}</p>
      <div className="mt-1 flex items-baseline gap-1.5">
        {value != null ? (
          <span className={`text-lg font-bold tracking-tight ${color}`}>
            {value}{unit}
          </span>
        ) : (
          <span className="text-xs font-medium text-slate-400 dark:text-white/30">—</span>
        )}
      </div>
      {status && (
        <span className={`mt-0.5 inline-block text-[9px] font-semibold ${
          status === "good" ? "text-emerald-500" : status === "warning" ? "text-amber-500" : "text-rose-500"
        }`}>
          {status === "good" ? "On target" : status === "warning" ? "Needs attention" : "Critical"}
        </span>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    good: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    normal: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
    highLoad: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    critical: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[status] || styles.normal}`}>
      {status === "good" ? "Good" : status === "normal" ? "Normal" : status === "highLoad" ? "High Load" : "Critical"}
    </span>
  );
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isToday(isoString) {
  if (!isoString) return false;
  const date = new Date(isoString);
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function toMins(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

export default function OverviewPerformance() {
  const [rooms, setRooms] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [surgeries, setSurgeries] = useState([]);
  const [emergencySummary, setEmergencySummary] = useState(null);
  const [icuOverview, setIcuOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      roomService.getOccupancySummary(),
      admissionService.getAllAdmissions(),
      surgeryService.getAllSurgeries(),
      getDailyEmergencySummary(todayStr()).catch(() => null),
      icuService.getOverview().catch(() => null),
    ]).then(([r, a, s, e, i]) => {
      if (r.status === "fulfilled") setRooms(r.value?.data || []);
      if (a.status === "fulfilled") setAdmissions(a.value?.data || []);
      if (s.status === "fulfilled") setSurgeries(s.value?.data || []);
      if (e.status === "fulfilled") setEmergencySummary(e.value?.data || e.value);
      if (i.status === "fulfilled") setIcuOverview(i.value?.data || i.value);
    }).finally(() => setLoading(false));
  }, []);

  const todayAdmissions = useMemo(
    () => admissions.filter((a) => isToday(a.createdAt || a.admittedAt)),
    [admissions],
  );

  const todayDischarges = useMemo(
    () => admissions.filter((a) => a.currentStatus === "DISCHARGED" && isToday(a.dischargedAt)),
    [admissions],
  );

  const todaySurgeries = useMemo(
    () => surgeries.filter((s) => isToday(s.scheduledDate || s.startTime || s.createdAt)),
    [surgeries],
  );

  // Currently admitted (not discharged) with a valid admittedAt timestamp
  const currentlyAdmitted = useMemo(
    () => admissions.filter((a) => a.currentStatus !== "DISCHARGED" && a.currentStatus !== "INACTIVE"),
    [admissions],
  );

  const totalBeds = useMemo(
    () => rooms.reduce((sum, r) => sum + (r.capacity || 0), 0),
    [rooms],
  );

  const occupiedBeds = useMemo(
    () => rooms.reduce((sum, r) => sum + (r.occupiedBeds || 0), 0),
    [rooms],
  );

  const availableBeds = totalBeds - occupiedBeds;
  const bedOcc = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : null;
  const currentThroughput = currentlyAdmitted.length || null;
  const surgeriesCount = todaySurgeries.length || null;
  const avgWaitTime = null;
  const avgAdmissionTime = null;
  const avgDischargeTime = null;
  const emergencyResponse = emergencySummary?.averageResponseTimeMinutes ?? null;
  const emergencyCases = emergencySummary?.totalEmergencyCases ?? (todayAdmissions.filter((a) => {
    const reason = (a.admissionReason || "").toLowerCase();
    return reason.includes("emergency") || reason.includes("er") || reason.includes("urgent");
  }).length || null);
  const readmissions = null;
  const avgLos = null;

  const departments = useMemo(() => {
    const deptMap = {};
    rooms.forEach((r) => {
      const name = r.departmentId?.name || r.departmentName || r.departmentId || "Other";
      if (!deptMap[name]) deptMap[name] = { capacity: 0, occupied: 0 };
      deptMap[name].capacity += r.capacity || 0;
      deptMap[name].occupied += r.occupiedBeds || 0;
    });
    const list = Object.entries(deptMap).map(([name, d]) => {
      const occ = d.capacity > 0 ? (d.occupied / d.capacity) * 100 : 0;
      return {
        name,
        occ: Math.round(occ),
        status: occ > 85 ? "critical" : occ > 70 ? "highLoad" : occ > 50 ? "normal" : "good",
      };
    });
    return list.length ? list : null;
  }, [rooms]);

  const icuOcc = useMemo(() => {
    if (icuOverview) {
      const { totalBeds: tb, occupiedBeds: ob } = icuOverview;
      return tb > 0 ? Math.round((ob / tb) * 100) : null;
    }
    const icuRooms = rooms.filter((r) => (r.roomType || "").toUpperCase() === "ICU");
    const tb = icuRooms.reduce((s, r) => s + (r.capacity || 0), 0);
    const ob = icuRooms.reduce((s, r) => s + (r.occupiedBeds || 0), 0);
    return tb > 0 ? Math.round((ob / tb) * 100) : null;
  }, [icuOverview, rooms]);

  const alerts = useMemo(() => {
    const a = [];
    if (bedOcc != null && bedOcc > 85) a.push({ severity: "critical", text: `Bed occupancy at ${bedOcc}% — near full capacity.` });
    if (icuOcc != null && icuOcc > 85) a.push({ severity: "critical", text: `ICU occupancy at ${icuOcc}% — above critical threshold.` });
    if (emergencyResponse != null && emergencyResponse > 8) a.push({ severity: "warning", text: `Emergency response ${emergencyResponse} min exceeds 8 min target.` });
    if (bedOcc != null && bedOcc > 70 && bedOcc <= 85) a.push({ severity: "warning", text: `Bed occupancy at ${bedOcc}% — approaching capacity.` });
    return a;
  }, [bedOcc, icuOcc, emergencyResponse]);

  const todaySummary = useMemo(() => ({
    admitted: todayAdmissions.length || null,
    discharged: todayDischarges.length || null,
    surgeries: surgeriesCount,
    emergency: emergencyCases,
    readmissions,
    avgLos,
  }), [todayAdmissions, todayDischarges, surgeriesCount, emergencyCases, readmissions, avgLos]);

  if (loading) {
    return (
      <div className="dashboard-loading" aria-live="polite">
        <span />
        <p>Loading operational performance...</p>
      </div>
    );
  }

  return (
    <div className="intelligence-page">
      <header className="intelligence-page-header">
        <div>
          <h1>Performance</h1>
          <p>Live operational health — how is the hospital performing right now?</p>
        </div>
      </header>

      {/* ── Section 1: Live Operational KPIs ── */}
      <div className="mb-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Live Operational KPIs</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Avg Wait Time" value={avgWaitTime} unit=" min" />
          <KpiCard label="Admission Time" value={avgAdmissionTime} unit=" min" />
          <KpiCard label="Discharge Time" value={avgDischargeTime} unit=" min" />
          <KpiCard label="Emergency Response" value={emergencyResponse} unit=" min" status={emergencyResponse != null ? (emergencyResponse <= 6 ? "good" : emergencyResponse <= 10 ? "warning" : "bad") : null} />
          <KpiCard label="Today's Surgeries" value={surgeriesCount} />
          <KpiCard label="Patient Throughput" value={currentThroughput} />
        </div>
      </div>

      {/* ── Section 2: Department Performance ── */}
      <div className="mb-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Current Department Performance</p>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase text-slate-500 dark:border-white/[0.06] dark:text-white/40">
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Wait Time</th>
                <th className="px-4 py-3">Capacity</th>
              </tr>
            </thead>
            <tbody>
              {departments ? departments.map((d) => (
                <tr key={d.name} className="border-b border-slate-100 text-xs dark:border-white/[0.04]">
                  <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-white/70">{d.name}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={d.status || "normal"} /></td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-white/50">—</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                        <div className={`h-full rounded-full ${
                          (d.occ || 0) > 85 ? "bg-rose-500" : (d.occ || 0) > 70 ? "bg-amber-500" : "bg-emerald-500"
                        }`} style={{ width: `${Math.min(100, d.occ || 0)}%` }} />
                      </div>
                      <span className="text-slate-600 dark:text-white/50">{d.occ != null ? `${Math.round(d.occ)}%` : "—"}</span>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400 dark:text-white/30">
                    No department data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 3: Live Performance Alerts ── */}
      {alerts.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Live Performance Alerts</p>
          <div className="grid gap-2">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-lg border p-3 text-[11px] leading-snug ${
                a.severity === "critical"
                  ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
                  : a.severity === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
                  : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"
              }`}>
                <span className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                  a.severity === "critical" ? "bg-rose-500" : a.severity === "warning" ? "bg-amber-500" : "bg-blue-500"
                }`} />
                {a.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 4: Today's Performance Summary ── */}
      <div className="mb-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Today's Summary</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Admitted Today" value={todaySummary.admitted} />
          <KpiCard label="Discharged Today" value={todaySummary.discharged} />
          <KpiCard label="Surgeries Today" value={todaySummary.surgeries} />
          <KpiCard label="Emergency Cases" value={todaySummary.emergency} />
          <KpiCard label="Avg LOS" value={todaySummary.avgLos} unit=" days" />
          <KpiCard label="Readmissions" value={todaySummary.readmissions} />
        </div>
      </div>

      {/* ── Section 5: SLA Compliance ── */}
      <div className="mb-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Current SLA Compliance</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-white/50">Emergency Response</p>
            <p className="mt-1 text-lg font-bold tracking-tight text-slate-800 dark:text-white/90">—</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-white/50">Admission Target</p>
            <p className="mt-1 text-lg font-bold tracking-tight text-slate-800 dark:text-white/90">—</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-white/50">Discharge Target</p>
            <p className="mt-1 text-lg font-bold tracking-tight text-slate-800 dark:text-white/90">—</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-white/50">Registration SLA</p>
            <p className="mt-1 text-lg font-bold tracking-tight text-slate-800 dark:text-white/90">—</p>
          </div>
        </div>
      </div>

      {/* ── Section 6: Performance by Shift ── */}
      <div className="mb-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/40">Performance by Shift</p>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase text-slate-500 dark:border-white/[0.06] dark:text-white/40">
                <th className="px-4 py-3">Shift</th>
                <th className="px-4 py-3">Patients</th>
                <th className="px-4 py-3">Avg Wait</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400 dark:text-white/30">
                  No shift data available
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
