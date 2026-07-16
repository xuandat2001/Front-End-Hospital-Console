import { useCallback, useEffect, useMemo, useState } from "react";
import { intelligenceService } from "../../../services/intelligence/intelligenceApi";
import BarChart from "../../../components/graphs/BarChart";
import MiniPieChart from "../../../components/graphs/MiniPieChart";
import usePatientSearchStore from "../../../store/usePatientSearchStore";
import useSessionStore from "../../../store/useSessionStore";
import PatientRecordView from "./record/PatientRecordView";

const FILTER_OPTIONS = ["ALL", "INPATIENT", "OUTPATIENT"];
const LIVE_REFRESH_MS = 15000;
const FALLBACK_STATUS_COLOR = "#9CA3AF";

function toTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

const EMPTY_SNAPSHOT = {
  generatedAt: null,
  totals: { total: 0, active: 0, inactive: 0, discharged: 0 },
  census: { inPatients: 0, outPatients: 0, activeInHospital: 0 },
  statusDistribution: { data: [], labels: [], slices: [] },
  acuityHeatmap: { locations: [], maxAcuity: 0, maxWorkload: 0 },
  rows: [],
};

function resolveRowLocation(row) {
  return (
    row.dept?.name ||
    row.admission?.department?.name ||
    row.deptId ||
    row.room?.roomNumber ||
    row.admission?.roomId ||
    "Unassigned"
  );
}

