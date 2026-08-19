import { useCallback, useEffect, useMemo, useState } from "react";
import { admissionPerformanceService } from "../../../services/performance/admissionPerformanceApi";
import { surgeryPerformanceService } from "../../../services/performance/surgeryPerformanceApi";
import { roomPerformanceService } from "../../../services/performance/roomPerformanceApi";
import { performanceService } from "../../../services/performance/performanceApi";
import { staffService } from "../../../services/core-modules/staffApi";
import { hospitalService } from "../../../services/core-modules/hospitalApi";
import {
  avg, round, monthKey, monthLabel, pearsonCorr,
  weightedMovingAverage, exponentialSmoothing, linearRegressionForecast,
} from "../../../components/analytics/utils";
import { extractCollection, finiteNumber, safePercent } from "../../../utils/performanceDataContracts";

const KPI_DEFS = [
  { key: "satisfaction",    label: "Patient Satisfaction",  target: 4.2, unit: "/5",    goodDir: 1 },
  { key: "readmission",     label: "Readmission Rate",      target: 8,   unit: "%",    goodDir: -1 },
  { key: "wait",            label: "Avg Wait Time",         target: 20,  unit: "min",  goodDir: -1 },
  { key: "surgerySuccess",  label: "Surgery Success",       target: 95,  unit: "%",    goodDir: 1 },
  { key: "complicationRate",label: "Complication Rate",     target: 5,   unit: "%",    goodDir: -1 },
  { key: "avgDuration",     label: "Avg Surgery Duration",  target: 120, unit: "min",  goodDir: -1 },
];

const TREND_METRICS = [
  { key: "admissions", label: "Admissions", color: "bg-indigo-500" },
  { key: "wait", label: "Wait Time", color: "bg-amber-500" },
  { key: "satisfaction", label: "Satisfaction", color: "bg-emerald-500" },
  { key: "readmission", label: "Readmission", color: "bg-rose-500" },
  { key: "surgerySuccess", label: "Surgery Success", color: "bg-cyan-500" },
];

const BOTTLENECK_STAGES = [
  { key: "wait",        label: "Waiting" },
  { key: "processing",  label: "Consultation" },
  { key: "stay",        label: "Length of Stay" },
];

