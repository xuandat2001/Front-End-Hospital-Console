import { useEffect, useState, useMemo } from "react";
import { admissionService } from "../../../services/core-modules/hospitalApi";
import { patientService } from "../../../services/core-modules/patientApi";
import { roomService } from "../../../services/core-modules/roomApi";

const STATUSES = ["PENDING", "ADMITTED", "UNDER_TREATMENT", "TRANSFERRED", "DISCHARGED"];

const emptyForm = {
  patientId: "",
  hospitalId: "",
  roomId: "",
  bedId: "",
  admissionReason: "",
  doctor: "",
  assignedNurseIds: "",
  department: "",
};

export default function AdmissionManagement() {
  const [admissions, setAdmissions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editState, setEditState] = useState(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [detailAdmission, setDetailAdmission] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    const [admRes, patRes, roomRes] = await Promise.allSettled([
      admissionService.getAllAdmissions(),
      patientService.getAllPatients(),
      roomService.getAllRooms(),
    ]);
    if (admRes.status === "fulfilled") setAdmissions(admRes.value.data || []);
    else console.error("loadData – admissions:", admRes.reason);
    if (patRes.status === "fulfilled") setPatients(patRes.value.data || []);
    else console.error("loadData – patients:", patRes.reason);
    if (roomRes.status === "fulfilled") setRooms(roomRes.value.data || []);
    else console.error("loadData – rooms:", roomRes.reason);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const patientMap = useMemo(() => {
    const map = {};
    for (const p of patients) {
      map[p.ellyId || p._id] = p;
    }
    return map;
  }, [patients]);

  const roomMap = useMemo(() => {
    const map = {};
    for (const r of rooms) {
      map[r.ellyId || r._id] = r;
      map[r.roomNumber] = r;
    }
    return map;
  }, [rooms]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return admissions;
    const q = searchQuery.toLowerCase();
    return admissions.filter((a) => {
      const patient = patientMap[a.patientId];
      const name = patient?.fullName?.toLowerCase() || "";
      const pid = a.patientId?.toLowerCase() || "";
      const dept = a.department?.name?.toLowerCase() || a.department?.id?.toLowerCase() || a.ellyDepartmentId?.toLowerCase() || "";
      const doctor = a.doctor?.name?.toLowerCase() || a.doctor?.id?.toLowerCase() || a.assignedDoctorId?.toLowerCase() || "";
      const room = a.roomId?.toLowerCase() || "";
      const status = a.currentStatus?.toLowerCase() || "";
      return name.includes(q) || pid.includes(q) || dept.includes(q) || doctor.includes(q) || room.includes(q) || status.includes(q);
    });
  }, [admissions, searchQuery, patientMap]);

  const closeEdit = () => {
    setEditState(null);
    setFormData({ ...emptyForm });
    setShowForm(false);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await admissionService.updateAdmissionStatus(id, status);
      closeEdit();
      await loadData();
    } catch (error) {
      console.error("handleUpdateStatus error:", error);
      alert(error.message);
    }
  };

  const handleAssign = async (id) => {
    try {
      await admissionService.assignAdmission(id, {
        doctor: formData.doctor,
        assignedNurseIds: formData.assignedNurseIds
          ? formData.assignedNurseIds.split(",").map((id) => id.trim()).filter(Boolean)
          : [],
        department: formData.department,
        roomId: formData.roomId || undefined,
        bedId: formData.bedId || undefined,
      });
      closeEdit();
      await loadData();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDischarge = async (id) => {
    const confirmed = window.confirm("Discharge this patient?");
    if (!confirmed) return;
    try {
      await admissionService.dischargePatient(id);
      closeEdit();
      await loadData();
    } catch (error) {
      alert(error.message);
    }
  };

  const openStatusEdit = (admission) => {
    setEditState({ admission, mode: 'status' });
    setShowForm(true);
  };

  const openAssignEdit = (admission) => {
    setEditState({ admission, mode: 'assign' });
    setFormData({
      roomId: admission.roomId || "",
      bedId: admission.bedId || "",
      doctor: admission.doctor?.id || admission.doctor || "",
      assignedNurseIds: (admission.assignedNurseIds || []).join(", "),
      department: admission.department?.id || admission.ellyDepartmentId || "",
    });
    setShowForm(true);
  };

  const statusColor = (status) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "ADMITTED": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
      case "UNDER_TREATMENT": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      case "TRANSFERRED": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "DISCHARGED": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      default: return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black dark:text-white">Admission Management</h1>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by patient name, ID, department, doctor, room..."
          className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="p-4 text-left font-semibold text-slate-600 dark:text-slate-400">Patient</th>
              <th className="p-4 text-left font-semibold text-slate-600 dark:text-slate-400">Patient ID</th>
              <th className="p-4 text-left font-semibold text-slate-600 dark:text-slate-400">Department</th>
              <th className="p-4 text-left font-semibold text-slate-600 dark:text-slate-400">Room / Bed</th>
              <th className="p-4 text-left font-semibold text-slate-600 dark:text-slate-400">Doctor</th>
              <th className="p-4 text-left font-semibold text-slate-600 dark:text-slate-400">Status</th>
              <th className="p-4 text-left font-semibold text-slate-600 dark:text-slate-400">Admitted</th>
              <th className="p-4 text-left font-semibold text-slate-600 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const patient = patientMap[a.patientId];
              const room = roomMap[a.roomId];
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
                  <td className="p-4 font-medium text-slate-900 dark:text-white">
                    {patient?.fullName || a.patientId}
                  </td>
                  <td className="p-4 font-mono text-xs text-slate-500">{a.patientId}</td>
                  <td className="p-4 text-slate-700 dark:text-slate-300">
                    <span className="text-xs">{deptLabel}</span>
                  </td>
                  <td className="p-4 text-slate-700 dark:text-slate-300">
                    {room?.roomNumber || a.roomId} / {a.bedId || "-"}
                  </td>
                  <td className="p-4 text-slate-700 dark:text-slate-300">
                    {doctorLabel}
                  </td>
                  <td className="p-4">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${statusColor(a.currentStatus)}`}>
                      {a.currentStatus}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-slate-500">
                    {a.admittedAt ? new Date(a.admittedAt).toLocaleDateString() : "-"}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openStatusEdit(a)}
                        className="rounded bg-amber-500 px-2 py-1 text-xs font-medium text-white hover:bg-amber-600"
                      >
                        Status
                      </button>
                      <button
                        onClick={() => openAssignEdit(a)}
                        className="rounded bg-violet-500 px-2 py-1 text-xs font-medium text-white hover:bg-violet-600"
                      >
                        Assign
                      </button>
                      {a.currentStatus !== "DISCHARGED" && (
                        <button
                          onClick={() => handleDischarge(a._id)}
                          className="rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
                        >
                          Discharge
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">No admissions found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detailAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetailAdmission(null)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admission Details</h2>
              <button onClick={() => setDetailAdmission(null)} className="text-2xl text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Patient</p>
                  <p className="text-slate-900 dark:text-white">{patientMap[detailAdmission.patientId]?.fullName || detailAdmission.patientId}</p>
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
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${statusColor(detailAdmission.currentStatus)}`}>
                    {detailAdmission.currentStatus}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Linked Surgery</p>
                  <p className="text-slate-700 dark:text-slate-300">{detailAdmission.surgeryId || "Not linked"}</p>
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
                  <p className="text-slate-700 dark:text-slate-300">{detailAdmission.admissionReason}</p>
                </div>
              )}
              {detailAdmission.assignedNurseIds?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500">Assigned Nurses</p>
                  <p className="text-slate-700 dark:text-slate-300">{detailAdmission.assignedNurseIds.join(", ")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="mb-6 text-xl font-bold">
              {editState.mode === "status" ? "Update Status" : "Update Assignments"}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {editState?.mode === "status" ? null : (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500" htmlFor="admission-room-id">Room ID</label>
                    <input id="admission-room-id" name="roomId" value={formData.roomId} onChange={handleChange} placeholder="Room ID" className="w-full rounded border border-slate-300 bg-white p-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500" htmlFor="admission-bed-id">Bed ID</label>
                    <input id="admission-bed-id" name="bedId" value={formData.bedId} onChange={handleChange} placeholder="Bed ID" className="w-full rounded border border-slate-300 bg-white p-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                  </div>
                </>
              )}
              {editState?.mode === "assign" && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500" htmlFor="admission-department-id">Department ID</label>
                    <input id="admission-department-id" name="department" value={formData.department} onChange={handleChange} placeholder="Department ID" className="w-full rounded border border-slate-300 bg-white p-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500" htmlFor="admission-doctor-id">Doctor ID</label>
                    <input id="admission-doctor-id" name="doctor" value={formData.doctor} onChange={handleChange} placeholder="Doctor ID" className="w-full rounded border border-slate-300 bg-white p-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500" htmlFor="admission-nurse-ids">Nurse IDs (comma-separated)</label>
                    <input id="admission-nurse-ids" name="assignedNurseIds" value={formData.assignedNurseIds} onChange={handleChange} placeholder="NURSE001, NURSE002" className="w-full rounded border border-slate-300 bg-white p-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                  </div>
                </>
              )}
              {editState?.mode === "status" && (
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-500" htmlFor="admission-status">New Status</label>
                  <select id="admission-status" value={editState?.newStatus || editState?.admission?.currentStatus || ""} onChange={(e) => setEditState((prev) => ({ ...prev, newStatus: e.target.value }))} className="w-full rounded border border-slate-300 bg-white p-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeEdit} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                Cancel
              </button>
              {editState?.mode === "status" && (
                <button
                  onClick={() => handleUpdateStatus(editState.admission._id, editState.newStatus || editState.admission.currentStatus)}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
                >
                  Update Status
                </button>
              )}
              {editState?.mode === "assign" && (
                <button
                  onClick={() => handleAssign(editState.admission._id)}
                  className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600"
                >
                  Assign
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
