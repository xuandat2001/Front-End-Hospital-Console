import { useCallback, useEffect, useMemo, useState } from 'react';
import { admissionPerformanceService } from '../../services/performance/admissionPerformanceApi';
import MiniPieChart from '../../components/graphs/MiniPieChart';
import BarChart from '../../components/graphs/BarChart';
import { extractCollection, finiteNumber } from '../../utils/performanceDataContracts';

const TYPE_COLORS = {
  EMERGENCY: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  TRANSFER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const OUTCOME_COLORS = {
  RECOVERED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  IMPROVED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  TRANSFERRED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  DECEASED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  ADMITTED: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  UNDER_TREATMENT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

export default function AdmissionPerformance() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, statRes] = await Promise.all([
        admissionPerformanceService.getAll(),
        admissionPerformanceService.getStats(),
      ]);
      setRecords(extractCollection(recRes));
      setStats(statRes.data || null);
    } catch (err) {
      console.error(err);
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

  const filtered = filter
    ? records.filter((r) =>
        [r.performanceId, r.admissionId, r.patientId, r.patientName, r.admissionType, r.dischargeOutcome]
          .some((v) => String(v || '').toLowerCase().includes(filter.toLowerCase()))
      )
    : records;

  const s = stats?.summary;
  const avgSat = s?.avgSatisfaction != null ? finiteNumber(s.avgSatisfaction).toFixed(1) : '-';

  const typeSlices = useMemo(() => {
    return extractCollection(stats?.byAdmissionType).map((t) => ({
      label: t._id,
      value: finiteNumber(t.count),
      color: TYPE_COLORS[t._id]?.match(/#[0-9a-fA-F]+/)?.[0] || '#6B7280',
    }));
  }, [stats]);

  const avgByType = useMemo(() => {
    const groups = {};
    records.forEach((r) => {
      const t = r.admissionType || 'OTHER';
      if (!groups[t]) groups[t] = { count: 0, processing: 0, bed: 0, wait: 0, stay: 0, satisfaction: 0 };
      groups[t].count++;
      groups[t].processing += finiteNumber(r.admissionProcessingTime);
      groups[t].bed += finiteNumber(r.bedAssignmentTime);
      groups[t].wait += finiteNumber(r.waitTime);
      groups[t].stay += finiteNumber(r.lengthOfStay);
      groups[t].satisfaction += finiteNumber(r.patientSatisfaction);
    });
    const labels = Object.keys(groups);
    const avg = (field) => labels.map((t) => Math.round(groups[t][field] / groups[t].count));
    return {
      labels,
      processing: avg('processing'),
      bed: avg('bed'),
      wait: avg('wait'),
      stay: avg('stay'),
      satisfaction: avg('satisfaction'),
    };
  }, [records]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold dark:text-white">Admission Performance</h1>
          <p className="text-xs text-slate-500">{records.length} completed admissions recorded</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="btn btn-primary"
            type="button"
          >
            {showSearch ? "Hide Search" : "Search"}
          </button>
          <button
            onClick={load}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>
      </div>

      {s && (
        <div className="grid grid-cols-7 gap-3">
          <MetricCard label="Total Cases" value={s.total} />
          <MetricCard label="Average Processing Time" value={`${Math.round(finiteNumber(s.avgProcessingTime))} minutes`} />
          <MetricCard label="Average Bed Assignment" value={`${Math.round(finiteNumber(s.avgBedAssignmentTime))} minutes`} />
          <MetricCard label="Average Wait Time" value={`${Math.round(finiteNumber(s.avgWaitTime))} minutes`} />
          <MetricCard label="Average Length of Stay" value={`${finiteNumber(s.avgLengthOfStay).toFixed(1)} days`} />
          <MetricCard label="Average Satisfaction" value={avgSat} />
          <MetricCard label="Readmissions" value={finiteNumber(s.readmissions)} />
        </div>
      )}

      {records.length > 0 && (<>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Admission Type Distribution</p>
            <MiniPieChart slices={typeSlices} centerLabel={`${records.length}\nAdmissions`} />
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Avg Processing Time by Admission Type</p>
            <BarChart data={avgByType.processing} labels={avgByType.labels} compact />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Avg Bed Assignment Time by Admission Type</p>
            <BarChart data={avgByType.bed} labels={avgByType.labels} compact />
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Avg Wait Time by Admission Type</p>
            <BarChart data={avgByType.wait} labels={avgByType.labels} compact />
          </div>
        </div>
      </>)}

      {showSearch && (<>
      <div className="flex items-center gap-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search by ID, patient, type, outcome..."
          className="h-8 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        {stats?.byAdmissionType && (
          <div className="flex gap-1.5">
            {stats.byAdmissionType.map((t) => (
              <span key={t._id} className={`rounded-md px-2 py-1 text-[10px] font-medium ${TYPE_COLORS[t._id] || ''}`}>
                {t._id} {t.count}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[10px] font-semibold uppercase text-slate-500 dark:border-slate-700">
              <th className="py-2 pr-3">Performance ID</th>
              <th className="py-2 pr-3">Admission</th>
              <th className="py-2 pr-3">Patient</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Processing</th>
              <th className="py-2 pr-3">Bed</th>
              <th className="py-2 pr-3">Wait</th>
              <th className="py-2 pr-3">Stay</th>
              <th className="py-2 pr-3">Outcome</th>
              <th className="py-2 pr-3">Satisfaction</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r._id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="py-2.5 pr-3 text-xs font-medium dark:text-white">{r.performanceId}</td>
                <td className="py-2.5 pr-3 text-xs text-slate-500">{r.admissionId}</td>
                <td className="py-2.5 pr-3">
                  <div className="text-xs font-medium dark:text-white">{r.patientName || 'Unknown'}</div>
                  <div className="text-[10px] text-slate-400">{r.patientId}</div>
                </td>
                <td className="py-2.5 pr-3">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[r.admissionType] || ''}`}>
                    {r.admissionType}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-xs">{r.admissionProcessingTime} min</td>
                <td className="py-2.5 pr-3 text-xs">{r.bedAssignmentTime} min</td>
                <td className="py-2.5 pr-3 text-xs">{r.waitTime} min</td>
                <td className="py-2.5 pr-3 text-xs">{r.lengthOfStay} days</td>
                <td className="py-2.5 pr-3">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${OUTCOME_COLORS[r.dischargeOutcome] || ''}`}>
                    {r.dischargeOutcome}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-xs">
                  <span className="font-semibold dark:text-white">{r.patientSatisfaction}</span>
                  <span className="text-slate-400">/5</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-400">No performance records found</p>
        )}
      </div>
      </>)}
      {!loading && records.length === 0 && !showSearch && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900">
          No admission performance records found.
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="text-sm font-bold dark:text-white">{value}</p>
    </div>
  );
}