export default function PerformanceAnalytics() {
  const [admissionRecords, setAdmissionRecords] = useState([]);
  const [surgeryRecords, setSurgeryRecords] = useState([]);
  const [roomRecords, setRoomRecords] = useState([]);
  const [staffRecords, setStaffRecords] = useState([]);
  const [staffMap, setStaffMap] = useState({});
  const [deptMap, setDeptMap] = useState({});
  const [selectedTrend, setSelectedTrend] = useState("admissions");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [adm, surg, room, staff, staffRes, deptRes] = await Promise.allSettled([
        admissionPerformanceService.getAll(),
        surgeryPerformanceService.getAllPerformances(),
        roomPerformanceService.getAllPerformances(),
        performanceService.getAllPerformances(),
        staffService.getAllStaff(),
        hospitalService.getAllDepartmentsList(),
      ]);
      if (adm.status === "fulfilled") setAdmissionRecords(extractCollection(adm.value));
      if (surg.status === "fulfilled") setSurgeryRecords(extractCollection(surg.value));
      if (room.status === "fulfilled") setRoomRecords(extractCollection(room.value));
      if (staff.status === "fulfilled") setStaffRecords(extractCollection(staff.value));
      if (staffRes.status === "fulfilled") {
        const raw = staffRes.value;
        const list = extractCollection(raw);
        const map = {};
        list.forEach((s) => {
          const id = s.ellyId || s._id;
          if (id) map[id] = s;
          if (s._id && s._id !== id) map[s._id] = s;
          if (s.staffId) map[s.staffId] = s;
        });
        setStaffMap(map);
      }
      if (deptRes.status === "fulfilled") {
        const map = {};
        extractCollection(deptRes.value).forEach((d) => { map[d.ellyDepartmentId || d._id] = d.name || d; });
        setDeptMap(map);
      }
      const errs = [];
      if (adm.status === "rejected") errs.push(`Admission: ${adm.reason?.message}`);
      if (surg.status === "rejected") errs.push(`Surgery: ${surg.reason?.message}`);
      if (room.status === "rejected") errs.push(`Room: ${room.reason?.message}`);
      if (staff.status === "rejected") errs.push(`Staff: ${staff.reason?.message}`);
      if (errs.length) setError(errs.join(" | "));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  const admissionByMonth = useMemo(() => {
    const groups = {};
    admissionRecords.forEach((r) => {
      const mk = monthKey(r.calculatedAt || r.createdAt);
      if (!mk) return;
      if (!groups[mk]) groups[mk] = { count: 0, processing: [], wait: [], stay: [], satisfaction: [], readmitted: 0 };
      groups[mk].count++;
      groups[mk].processing.push(finiteNumber(r.admissionProcessingTime));
      groups[mk].wait.push(finiteNumber(r.waitTime));
      groups[mk].stay.push(finiteNumber(r.lengthOfStay));
      groups[mk].satisfaction.push(finiteNumber(r.patientSatisfaction));
      if (r.readmittedWithin30Days) groups[mk].readmitted++;
    });
    const sorted = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    return {
      labels: sorted.map(([k]) => monthLabel(k)),
      counts: sorted.map(([, v]) => v.count),
      processing: sorted.map(([, v]) => round(avg(v.processing))),
      wait: sorted.map(([, v]) => round(avg(v.wait))),
      stay: sorted.map(([, v]) => round(avg(v.stay))),
      satisfaction: sorted.map(([, v]) => round(avg(v.satisfaction))),
      readmissionRate: sorted.map(([, v]) => v.count ? round((v.readmitted / v.count) * 100) : 0),
    };
  }, [admissionRecords]);

  const surgeryByMonth = useMemo(() => {
    const groups = {};
    surgeryRecords.forEach((r) => {
      const mk = monthKey(r.calculatedAt || r.createdAt);
      if (!mk) return;
      if (!groups[mk]) groups[mk] = { count: 0, successful: 0, complications: 0, duration: [], satisfaction: [] };
      groups[mk].count++;
      if (r.outcome === "SUCCESSFUL") groups[mk].successful++;
      if (r.complicationLevel && r.complicationLevel !== "NONE") groups[mk].complications++;
      groups[mk].duration.push(finiteNumber(r.durationMinutes ?? r.duration));
      groups[mk].satisfaction.push(finiteNumber(r.patientSatisfactionScore ?? r.patientSatisfaction));
    });
    const sorted = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    return {
      labels: sorted.map(([k]) => monthLabel(k)),
      counts: sorted.map(([, v]) => v.count),
      successRate: sorted.map(([, v]) => v.count ? round((v.successful / v.count) * 100) : 0),
      complicationRate: sorted.map(([, v]) => v.count ? round((v.complications / v.count) * 100) : 0),
      avgDuration: sorted.map(([, v]) => round(avg(v.duration))),
    };
  }, [surgeryRecords]);

  const departmentPerformance = useMemo(() => {
    const deptGroups = {};
    staffRecords.forEach((p) => {
      const s = staffMap[p.staffId];
      const deptId = s?.departmentId || "unknown";
      if (!deptGroups[deptId]) deptGroups[deptId] = { staffCount: 0, attendance: [], taskCompletion: [], teamwork: [], mental: [] };
      deptGroups[deptId].staffCount++;
      deptGroups[deptId].attendance.push(finiteNumber(p.attendanceRate));
      deptGroups[deptId].taskCompletion.push(finiteNumber(p.taskCompletionRate));
      deptGroups[deptId].teamwork.push(finiteNumber(p.teamworkScore));
      deptGroups[deptId].mental.push(finiteNumber(p.mentalHealthScore));
    });
    const deptSurgery = {};
    surgeryRecords.forEach((r) => {
      const doc = staffMap[r.doctorId];
      const deptId = doc?.departmentId || "unknown";
      if (!deptSurgery[deptId]) deptSurgery[deptId] = { count: 0, successful: 0, duration: [], satisfaction: [] };
      deptSurgery[deptId].count++;
      if (r.outcome === "SUCCESSFUL") deptSurgery[deptId].successful++;
      deptSurgery[deptId].duration.push(finiteNumber(r.durationMinutes ?? r.duration));
      deptSurgery[deptId].satisfaction.push(finiteNumber(r.patientSatisfactionScore ?? r.patientSatisfaction));
    });
    const deptAdmission = {};
    admissionRecords.forEach((r) => {
      const deptId = r.departmentId || "unknown";
      if (!deptAdmission[deptId]) deptAdmission[deptId] = { count: 0, wait: [], stay: [], satisfaction: [], readmitted: 0 };
      deptAdmission[deptId].count++;
      deptAdmission[deptId].wait.push(finiteNumber(r.waitTime));
      deptAdmission[deptId].stay.push(finiteNumber(r.lengthOfStay));
      deptAdmission[deptId].satisfaction.push(finiteNumber(r.patientSatisfaction));
      if (r.readmittedWithin30Days) deptAdmission[deptId].readmitted++;
    });
    return Object.entries(deptGroups)
      .map(([id, g]) => {
        const a = round(avg(g.attendance));
        const tc = round(avg(g.taskCompletion));
        const tw = round(avg(g.teamwork));
        const mh = round(avg(g.mental));
        const efficiency = round((a + tc + tw + mh) / 4);
        const surg = deptSurgery[id];
        const adm = deptAdmission[id];
        return {
          id, name: deptMap[id] || id, efficiency,
          staffCount: g.staffCount,
          surgerySuccess: surg ? round(safePercent(surg.successful, surg.count)) : null,
          surgeryCount: surg?.count || 0,
          avgStay: adm ? round(avg(adm.stay)) : null,
          readmissionRate: adm ? round(safePercent(adm.readmitted, adm.count)) : null,
          patientSatisfaction: adm ? round(avg(adm.satisfaction)) : null,
        };
      })
      .sort((a, b) => b.efficiency - a.efficiency)
      .map((d, i) => ({ ...d, rank: i + 1 }));
  }, [staffRecords, staffMap, deptMap, surgeryRecords, admissionRecords]);

  const rootCauses = useMemo(() => {
    const findings = [];
    if (admissionRecords.length < 5) return findings;
    const recent = admissionRecords.slice(-20);
    const older = admissionRecords.slice(0, 20);
    const avgRecentWait = avg(recent.map((r) => finiteNumber(r.waitTime)));
    const avgOlderWait = avg(older.map((r) => finiteNumber(r.waitTime)));
    if (avgOlderWait > 0 && avgRecentWait > avgOlderWait * 1.15)
      findings.push({ issue: `Wait time increased ${round(((avgRecentWait - avgOlderWait) / avgOlderWait) * 100)}%`, severity: "warning" });
    const avgRecentStay = avg(recent.map((r) => finiteNumber(r.lengthOfStay)));
    const avgOlderStay = avg(older.map((r) => finiteNumber(r.lengthOfStay)));
    if (avgOlderStay > 0 && avgRecentStay > avgOlderStay * 1.1)
      findings.push({ issue: `Length of stay increased ${round(((avgRecentStay - avgOlderStay) / avgOlderStay) * 100)}%`, severity: "warning" });
    if (admissionByMonth.satisfaction.length > 1) {
      const recentSat = admissionByMonth.satisfaction.slice(-2);
      if (recentSat.length === 2 && recentSat[1] < recentSat[0])
        findings.push({ issue: `Patient satisfaction declined ${recentSat[0] - recentSat[1]} points`, severity: "info" });
    }
    if (surgeryByMonth.successRate.length > 1) {
      const recentRate = surgeryByMonth.successRate.slice(-2);
      if (recentRate.length === 2 && recentRate[1] < recentRate[0] - 3)
        findings.push({ issue: "Surgery success rate declining", severity: "critical" });
    }
    const highOccRooms = roomRecords.filter((r) => (r.occupancyRate ?? 50) > 90);
    if (highOccRooms.length > 3)
      findings.push({ issue: `${highOccRooms.length} rooms at critical occupancy (>90%)`, severity: "critical" });
    const readmitRecent = admissionRecords.filter((r) => r.readmittedWithin30Days);
    if (readmitRecent.length > 2)
      findings.push({ issue: `${readmitRecent.length} readmissions within 30 days`, severity: "warning" });
    return findings;
  }, [admissionRecords, admissionByMonth, surgeryByMonth, roomRecords]);

  const benchmarking = useMemo(() => {
    if (admissionRecords.length < 2) return null;
    const byMonth = {};
    admissionRecords.forEach((r) => {
      const mk = monthKey(r.calculatedAt || r.createdAt);
      if (!mk) return;
      if (!byMonth[mk]) byMonth[mk] = { admissions: 0, satisfaction: [], wait: [], stay: [] };
      byMonth[mk].admissions++;
      byMonth[mk].satisfaction.push(finiteNumber(r.patientSatisfaction));
      byMonth[mk].wait.push(finiteNumber(r.waitTime));
      byMonth[mk].stay.push(finiteNumber(r.lengthOfStay));
    });
    const sortedMonths = Object.keys(byMonth).sort();
    const current = sortedMonths[sortedMonths.length - 1];
    const prev = sortedMonths[sortedMonths.length - 2];
    if (!current || !prev) return null;
    const c = byMonth[current];
    const p = byMonth[prev];
    return {
      currentLabel: monthLabel(current), prevLabel: monthLabel(prev),
      admissions: { current: c.admissions, prev: p.admissions, change: round(safePercent(c.admissions - p.admissions, p.admissions)) },
      satisfaction: { current: round(avg(c.satisfaction)), prev: round(avg(p.satisfaction)), change: round(avg(c.satisfaction) - avg(p.satisfaction)) },
      waitTime: { current: round(avg(c.wait)), prev: round(avg(p.wait)), change: round(safePercent(avg(c.wait) - avg(p.wait), avg(p.wait))) },
      los: { current: round(avg(c.stay)), prev: round(avg(p.stay)), change: round(safePercent(avg(c.stay) - avg(p.stay), avg(p.stay))) },
    };
  }, [admissionRecords]);

  const roomUtilization = useMemo(() => {
    const statuses = {};
    roomRecords.forEach((r) => {
      const occ = finiteNumber(r.occupancyRate, 50);
      let status;
      if (occ < 30) status = "Under-utilized";
      else if (occ < 60) status = "Normal";
      else if (occ < 85) status = "High Usage";
      else status = "High Demand";
      statuses[status] = (statuses[status] || 0) + 1;
    });
    const total = roomRecords.length || 1;
    return Object.entries(statuses).map(([label, value]) => ({ label, value, pct: round((value / total) * 100) }));
  }, [roomRecords]);

  const satisfactionDrivers = useMemo(() => {
    if (admissionRecords.length < 5) return [];
    const fields = ["admissionProcessingTime", "bedAssignmentTime", "waitTime", "lengthOfStay"];
    const valid = admissionRecords.filter((r) => fields.every((f) => r[f] != null) && r.patientSatisfaction != null);
    if (valid.length < 5) return [];
    const y = valid.map((r) => r.patientSatisfaction);
    return fields.map((f) => {
      const x = valid.map((r) => r[f]);
      const corr = pearsonCorr(x, y);
      const abs = corr != null ? Math.abs(corr) : 0;
      return { field: f, label: f.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()), corr, weight: abs };
    }).filter((f) => f.corr != null).sort((a, b) => b.weight - a.weight);
  }, [admissionRecords]);

  const forecasts = useMemo(() => {
    const out = {};

    // Occupancy
    const rates = roomRecords.map((r) => finiteNumber(r.occupancyRate, 50));
    if (rates.length >= 3) {
      const actual = round(avg(rates));
      const wma = round(weightedMovingAverage(rates, 3));
      const es = round(exponentialSmoothing(rates, 0.3));
      const lr = round(linearRegressionForecast(rates));
      const clamped = (v) => Math.max(0, Math.min(100, v));
      // Score each model by how close it would have been to the last known value
      const hist = rates.slice(0, -1);
      const lastActual = rates[rates.length - 1];
      const scores = [
        { key: "WMA", value: clamped(wma), error: hist.length >= 3 ? Math.abs(weightedMovingAverage(hist, 3) - lastActual) : null },
        { key: "ES",  value: clamped(es),  error: hist.length >= 2 ? Math.abs(exponentialSmoothing(hist, 0.3) - lastActual) : null },
        { key: "LR",  value: clamped(lr),  error: hist.length >= 2 ? Math.abs(linearRegressionForecast(hist) - lastActual) : null },
      ].filter((m) => m.error != null);
      const best = scores.length ? scores.reduce((a, b) => (a.error <= b.error ? a : b)) : scores[0];
      out.occupancy = { actual, models: scores, bestKey: best?.key ?? "WMA" };
    }

    // Admissions (monthly totals)
    const admCounts = admissionByMonth.counts;
    if (admCounts.length >= 3) {
      const actual = admCounts[admCounts.length - 1];
      const wma = round(weightedMovingAverage(admCounts, 3));
      const es = round(exponentialSmoothing(admCounts, 0.3));
      const lr = round(linearRegressionForecast(admCounts));
      const hist = admCounts.slice(0, -1);
      const scores = [
        { key: "WMA", value: wma, error: hist.length >= 3 ? Math.abs(weightedMovingAverage(hist, 3) - admCounts[admCounts.length - 1]) : null },
        { key: "ES",  value: es,  error: hist.length >= 2 ? Math.abs(exponentialSmoothing(hist, 0.3) - admCounts[admCounts.length - 1]) : null },
        { key: "LR",  value: lr,  error: hist.length >= 2 ? Math.abs(linearRegressionForecast(hist) - admCounts[admCounts.length - 1]) : null },
      ].filter((m) => m.error != null);
      const best = scores.reduce((a, b) => (a.error <= b.error ? a : b));
      out.admissions = { actual, models: scores, bestKey: best.key };
    }

    // Wait time
    const waitTimes = admissionByMonth.wait;
    if (waitTimes.length >= 3) {
      const actual = waitTimes[waitTimes.length - 1];
      const wma = round(weightedMovingAverage(waitTimes, 3));
      const es = round(exponentialSmoothing(waitTimes, 0.3));
      const lr = round(linearRegressionForecast(waitTimes));
      const hist = waitTimes.slice(0, -1);
      const scores = [
        { key: "WMA", value: wma, error: hist.length >= 3 ? Math.abs(weightedMovingAverage(hist, 3) - waitTimes[waitTimes.length - 1]) : null },
        { key: "ES",  value: es,  error: hist.length >= 2 ? Math.abs(exponentialSmoothing(hist, 0.3) - waitTimes[waitTimes.length - 1]) : null },
        { key: "LR",  value: lr,  error: hist.length >= 2 ? Math.abs(linearRegressionForecast(hist) - waitTimes[waitTimes.length - 1]) : null },
      ].filter((m) => m.error != null);
      const best = scores.reduce((a, b) => (a.error <= b.error ? a : b));
      out.waitTime = { actual, models: scores, bestKey: best.key };
    }

    return out;
  }, [roomRecords, admissionByMonth]);

  const trendSeries = useMemo(() => {
    const series = { admissions: admissionByMonth.counts };
    series.wait = admissionByMonth.wait;
    series.satisfaction = admissionByMonth.satisfaction;
    series.readmission = admissionByMonth.readmissionRate;
    series.surgerySuccess = surgeryByMonth.successRate;
    return series;
  }, [admissionByMonth, surgeryByMonth]);

  const activeTrendData = useMemo(() => {
    const values = trendSeries[selectedTrend] || [];
    if (values.length < 2) return [];
    const max = Math.max(...values) || 1;
    return values.map((v) => ({ value: v, pct: (v / max) * 100 }));
  }, [trendSeries, selectedTrend]);

  const kpiValues = useMemo(() => {
    const a = admissionByMonth;
    const s = surgeryByMonth;
    const recent2 = (arr) => arr.length >= 2 ? arr.slice(-2) : arr.length ? [arr[0], arr[0]] : [0, 0];
    const current = (arr) => arr.length ? arr[arr.length - 1] : 0;
    const calcChange = (arr) => {
      const [prev, curr] = recent2(arr);
      return round(safePercent(curr - prev, prev));
    };
    return {
      satisfaction:    { value: current(a.satisfaction),      change: calcChange(a.satisfaction) },
      readmission:     { value: current(a.readmissionRate),   change: calcChange(a.readmissionRate) },
      wait:            { value: current(a.wait),              change: calcChange(a.wait) },
      surgerySuccess:  { value: current(s.successRate),       change: calcChange(s.successRate) },
      complicationRate:{ value: current(s.complicationRate),  change: calcChange(s.complicationRate) },
      avgDuration:     { value: current(s.avgDuration),       change: calcChange(s.avgDuration) },
    };
  }, [admissionByMonth, surgeryByMonth]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
      </div>
    );
  }

  const kpiColor = (v, def) => {
    if (v == null) return "text-slate-400";
    const ok = def.goodDir > 0 ? v >= def.target : v <= def.target;
    return ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
  };

  const trendIcon = (change, goodDir) => {
    if (Math.abs(change) < 1) return "→";
    return (change > 0 === goodDir > 0) ? "↑" : "↓";
  };

  const severityDot = (sev) => {
    const map = { critical: "bg-rose-500", warning: "bg-amber-500", info: "bg-blue-500" };
    return <span className={`inline-block h-1.5 w-1.5 rounded-full ${map[sev] || map.info} mr-1.5`} />;
  };

  const alertBg = (sev) => {
    const map = { critical: "bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20", warning: "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20", info: "bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20" };
    return map[sev] || map.info;
  };

  const barColor = (pct) => pct > 85 ? "bg-rose-500" : pct > 60 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="intelligence-page intelligence-performance-page">
      <header className="intelligence-page-header">
        <div>
          <h1>Performance Analysis</h1>
          <p>How well are operations performing over time, and why? One-slide executive view.</p>
        </div>
        <button className="btn btn-secondary" onClick={load} type="button">Refresh</button>
      </header>

      {error && <div className="error-message intelligence-error" role="alert">{error}</div>}

      {/* ── KPI Scorecards ── */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {KPI_DEFS.map((def) => {
          const kv = kpiValues[def.key];
          const v = kv?.value ?? 0;
          const change = kv?.change ?? 0;
          const color = kpiColor(v, def);
          return (
            <div key={def.key} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-white/50">{def.label}</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className={`text-lg font-bold tracking-tight ${color}`}>{v}{def.unit}</span>
                <span className={`text-[10px] font-semibold ${Math.abs(change) < 1 ? "text-slate-400" : change > 0 === def.goodDir > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {trendIcon(change, def.goodDir)} {Math.abs(change)}%
                </span>
              </div>
              <p className="mt-0.5 text-[9px] text-slate-400 dark:text-white/30">Target: {def.target}{def.unit}</p>
            </div>
          );
        })}
      </div>

      {/* ── Row: Trends + Department + Resource/Bottleneck ── */}
      <div className="mb-5 grid gap-4 lg:grid-cols-3">

        {/* Trends */}
        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-white/50">Performance Trends</p>
            <select
              value={selectedTrend}
              onChange={(e) => setSelectedTrend(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-white/70"
            >
              {TREND_METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
          {activeTrendData.length > 0 ? (
            <div className="flex items-end gap-[2px]" style={{ height: 80 }}>
              {activeTrendData.map((d, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t"
                  style={{
                    height: `${Math.max(6, d.pct)}%`,
                    background: d.pct > 80 ? "#f43f5e" : d.pct > 55 ? "#f59e0b" : "#10b981",
                    opacity: 0.85,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-slate-300 text-[10px] text-slate-400 dark:border-white/10 dark:text-white/30">
              Not enough data points yet
            </div>
          )}
          <div className="mt-2 flex justify-between text-[9px] text-slate-400 dark:text-white/30">
            <span>Earlier</span><span>Recent</span>
          </div>
        </div>

        {/* Department Performance (top 4) */}
        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-white/50">Department Performance</p>
          <div className="space-y-2">
            {departmentPerformance.slice(0, 4).map((d) => (
              <div key={d.id} className="flex items-center gap-2 text-xs">
                <span className="w-1/3 truncate font-medium text-slate-700 dark:text-white/70">{d.name}</span>
                <div className="flex-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                    <div className={`h-full rounded-full ${barColor(d.efficiency)}`} style={{ width: `${d.efficiency}%` }} />
                  </div>
                </div>
                <span className="w-8 text-right font-bold text-slate-600 dark:text-white/60">{d.efficiency}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Resource Efficiency + Bottleneck */}
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-white/50">Resource Efficiency</p>
            <div className="space-y-1.5">
              {roomUtilization.slice(0, 3).map((r) => (
                <div key={r.label} className="flex items-center gap-2 text-[10px]">
                  <span className="w-24 text-slate-600 dark:text-white/60">{r.label}</span>
                  <div className="flex-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                      <div className={`h-full rounded-full ${barColor(r.pct)}`} style={{ width: `${r.pct}%` }} />
                    </div>
                  </div>
                  <span className="w-10 text-right font-bold text-slate-600 dark:text-white/60">{r.pct}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-white/50">Bottleneck (Avg Time)</p>
            <div className="space-y-1.5">
              {BOTTLENECK_STAGES.map((stage) => {
                const values = admissionByMonth[stage.key] || [];
                const v = values.length ? avg(values.slice(-3)) : 0;
                const maxV = Math.max(1, ...BOTTLENECK_STAGES.map((s) => { const vals = admissionByMonth[s.key] || []; return vals.length ? avg(vals.slice(-3)) : 0; }));
                const pct = (v / maxV) * 100;
                return (
                  <div key={stage.key} className="flex items-center gap-2 text-[10px]">
                    <span className="w-20 text-slate-600 dark:text-white/60">{stage.label}</span>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="w-12 text-right font-bold text-slate-600 dark:text-white/60">{round(v)}min</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row: Forecast + Benchmarking + Operational Alerts ── */}
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        {forecasts.occupancy && (
          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-white/50">Forecast Accuracy</p>
            <div className="mb-2 flex items-center gap-3 text-[10px]">
              <span className="text-slate-500 dark:text-white/50">Models:</span>
              {forecasts.occupancy.models.map((m) => (
                <span
                  key={m.key}
                  className={`rounded-full px-2 py-0.5 font-semibold ${
                    m.key === forecasts.occupancy.bestKey
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                      : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-white/40"
                  }`}
                >
                  {m.key} {m.value}%
                </span>
              ))}
              <span className="ml-auto text-[9px] text-slate-400 dark:text-white/30">
                Best: {forecasts.occupancy.bestKey}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-center">
                <p className="text-[9px] text-slate-400 dark:text-white/30">Actual</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white/90">{forecasts.occupancy.actual}%</p>
              </div>
              {forecasts.admissions && (
                <div className="flex-1 text-center">
                  <p className="text-[9px] text-slate-400 dark:text-white/30">Admissions</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-white/90">{forecasts.admissions.actual}
                    <span className="ml-1 text-[9px] font-normal text-slate-400">
                      ({forecasts.admissions.models.find((m) => m.key === forecasts.admissions.bestKey)?.value ?? "—"})
                    </span>
                  </p>
                </div>
              )}
              {forecasts.waitTime && (
                <div className="flex-1 text-center">
                  <p className="text-[9px] text-slate-400 dark:text-white/30">Wait Time</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-white/90">{forecasts.waitTime.actual}m
                    <span className="ml-1 text-[9px] font-normal text-slate-400">
                      ({forecasts.waitTime.models.find((m) => m.key === forecasts.waitTime.bestKey)?.value ?? "—"}m)
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {benchmarking && (
          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-white/50">Benchmarking</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Admissions", ...benchmarking.admissions, suffix: "", posDown: false },
                { label: "Satisfaction", ...benchmarking.satisfaction, suffix: "/5", posDown: false },
                { label: "Wait Time", ...benchmarking.waitTime, suffix: "m", posDown: true },
                { label: "LOS", ...benchmarking.los, suffix: "d", posDown: true },
              ].map((item) => {
                const good = item.posDown ? item.change <= 0 : item.change >= 0;
                return (
                  <div key={item.label} className="rounded-lg border border-slate-100 bg-slate-50/50 p-2 dark:border-white/[0.06] dark:bg-white/[0.03]">
                    <p className="text-[9px] text-slate-400 dark:text-white/30">{item.label}</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white/90">{item.current}{item.suffix}</p>
                    <p className={`text-[10px] ${good ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {item.change > 0 ? "+" : ""}{item.change}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Operational Alerts */}
        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-white/50">Operational Alerts</p>
          <div className="space-y-2">
            {rootCauses.length > 0 ? rootCauses.slice(0, 4).map((rc, i) => (
              <div key={i} className={`flex items-start gap-2 rounded-lg border p-2 text-[10px] leading-snug ${alertBg(rc.severity)}`}>
                {severityDot(rc.severity)}
                <span className="text-slate-700 dark:text-white/70">{rc.issue}</span>
              </div>
            )) : (
              <p className="py-4 text-center text-[10px] text-slate-400 dark:text-white/30">No active alerts</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Satisfaction Drivers (bottom) ── */}
      {satisfactionDrivers.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-white/50">Satisfaction Drivers</p>
          <div className="flex flex-wrap gap-4">
            {satisfactionDrivers.slice(0, 4).map((d) => (
              <div key={d.field} className="flex items-center gap-2 text-xs">
                <span className="text-slate-600 dark:text-white/60">{d.label}</span>
                <span className={`font-bold ${d.corr > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {d.corr > 0 ? "+" : ""}{d.corr.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!admissionRecords.length && !surgeryRecords.length && !roomRecords.length && !staffRecords.length && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <p className="text-lg font-medium">No performance data available</p>
          <p className="mt-1 text-sm">Records from the individual performance modules will appear here.</p>
        </div>
      )}
    </div>
  );
}
