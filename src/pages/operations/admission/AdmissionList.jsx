import { useEffect, useState, useMemo } from 'react';
import { admissionService } from '../../../services/core-modules/hospitalApi';
import BarChart from '../../../components/graphs/BarChart';
import MiniPieChart from '../../../components/graphs/MiniPieChart';



export default function AdmissionList() {
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [detailAdmission, setDetailAdmission] = useState(null);

  const statuses = ['PENDING', 'ADMITTED', 'UNDER_TREATMENT', 'TRANSFERRED', 'DISCHARGED'];

  const loadAdmissions = async () => {
    try {
      setLoading(true);
      const response = await admissionService.getAllAdmissionsWithPatient();
      setAdmissions(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmissions();
  }, []);

  const handleDischarge = async (id) => {
    const confirmed = window.confirm('Discharge this patient?');
    if (!confirmed) return;
    try {
      await admissionService.dischargePatient(id);
      loadAdmissions();
    } catch (error) {
      alert(error.message);
    }
  };

  const statusColors = {
    PENDING: "#F59E0B",
    ADMITTED: "#3B82F6",
    UNDER_TREATMENT: "#F97316",
    TRANSFERRED: "#8B5CF6",
    DISCHARGED: "#22C55E",
  };

  const statusBreakdown = useMemo(() => {
    const counts = { PENDING: 0, ADMITTED: 0, UNDER_TREATMENT: 0, TRANSFERRED: 0, DISCHARGED: 0 };
    for (const a of admissions) {
      if (counts[a.currentStatus] !== undefined) {
        counts[a.currentStatus]++;
      }
    }
    return counts;
  }, [admissions]);

  const chartData = useMemo(() => {
    const types = ["PENDING", "ADMITTED", "UNDER_TREATMENT", "TRANSFERRED", "DISCHARGED"];
    return {
      data: types.map((t) => statusBreakdown[t]),
      labels: types.map((t) => `${t}: ${statusBreakdown[t]}`),
      slices: types
        .filter((t) => statusBreakdown[t] > 0)
        .map((t) => ({
          label: t,
          value: statusBreakdown[t],
          color: statusColors[t],
        })),
    };
  }, [statusBreakdown]);

  const totalAdmissions = admissions.length;

  const filtered = useMemo(() => {
    let result = admissions;
    if (filter) {
      result = result.filter((a) => a.currentStatus === filter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((a) => {
        const pid = a.patient?.ellyId || a.patientId || "";
        return pid.toLowerCase().includes(q);
      });
    }
    return result;
  }, [admissions, filter, searchQuery]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between text-black">
        <div>
          <h1 className="text-2xl font-bold">Admissions</h1>
          <p className="text-sm text-slate-500">Manage patient admissions and discharges</p>
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="btn btn-primary"
          type="button"
        >
          {showSearch ? "Hide Search" : "Search"}
        </button>
      </div>

      <div className="mb-6 grid grid-cols-5 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{totalAdmissions}</p>
        </div>
        {["PENDING", "ADMITTED", "UNDER_TREATMENT", "DISCHARGED"].map((status) => (
          <div key={status} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {status === "UNDER_TREATMENT" ? "In Treatment" : status.charAt(0) + status.slice(1).toLowerCase()}
            </p>
            <p className="mt-1 text-3xl font-bold" style={{ color: statusColors[status] }}>
              {statusBreakdown[status]}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Admissions by Status</h3>
          <BarChart data={chartData.data} labels={chartData.labels} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Status Distribution</h3>
          <div className="flex items-center justify-center">
            <MiniPieChart
              centerLabel={`${totalAdmissions}\nadmissions`}
              slices={chartData.slices}
            />
          </div>
        </div>
      </div>

      {showSearch && (<>
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Elly ID..."
          className="w-full max-w-sm rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-violet-400"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('')}
          className={`rounded px-3 py-1 text-sm ${!filter ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}
        >
          All
        </button>
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded px-3 py-1 text-sm ${filter === s ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="p-4 text-left">Patient</th>
              <th className="p-4 text-left">Department</th>
              <th className="p-4 text-left">Doctor</th>
              <th className="p-4 text-left">Room / Bed</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Admitted</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              filtered.map((a) => {
                const doctorLabel = a.doctor?.name
                  ? `${a.doctor.name} (${a.doctor.id})`
                  : a.doctor?.id || a.assignedDoctorId || "-";
                const deptLabel = a.department?.name
                  ? `${a.department.name} (${a.department.id})`
                  : a.department?.id || a.ellyDepartmentId || "-";
                return (
                  <tr
                    key={a._id}
                    className="border-t border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    onClick={() => setDetailAdmission(a)}
                  >
                    <td className="p-4">
                      <span className="text-teal-600 hover:text-teal-800 underline text-left font-medium">
                        {a.patient?.fullName || a.patientId}
                      </span>
                    </td>
                    <td className="p-4 text-xs">{deptLabel}</td>
                    <td className="p-4 text-xs">{doctorLabel}</td>
                    <td className="p-4">{a.roomId} / {a.bedId}</td>
                    <td className="p-4">
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        a.currentStatus === 'DISCHARGED' ? 'bg-green-100 text-green-700' :
                        a.currentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        a.currentStatus === 'ADMITTED' ? 'bg-indigo-100 text-indigo-700' :
                        a.currentStatus === 'UNDER_TREATMENT' ? 'bg-red-100 text-red-700' :
                        a.currentStatus === 'TRANSFERRED' ? 'bg-purple-100 text-purple-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {a.currentStatus}
                      </span>
                    </td>
                    <td className="p-4 text-sm">
                      {a.admittedAt ? new Date(a.admittedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      {a.currentStatus !== 'DISCHARGED' && (
                        <button
                          onClick={() => handleDischarge(a._id)}
                          className="rounded bg-green-600 px-3 py-1 text-white text-sm"
                        >
                          Discharge
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      </>)}

      {detailAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetailAdmission(null)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admission Details</h2>
              <button onClick={() => setDetailAdmission(null)} className="text-2xl text-slate-400 hover:text-slate-600">&times;</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Patient</p>
                  <p className="text-slate-900 dark:text-white">{detailAdmission.patient?.fullName || detailAdmission.patientId}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Patient ID</p>
                  <p className="font-mono text-slate-700 dark:text-slate-300">{detailAdmission.patientId}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Department</p>
                  <p className="text-slate-700 dark:text-slate-300">
                    {detailAdmission.department?.name
                      ? `${detailAdmission.department.name} (${detailAdmission.department.id})`
                      : detailAdmission.department?.id || detailAdmission.ellyDepartmentId || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Doctor</p>
                  <p className="text-slate-700 dark:text-slate-300">
                    {detailAdmission.doctor?.name
                      ? `${detailAdmission.doctor.name} (${detailAdmission.doctor.id})`
                      : detailAdmission.doctor?.id || detailAdmission.assignedDoctorId || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Room / Bed</p>
                  <p className="text-slate-700 dark:text-slate-300">{detailAdmission.roomId} / {detailAdmission.bedId || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Status</p>
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                    detailAdmission.currentStatus === 'DISCHARGED' ? 'bg-green-100 text-green-700' :
                    detailAdmission.currentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    detailAdmission.currentStatus === 'ADMITTED' ? 'bg-indigo-100 text-indigo-700' :
                    detailAdmission.currentStatus === 'UNDER_TREATMENT' ? 'bg-red-100 text-red-700' :
                    detailAdmission.currentStatus === 'TRANSFERRED' ? 'bg-purple-100 text-purple-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {detailAdmission.currentStatus}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Admitted At</p>
                  <p className="text-slate-700 dark:text-slate-300">{detailAdmission.admittedAt ? new Date(detailAdmission.admittedAt).toLocaleString() : "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Discharged At</p>
                  <p className="text-slate-700 dark:text-slate-300">{detailAdmission.dischargedAt ? new Date(detailAdmission.dischargedAt).toLocaleString() : "-"}</p>
                </div>
              </div>

              {detailAdmission.admissionReason && (
                <div>
                  <p className="text-xs font-semibold text-slate-500">Admission Reason</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{detailAdmission.admissionReason}</p>
                </div>
              )}

              {detailAdmission.assignedNurseIds?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500">Assigned Nurses</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{detailAdmission.assignedNurseIds.join(", ")}</p>
                </div>
              )}

              {detailAdmission.patient && (
                <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                  <p className="mb-2 text-xs font-semibold text-slate-500">Patient Profile</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {detailAdmission.patient.gender && (
                      <div>
                        <span className="text-slate-500">Gender:</span> <span className="font-medium">{detailAdmission.patient.gender}</span>
                      </div>
                    )}
                    {detailAdmission.patient.dateOfBirth && (
                      <div>
                        <span className="text-slate-500">DOB:</span> <span className="font-medium">{new Date(detailAdmission.patient.dateOfBirth).toLocaleDateString()}</span>
                      </div>
                    )}
                    {detailAdmission.patient.phone && (
                      <div>
                        <span className="text-slate-500">Phone:</span> <span className="font-medium">{detailAdmission.patient.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
