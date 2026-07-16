import { useEffect, useState, useMemo } from "react";
import { surgeryService } from "../../../services/core-modules/hospitalApi";
import { patientService } from "../../../services/core-modules/patientApi";

const SURGERY_TYPES = ["ELECTIVE", "EMERGENCY", "MINOR", "MAJOR"];
const ANESTHESIA_TYPES = ["GENERAL", "LOCAL", "REGIONAL", "SEDATION", "NONE"];
const STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const OUTCOMES = ["SUCCESSFUL", "COMPLICATIONS", "FAILED", "PENDING"];

const emptyForm = {
  surgeryId: "",
  patientId: "",
  admissionId: "",
  hospitalId: "",
  departmentId: "",
  primarySurgeonId: "",
  assistantSurgeonIds: "",
  nurseIds: "",
  procedureName: "",
  diagnosis: "",
  surgeryType: "ELECTIVE",
  operatingRoom: "",
  recoveryRoom: "",
  scheduledDate: "",
  startTime: "",
  endTime: "",
  anesthesiaType: "GENERAL",
  status: "SCHEDULED",
  outcome: "PENDING",
  complications: "",
  notes: "",
  estimatedCost: 0,
};

export default function SurgeryManagement() {
  const [surgeries, setSurgeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSurgery, setEditingSurgery] = useState(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  const [patients, setPatients] = useState([]);

  const patientMap = useMemo(() => {
    const map = {};
    for (const p of patients) map[p.ellyId || p._id] = p;
    return map;
  }, [patients]);

  const loadSurgeries = async () => {
    try {
      setLoading(true);
      const [surgRes, patRes] = await Promise.allSettled([
        surgeryService.getAllSurgeries(),
        patientService.getAllPatients(),
      ]);
      if (surgRes.status === "fulfilled") setSurgeries(surgRes.value.data || []);
      if (patRes.status === "fulfilled") setPatients(patRes.value.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSurgeries(); }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetForm = () => {
    setEditingSurgery(null);
    setFormData({ ...emptyForm });
  };

  const handleEdit = (s) => {
    setEditingSurgery(s);
    setFormData({
      surgeryId: s.surgeryId || "",
      patientId: s.patientId || "",
      admissionId: s.admissionId || "",
      hospitalId: s.hospitalId || "",
      departmentId: s.departmentId || "",
      primarySurgeonId: s.primarySurgeonId || "",
      assistantSurgeonIds: (s.assistantSurgeonIds || []).join(", "),
      nurseIds: (s.nurseIds || []).join(", "),
      procedureName: s.procedureName || "",
      diagnosis: s.diagnosis || "",
      surgeryType: s.surgeryType || "ELECTIVE",
      operatingRoom: s.operatingRoom || "",
      recoveryRoom: s.recoveryRoom || "",
      scheduledDate: s.scheduledDate ? new Date(s.scheduledDate).toISOString().split("T")[0] : "",
      startTime: s.startTime ? new Date(s.startTime).toISOString().slice(0, 16) : "",
      endTime: s.endTime ? new Date(s.endTime).toISOString().slice(0, 16) : "",
      anesthesiaType: s.anesthesiaType || "GENERAL",
      status: s.status || "SCHEDULED",
      outcome: s.outcome || "PENDING",
      complications: s.complications || "",
      notes: s.notes || "",
      estimatedCost: s.estimatedCost || 0,
    });
    setShowForm(true);
  };

  const buildPayload = () => ({
    ...formData,
    assistantSurgeonIds: formData.assistantSurgeonIds
      ? formData.assistantSurgeonIds.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    nurseIds: formData.nurseIds
      ? formData.nurseIds.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    scheduledDate: formData.scheduledDate
      ? new Date(formData.scheduledDate).toISOString()
      : undefined,
    startTime: formData.startTime
      ? new Date(formData.startTime).toISOString()
      : undefined,
    endTime: formData.endTime
      ? new Date(formData.endTime).toISOString()
      : undefined,
    estimatedCost: Number(formData.estimatedCost),
  });

  const handleCreate = async () => {
    try {
      await surgeryService.createSurgery(buildPayload());
      setShowForm(false);
      resetForm();
      loadSurgeries();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleUpdate = async () => {
    try {
      await surgeryService.updateSurgery(editingSurgery._id, buildPayload());
      setShowForm(false);
      resetForm();
      loadSurgeries();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this surgery record?")) return;
    try {
      await surgeryService.deleteSurgery(id);
      loadSurgeries();
    } catch (error) {
      alert(error.message);
    }
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Surgery Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {surgeries.length} surgery record{surgeries.length !== 1 ? "s" : ""} on file
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700"
        >
          + Add Surgery
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="p-3 text-left font-semibold">Surgery ID</th>
              <th className="p-3 text-left font-semibold">Patient</th>
              <th className="p-3 text-left font-semibold">Procedure</th>
              <th className="p-3 text-left font-semibold">Type</th>
              <th className="p-3 text-left font-semibold">Surgeon</th>
              <th className="p-3 text-left font-semibold">Op. Room</th>
              <th className="p-3 text-left font-semibold">Status</th>
              <th className="p-3 text-left font-semibold">Outcome</th>
              <th className="p-3 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {surgeries.map((s) => (
              <tr key={s._id} className="border-t border-slate-200 dark:border-slate-700">
                <td className="p-3 font-mono text-xs text-slate-600 dark:text-slate-400">{s.surgeryId}</td>
                <td className="p-3 font-medium text-slate-900 dark:text-white">
                  {patientMap[s.patientId]?.fullName || s.patientId}
                </td>
                <td className="p-3 max-w-[180px] text-slate-700 dark:text-slate-300">
                  <div className="truncate">{s.procedureName}</div>
                </td>
                <td className="p-3 text-slate-700 dark:text-slate-300">{s.surgeryType}</td>
                <td className="p-3 text-slate-700 dark:text-slate-300">{s.primarySurgeonId}</td>
                <td className="p-3 text-slate-700 dark:text-slate-300">{s.operatingRoom || "-"}</td>
                <td className="p-3">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                    s.status === "COMPLETED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                    s.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" :
                    s.status === "CANCELLED" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" :
                    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                  }`}>{s.status}</span>
                </td>
                <td className="p-3">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                    s.outcome === "SUCCESSFUL" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                    s.outcome === "COMPLICATIONS" || s.outcome === "FAILED" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" :
                    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}>{s.outcome}</span>
                </td>
                <td className="p-3">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handleEdit(s)}
                      className="rounded bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(s._id)}
                      className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {surgeries.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">No surgery records</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">
              {editingSurgery ? "Edit Surgery" : "Create Surgery"}
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Surgery ID</span>
                <input name="surgeryId" value={formData.surgeryId} onChange={handleChange} placeholder="Surgery ID" className="rounded border border-slate-600 bg-slate-800 p-3 text-white" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Patient ID</span>
                <input name="patientId" value={formData.patientId} onChange={handleChange} placeholder="Patient ID" className="rounded border border-slate-600 bg-slate-800 p-3 text-white" />
                {formData.patientId && patientMap[formData.patientId] && (
                  <span className="text-xs text-slate-400">{patientMap[formData.patientId].fullName}</span>
                )}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Admission ID</span>
                <input name="admissionId" value={formData.admissionId} onChange={handleChange} placeholder="Admission ID" className="rounded border border-slate-600 bg-slate-800 p-3 text-white" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hospital ID</span>
                <input name="hospitalId" value={formData.hospitalId} onChange={handleChange} placeholder="Hospital ID" className="rounded border border-slate-600 bg-slate-800 p-3 text-white" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Department ID</span>
                <input name="departmentId" value={formData.departmentId} onChange={handleChange} placeholder="Department ID" className="rounded border border-slate-600 bg-slate-800 p-3 text-white" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Primary Surgeon</span>
                <input name="primarySurgeonId" value={formData.primarySurgeonId} onChange={handleChange} placeholder="Primary Surgeon ID" className="rounded border border-slate-600 bg-slate-800 p-3 text-white" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assistant Surgeons</span>
                <input name="assistantSurgeonIds" value={formData.assistantSurgeonIds} onChange={handleChange} placeholder="Comma-separated IDs" className="rounded border border-slate-600 bg-slate-800 p-3 text-white" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nurses</span>
                <input name="nurseIds" value={formData.nurseIds} onChange={handleChange} placeholder="Comma-separated IDs" className="rounded border border-slate-600 bg-slate-800 p-3 text-white" />
              </label>
              <label className="flex flex-col gap-1 col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Procedure Name</span>
                <input name="procedureName" value={formData.procedureName} onChange={handleChange} placeholder="Procedure Name" className="rounded border border-slate-600 bg-slate-800 p-3 text-white" />
              </label>
              <label className="flex flex-col gap-1 col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Diagnosis</span>
                <input name="diagnosis" value={formData.diagnosis} onChange={handleChange} placeholder="Diagnosis" className="rounded border border-slate-600 bg-slate-800 p-3 text-white" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Surgery Type</span>
                <select name="surgeryType" value={formData.surgeryType} onChange={handleChange} className="rounded border border-slate-600 bg-slate-800 p-3 text-white">
                  {SURGERY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Anesthesia</span>
                <select name="anesthesiaType" value={formData.anesthesiaType} onChange={handleChange} className="rounded border border-slate-600 bg-slate-800 p-3 text-white">
                  {ANESTHESIA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Operating Room</span>
                <input name="operatingRoom" value={formData.operatingRoom} onChange={handleChange} placeholder="Operating Room" className="rounded border border-slate-600 bg-slate-800 p-3 text-white" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recovery Room</span>
                <input name="recoveryRoom" value={formData.recoveryRoom} onChange={handleChange} placeholder="Recovery Room" className="rounded border border-slate-600 bg-slate-800 p-3 text-white" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Scheduled Date</span>
                <input name="scheduledDate" type="date" value={formData.scheduledDate} onChange={handleChange} className="rounded border border-slate-600 bg-slate-800 p-3 text-white" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Start Time</span>
                <input name="startTime" type="datetime-local" value={formData.startTime} onChange={handleChange} className="rounded border border-slate-600 bg-slate-800 p-3 text-white" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">End Time</span>
                <input name="endTime" type="datetime-local" value={formData.endTime} onChange={handleChange} className="rounded border border-slate-600 bg-slate-800 p-3 text-white" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</span>
                <select name="status" value={formData.status} onChange={handleChange} className="rounded border border-slate-600 bg-slate-800 p-3 text-white">
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Outcome</span>
                <select name="outcome" value={formData.outcome} onChange={handleChange} className="rounded border border-slate-600 bg-slate-800 p-3 text-white">
                  {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Estimated Cost</span>
                <input name="estimatedCost" type="number" value={formData.estimatedCost} onChange={handleChange} placeholder="Estimated Cost" className="rounded border border-slate-600 bg-slate-800 p-3 text-white" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Complications</span>
                <input name="complications" value={formData.complications} onChange={handleChange} placeholder="Complications" className="rounded border border-slate-600 bg-slate-800 p-3 text-white" />
              </label>
              <label className="flex flex-col gap-1 col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</span>
                <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Notes" rows={3} className="rounded border border-slate-600 bg-slate-800 p-3 text-white" />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="rounded border border-slate-600 px-4 py-2 text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={editingSurgery ? handleUpdate : handleCreate} className="rounded bg-teal-600 px-4 py-2 text-white hover:bg-teal-700">
                {editingSurgery ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