export default function PatientDashboard() {
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [listSearchQuery, setListSearchQuery] = useState("");
  const [showPatientsModal, setShowPatientsModal] = useState(false);
  const [selectedPatientRow, setSelectedPatientRow] = useState(null);
  const [selectedHeatmapSpot, setSelectedHeatmapSpot] = useState(null);

  const activeEllyId = usePatientSearchStore((state) => state.activeEllyId);
  const clearActiveEllyId = usePatientSearchStore((state) => state.clearActiveEllyId);
  const workspace = useSessionStore((state) => state.workspace);

  const loadSnapshot = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await intelligenceService.getPatientCensus();
      setSnapshot(response.data || EMPTY_SNAPSHOT);
      setLastUpdatedAt(new Date());
      setError("");
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.message || "Failed to load patient intelligence snapshot.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
    const timer = setInterval(() => loadSnapshot({ silent: true }), LIVE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadSnapshot]);

  const { totals, census, statusDistribution, acuityHeatmap, rows } = snapshot;

  const filteredRows = useMemo(() => {
    let result = rows;
    if (filterStatus === "INPATIENT") {
      result = result.filter((r) => r.isInPatient);
    } else if (filterStatus === "OUTPATIENT") {
      result = result.filter((r) => !r.isInPatient);
    }
    if (listSearchQuery.trim()) {
      const q = listSearchQuery.trim().toLowerCase();
      result = result.filter((r) => (r.patientId?.toLowerCase() || "").includes(q));
    }
    return result;
  }, [rows, filterStatus, listSearchQuery]);

  if (activeEllyId) {
    return (
      <div className="h-full overflow-hidden">
        <PatientRecordView
          ellyId={activeEllyId}
          workspace={workspace}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="relative px-6 pb-6 pt-4">
      <div
        className="sticky top-3 z-20 mb-6 rounded-2xl border border-white/60 bg-white/55 px-5 py-4 shadow-lg shadow-slate-900/8 ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45 dark:shadow-black/30 dark:ring-white/5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-950 dark:text-white sm:text-2xl">
              Patient Dashboard
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {totals.total} total — {census.inPatients} inpatient, {census.outPatients} outpatient, {totals.discharged} discharged
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Live ADT/EMR snapshot {lastUpdatedAt ? `updated ${toTime(lastUpdatedAt)}` : "initializing"}
              {refreshing && " · refreshing…"}
            </p>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPatientsModal(true)}
              className="rounded-xl border border-indigo-500/40 bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-indigo-400/30 dark:bg-indigo-500 dark:shadow-indigo-900/40 dark:hover:bg-indigo-600"
            >
              All Patients
            </button>
            <button
              type="button"
              onClick={() => loadSnapshot({ silent: true })}
              className="rounded-xl border border-violet-500/40 bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-violet-600/25 hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-violet-400/30 dark:shadow-violet-900/40"
            >
              {refreshing ? "Refreshing…" : "Refresh now"}
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="grid grid-cols-2 gap-2 xl:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total</p>
            <p className="mt-0.5 text-2xl font-bold text-slate-900 dark:text-white">{totals.total}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">In-Patients</p>
            <p className="mt-0.5 text-2xl font-bold text-blue-500">{census.inPatients}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Out-Patients</p>
            <p className="mt-0.5 text-2xl font-bold text-emerald-500">{census.outPatients}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">In Hospital</p>
            <p className="mt-0.5 text-2xl font-bold text-purple-500">{census.activeInHospital}</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 xl:col-span-6">
          <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Status Distribution (Bar)</h3>
          <BarChart data={statusDistribution.data} labels={statusDistribution.labels} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 xl:col-span-3">
          <h3 className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Status (Donut)</h3>
          <MiniPieChart centerLabel={`${totals.total}\npatients`} slices={statusDistribution.slices} compact />
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Department load</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">Click a department for details</span>
        </div>
        {acuityHeatmap.locations.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No active patients to map.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {acuityHeatmap.locations.map((spot) => {
              const maxWorkload = acuityHeatmap.maxWorkload || acuityHeatmap.maxAcuity || 1;
              const loadPct = Math.round((spot.workloadScore / maxWorkload) * 100);
              const riskColor = spot.riskColor || "#64748B";

              return (
                <button
                  key={spot.location}
                  type="button"
                  onClick={() => setSelectedHeatmapSpot(spot)}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:bg-slate-800"
                  style={{ borderLeftWidth: "3px", borderLeftColor: riskColor }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {spot.location}
                    </p>
                    <span className="shrink-0 text-xs font-bold text-slate-700 dark:text-slate-200">
                      {spot.patientCount}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${loadPct}%`, backgroundColor: riskColor }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedHeatmapSpot && (
        <HeatmapDetailModal
          spot={selectedHeatmapSpot}
          maxWorkload={acuityHeatmap.maxWorkload || acuityHeatmap.maxAcuity || 1}
          patients={rows.filter((r) => resolveRowLocation(r) === selectedHeatmapSpot.location)}
          onClose={() => setSelectedHeatmapSpot(null)}
          onOpenPatient={(row) => {
            setSelectedHeatmapSpot(null);
            setSelectedPatientRow(row);
          }}
        />
      )}

      {showPatientsModal && (
        <PatientsListModal
          rows={filteredRows}
          filterStatus={filterStatus}
          onFilterChange={setFilterStatus}
          listSearchQuery={listSearchQuery}
          onListSearchChange={setListSearchQuery}
          onClose={() => setShowPatientsModal(false)}
          onOpenPatient={(row) => {
            setShowPatientsModal(false);
            setSelectedPatientRow(row);
          }}
        />
      )}

      {selectedPatientRow && (
        <PatientProfileModal row={selectedPatientRow} onClose={() => setSelectedPatientRow(null)} />
      )}
    </div>
  );
}

function HeatmapDetailModal({ spot, maxWorkload, patients, onClose, onOpenPatient }) {
  const riskColor = spot.riskColor || "#64748B";
  const loadPct = Math.round(((spot.workloadScore || 0) / maxWorkload) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div
          className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700"
          style={{ borderLeftWidth: "4px", borderLeftColor: riskColor }}
        >
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{spot.location}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {spot.patientCount} active patient{spot.patientCount !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-md px-2.5 py-1 text-xs font-semibold"
              style={{
                backgroundColor: `${riskColor}18`,
                color: riskColor,
                border: `1px solid ${riskColor}40`,
              }}
            >
              {spot.riskLabel || "Load"}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Workload {spot.workloadScore ?? spot.acuityTotal} · Avg urgency {spot.averageAcuity ?? "—"}/5
            </span>
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Relative load</span>
              <span>{loadPct}% of busiest area</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-2 rounded-full"
                style={{ width: `${loadPct}%`, backgroundColor: riskColor }}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Status mix</p>
            <div className="flex flex-wrap gap-1.5">
              {spot.byStatus?.map((statusEntry) => (
                <span
                  key={statusEntry.status}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: statusEntry.color }}
                    aria-hidden="true"
                  />
                  {statusEntry.label}: {statusEntry.count}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Patients here</p>
            {patients.length === 0 ? (
              <p className="text-sm text-slate-500">No patient rows matched this location.</p>
            ) : (
              <ul className="space-y-2">
                {patients.map((row) => (
                  <li
                    key={row.patientId}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {row.patient?.fullName || row.patientId}
                      </p>
                      <p className="text-xs text-slate-500">{row.patientId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          backgroundColor: `${row.statusColor || "#9CA3AF"}20`,
                          color: row.statusColor || "#9CA3AF",
                        }}
                      >
                        {row.statusLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenPatient(row)}
                        className="text-xs font-semibold text-violet-600 hover:text-violet-500 dark:text-violet-300"
                      >
                        Profile
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientsListModal({
  rows,
  filterStatus,
  onFilterChange,
  listSearchQuery,
  onListSearchChange,
  onClose,
  onOpenPatient,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="w-full max-w-6xl rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">All Patients</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="flex gap-2">
              {FILTER_OPTIONS.map((f) => (
                <button
                  key={f}
                  onClick={() => onFilterChange(f)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    filterStatus === f
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {f === "ALL" ? "All Patients" : f === "INPATIENT" ? "Inpatient" : "Outpatient"}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={listSearchQuery}
              onChange={(e) => onListSearchChange(e.target.value)}
              placeholder="Search by EllyID..."
              className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-violet-400"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="p-4 text-left font-semibold">Patient</th>
                  <th className="p-4 text-left font-semibold">Patient ID</th>
                  <th className="p-4 text-left font-semibold">Type</th>
                  <th className="p-4 text-left font-semibold">Room</th>
                  <th className="p-4 text-left font-semibold">Department</th>
                  <th className="p-4 text-left font-semibold">Doctor</th>
                  <th className="p-4 text-left font-semibold">Nurse</th>
                  <th className="p-4 text-left font-semibold">Status</th>
                  <th className="p-4 text-left font-semibold">Profile</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.patientId} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="p-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {r.patient.fullName || "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {r.patient.gender || ""}
                        {r.patient.dateOfBirth
                          ? ` · ${new Date(r.patient.dateOfBirth).toLocaleDateString()}`
                          : ""}
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-500">{r.patientId}</td>
                    <td className="p-4">
                      {r.isInPatient ? (
                        <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          Inpatient
                        </span>
                      ) : (
                        <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          Outpatient
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">
                      {r.room?.roomNumber || r.admission?.roomId || "-"}
                    </td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">
                      <div>{r.dept?.name || r.admission?.department?.name || r.deptId || "-"}</div>
                    </td>
                    <td className="p-4">
                      {r.doctor ? (
                        <div className="font-medium text-slate-900 dark:text-white">
                          {r.doctor.fullName || r.doctor.name}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {r.assignedNurse ? (
                        <div className="font-medium text-slate-900 dark:text-white">{r.assignedNurse.fullName}</div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className="inline-block rounded px-2 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor: `${r.statusColor || FALLBACK_STATUS_COLOR}20`,
                          color: r.statusColor || FALLBACK_STATUS_COLOR,
                        }}
                      >
                        {r.statusLabel}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => onOpenPatient(r)}
                        className="rounded-md border border-violet-500 px-3 py-1 text-xs font-semibold text-violet-600 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-900/30"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      No patients found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientProfileModal({ row, onClose }) {
  const patient = row.patient || {};
  const admission = row.admission || {};
  const surgery = row.surgery || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Patient Profile: {patient.fullName || row.patientId}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              EllyID {row.patientId} • {row.statusLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="max-h-[72vh] space-y-5 overflow-y-auto p-5">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoItem label="Full Name" value={patient.fullName} />
            <InfoItem label="Gender" value={patient.gender} />
            <InfoItem label="Date of Birth" value={toTime(patient.dateOfBirth)} />
            <InfoItem label="Phone" value={patient.phone} />
            <InfoItem label="Email" value={patient.email} />
            <InfoItem label="Current Status" value={row.statusLabel} />
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoItem label="Address" value={patient.address?.line1} />
            <InfoItem label="City / State" value={[patient.address?.city, patient.address?.state].filter(Boolean).join(", ")} />
            <InfoItem label="Country" value={patient.address?.country} />
            <InfoItem label="Postal Code" value={patient.address?.postalCode} />
            <InfoItem label="Emergency Contact" value={patient.emergencyContact?.name} />
            <InfoItem label="Emergency Contact Phone" value={patient.emergencyContact?.phone} />
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Registered Facilities</h3>
            <div className="flex flex-wrap gap-2">
              {patient.registeredHospitals?.length ? (
                patient.registeredHospitals.map((item, idx) => (
                  <span
                    key={`${row.patientId}-hospital-${idx}`}
                    className="rounded-full bg-teal-900/50 px-3 py-1 text-xs font-medium text-teal-300"
                  >
                    {typeof item === "object" ? item.hospitalName || item.hospitalId : item}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">No registered facilities</span>
              )}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoItem label="Admission ID" value={admission._id || admission.admissionId} />
            <InfoItem label="Patient Type" value={row.isInPatient ? "Inpatient" : "Outpatient"} />
            <InfoItem label="Admission Status" value={admission.currentStatus} />
            <InfoItem label="Admitted At" value={toTime(admission.admittedAt)} />
            <InfoItem label="Discharged At" value={toTime(admission.dischargedAt)} />
            <InfoItem label="Department" value={admission.department?.name || admission.department?.id || row.dept?.name || row.deptId} />
            <InfoItem label="Room / Bed" value={[row.room?.roomNumber || admission.roomId, admission.bedId].filter(Boolean).join(" / ")} />
            <InfoItem label="Assigned Doctor" value={admission.doctor?.name || row.doctor?.fullName || admission.doctor?.id || admission.assignedDoctorId} />
            <InfoItem
              label="Assigned Nurses"
              value={admission.assignedNurseIds?.length ? admission.assignedNurseIds.join(", ") : row.assignedNurse?.fullName}
            />
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoItem label="Surgery ID" value={surgery.surgeryId || surgery._id} />
            <InfoItem label="Surgery Status" value={surgery.status} />
            <InfoItem label="Procedure" value={surgery.procedureName} />
            <InfoItem label="Surgery Type" value={surgery.surgeryType} />
            <InfoItem label="Scheduled Date" value={toTime(surgery.scheduledDate)} />
            <InfoItem label="Operating Room" value={surgery.operatingRoom} />
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Admission History</h3>
            <div className="space-y-2">
              {row.admissionsHistory?.length ? (
                row.admissionsHistory.map((item) => (
                  <div key={item._id} className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {item.currentStatus} • {item.department?.name || item.department?.id || item.ellyDepartmentId || "-"}
                    </p>
                    <p className="text-slate-500">Admitted: {toTime(item.admittedAt)}</p>
                    <p className="text-slate-500">Room/Bed: {item.roomId || "-"} / {item.bedId || "-"}</p>
                    <p className="text-slate-500">Doctor: {item.doctor?.name || item.doctor?.id || item.assignedDoctorId || "-"}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No admissions on file.</p>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Surgery History</h3>
            <div className="space-y-2">
              {row.surgeriesHistory?.length ? (
                row.surgeriesHistory.map((item) => (
                  <div key={item._id} className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {item.procedureName || item.surgeryId || "Surgery"}
                    </p>
                    <p className="text-slate-500">Status: {item.status || "-"}</p>
                    <p className="text-slate-500">Type: {item.surgeryType || "-"}</p>
                    <p className="text-slate-500">Scheduled: {toTime(item.scheduledDate)}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No surgeries on file.</p>
              )}
            </div>
          </section>

          <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300">
              Raw Patient Payload
            </summary>
            <pre className="mt-2 overflow-x-auto text-xs text-slate-600 dark:text-slate-300">
              {JSON.stringify(patient, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{value || "N/A"}</p>
    </div>
  );
}
