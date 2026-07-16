import { useEffect, useState, useMemo } from "react";
import { surgeryService, admissionService } from "../../../services/core-modules/hospitalApi";
import { patientService } from "../../../services/core-modules/patientApi";

export default function SurgeryAdmissionLinker() {
  const [surgeries, setSurgeries] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurgery, setSelectedSurgery] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [linkingId, setLinkingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [createForm, setCreateForm] = useState({ open: false, surgery: null, submitting: false });
  const [formData, setFormData] = useState({
    patientId: "", hospitalId: "", roomId: "", bedId: "",
    admissionReason: "", department: "", doctor: "",
    assignedNurseIds: "", currentStatus: "PENDING",
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    const [surgRes, admRes, patRes] = await Promise.allSettled([
      surgeryService.getAllSurgeries(),
      admissionService.getAllAdmissionsWithPatient(),
      patientService.getAllPatients(),
    ]);
    if (surgRes.status === "fulfilled") setSurgeries(surgRes.value.data || []);
    if (admRes.status === "fulfilled") setAdmissions(admRes.value?.data || admRes.value || []);
    if (patRes.status === "fulfilled") setPatients(patRes.value.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const patientMap = useMemo(() => {
    const map = {};
    for (const p of patients) map[p.ellyId || p._id] = p;
    return map;
  }, [patients]);

  const unlinkedSurgeries = useMemo(() => {
    let filtered = surgeries.filter((s) => !s.admissionId);
    if (statusFilter !== "ALL") filtered = filtered.filter((s) => s.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((s) => {
        const name = (patientMap[s.patientId]?.fullName || "").toLowerCase();
        const id = (s.surgeryId || s.patientId || "").toLowerCase();
        const proc = (s.procedureName || "").toLowerCase();
        return name.includes(q) || id.includes(q) || proc.includes(q);
      });
    }
    return filtered;
  }, [surgeries, searchQuery, statusFilter, patientMap]);

  const handleLinkAdmission = async (surgeryId, admissionId) => {
    setLinkingId(`${surgeryId}-${admissionId}`);
    try {
      await surgeryService.linkExistingAdmission(surgeryId, admissionId);
      showToast("Admission linked successfully");
      setSelectedSurgery(null);
      loadData();
    } catch (err) {
      showToast(err?.error || err.message || "Failed to link admission");
    } finally {
      setLinkingId(null);
    }
  };

  const handleOpenCreateForm = (e, surgery) => {
    e.stopPropagation();
    setFormData({
      patientId: surgery.patientId || "",
      hospitalId: surgery.hospitalId || "",
      roomId: surgery.operatingRoom || "",
      bedId: "",
      admissionReason: `Admission for surgery: ${surgery.procedureName || surgery.surgeryId}`,
      department: surgery.departmentId || "",
      doctor: surgery.primarySurgeonId || "",
      assignedNurseIds: (surgery.nurseIds || []).join(", "),
      currentStatus: "PENDING",
    });
    setCreateForm({ open: true, surgery, submitting: false });
  };

  const handleFormChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmitCreateForm = async () => {
    setCreateForm((prev) => ({ ...prev, submitting: true }));
    try {
      const payload = {
        patientId: formData.patientId,
        hospitalId: formData.hospitalId,
        roomId: formData.roomId || "PENDING",
        bedId: formData.bedId || "PENDING",
        admissionReason: formData.admissionReason,
        department: formData.department,
        doctor: formData.doctor,
        assignedNurseIds: formData.assignedNurseIds ? formData.assignedNurseIds.split(",").map((s) => s.trim()).filter(Boolean) : [],
        surgeryId: createForm.surgery._id,
      };
      await surgeryService.createAdmissionForSurgery(createForm.surgery._id, payload);
      showToast("Admission created successfully");
      setCreateForm({ open: false, surgery: null, submitting: false });
      loadData();
    } catch (err) {
      showToast(err?.error || err.message || "Failed to create admission");
      setCreateForm((prev) => ({ ...prev, submitting: false }));
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
    <div className="flex h-full gap-4 p-6">
      <div className="flex w-1/2 flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Surgeries Without Admission ({unlinkedSurgeries.length})
          </h2>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient, surgery ID, or procedure..."
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="ALL">All Status</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {unlinkedSurgeries.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              All surgeries have an admission linked
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {unlinkedSurgeries.map((s) => (
                <div
                  key={s._id}
                  className={`px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    selectedSurgery?._id === s._id ? "bg-violet-50 dark:bg-violet-900/10" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedSurgery(selectedSurgery?._id === s._id ? null : s)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {patientMap[s.patientId]?.fullName || s.patientId}
                      </p>
                      <p className="text-xs text-slate-400">
                        {s.surgeryId} &middot; {s.procedureName}
                      </p>
                    </button>
                    <div className="ml-2 flex shrink-0 items-center gap-1">
                      <button
                        onClick={(e) => handleOpenCreateForm(e, s)}
                        className="rounded bg-violet-600 px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-violet-700"
                      >
                        Create
                      </button>
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        s.status === "SCHEDULED" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" :
                        s.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" :
                        s.status === "COMPLETED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                      }`}>
                        {s.status === "IN_PROGRESS" ? "In Progress" : s.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex w-1/2 flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {selectedSurgery ? "Select Admission to Link" : "Select a Surgery First"}
          </h2>
          {selectedSurgery && (
            <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
              Linking for: <strong>{patientMap[selectedSurgery.patientId]?.fullName || selectedSurgery.patientId}</strong>
              &nbsp;(ID: {selectedSurgery.patientId}) &middot; {selectedSurgery.procedureName}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {!selectedSurgery ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Click a surgery on the left to begin
            </div>
          ) : admissions.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              No admissions available
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {admissions.map((adm) => {
                const matchesPatient = adm.patientId === selectedSurgery.patientId;
                const isLinking = linkingId === `${selectedSurgery._id}-${adm._id}`;
                return (
                  <div
                    key={adm._id}
                    className={`flex items-center justify-between px-4 py-3 ${
                      matchesPatient ? "bg-green-50 dark:bg-green-900/10" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {adm.patient?.fullName || adm.patientId}
                        </p>
                        {matchesPatient && (
                          <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            Match
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        ID: {adm.patientId} &middot; {adm.department?.name || "No dept"} &middot; {adm.currentStatus || "PENDING"}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{adm.admissionReason}</p>
                    </div>
                    <button
                      onClick={() => handleLinkAdmission(selectedSurgery._id, adm._id)}
                      disabled={isLinking}
                      className={`ml-3 shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        matchesPatient
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-violet-600 hover:bg-violet-700"
                      }`}
                    >
                      {isLinking ? "Linking..." : "Link"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {createForm.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setCreateForm({ open: false, surgery: null, submitting: false })}
        >
          <div
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Admission</h2>
              <button
                onClick={() => setCreateForm({ open: false, surgery: null, submitting: false })}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 p-3 text-xs text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300">
              Pre-filled from surgery: <strong>{createForm.surgery?.surgeryId}</strong>
              &nbsp;— {createForm.surgery?.procedureName}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Patient ID *</label>
                <input name="patientId" value={formData.patientId} onChange={handleFormChange} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Hospital ID *</label>
                <input name="hospitalId" value={formData.hospitalId} onChange={handleFormChange} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Room ID *</label>
                <input name="roomId" value={formData.roomId} onChange={handleFormChange} placeholder="e.g. operating room" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Bed ID *</label>
                <input name="bedId" value={formData.bedId} onChange={handleFormChange} placeholder="e.g. PENDING" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Admission Reason *</label>
                <textarea name="admissionReason" value={formData.admissionReason} onChange={handleFormChange} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Department ID</label>
                <input name="department" value={formData.department} onChange={handleFormChange} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Doctor ID</label>
                <input name="doctor" value={formData.doctor} onChange={handleFormChange} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Assigned Nurse IDs (comma separated)</label>
                <input name="assignedNurseIds" value={formData.assignedNurseIds} onChange={handleFormChange} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Status</label>
                <select name="currentStatus" value={formData.currentStatus} onChange={handleFormChange} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option value="PENDING">PENDING</option>
                  <option value="ADMITTED">ADMITTED</option>
                  <option value="UNDER_TREATMENT">UNDER TREATMENT</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setCreateForm({ open: false, surgery: null, submitting: false })}
                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCreateForm}
                disabled={createForm.submitting}
                className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createForm.submitting ? "Creating..." : "Create Admission"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-slate-700">
          {toast}
        </div>
      )}
    </div>
  );
}