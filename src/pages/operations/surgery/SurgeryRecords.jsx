import { useEffect, useState, useMemo } from "react";
import { surgeryService, admissionService } from "../../../services/core-modules/hospitalApi";
import { patientService } from "../../../services/core-modules/patientApi";
import BarChart from "../../../components/graphs/BarChart";
import MiniPieChart from "../../../components/graphs/MiniPieChart";

const STATUS_COLORS = {
  SCHEDULED: "#F59E0B",
  IN_PROGRESS: "#3B82F6",
  COMPLETED: "#22C55E",
  CANCELLED: "#EF4444",
};

const TYPE_COLORS = {
  ELECTIVE: "#8B5CF6",
  EMERGENCY: "#EF4444",
  MINOR: "#22C55E",
  MAJOR: "#F97316",
};

export default function SurgeryRecords({ onNavigateToFunction }) {
  const [surgeries, setSurgeries] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [loadingAdmission, setLoadingAdmission] = useState(false);
  const [creatingId, setCreatingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [linkModal, setLinkModal] = useState({ open: false, surgery: null });
  const [admissions, setAdmissions] = useState([]);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkingId, setLinkingId] = useState(null);
  const [createForm, setCreateForm] = useState({ open: false, surgery: null, submitting: false });
  const [formData, setFormData] = useState({
    patientId: "", hospitalId: "", roomId: "", bedId: "",
    admissionReason: "", department: "", doctor: "",
    assignedNurseIds: "", currentStatus: "PENDING",
  });

  const loadData = () => {
    setLoading(true);
    Promise.allSettled([
      surgeryService.getAllSurgeries(),
      patientService.getAllPatients(),
    ]).then(([surgRes, patRes]) => {
      if (surgRes.status === "fulfilled") setSurgeries(surgRes.value.data || []);
      else console.error("Failed to fetch surgeries:", surgRes.reason);
      if (patRes.status === "fulfilled") setPatients(patRes.value.data || []);
      else console.error("Failed to fetch patients:", patRes.reason);
    }).finally(() => setLoading(false));
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

  const statusBreakdown = useMemo(() => {
    const counts = { SCHEDULED: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 };
    for (const s of surgeries) {
      if (counts[s.status] !== undefined) counts[s.status]++;
    }
    return counts;
  }, [surgeries]);

  const typeBreakdown = useMemo(() => {
    const counts = { ELECTIVE: 0, EMERGENCY: 0, MINOR: 0, MAJOR: 0 };
    for (const s of surgeries) {
      if (counts[s.surgeryType] !== undefined) counts[s.surgeryType]++;
    }
    return counts;
  }, [surgeries]);

  const statusChartData = useMemo(() => {
    const types = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    return {
      data: types.map((t) => statusBreakdown[t]),
      labels: types.map((t) => `${t}: ${statusBreakdown[t]}`),
      slices: types
        .filter((t) => statusBreakdown[t] > 0)
        .map((t) => ({ label: t, value: statusBreakdown[t], color: STATUS_COLORS[t] })),
    };
  }, [statusBreakdown]);

  const typeChartData = useMemo(() => {
    const types = ["ELECTIVE", "EMERGENCY", "MINOR", "MAJOR"];
    return {
      data: types.map((t) => typeBreakdown[t]),
      labels: types.map((t) => `${t}: ${typeBreakdown[t]}`),
      slices: types
        .filter((t) => typeBreakdown[t] > 0)
        .map((t) => ({ label: t, value: typeBreakdown[t], color: TYPE_COLORS[t] })),
    };
  }, [typeBreakdown]);

  const total = surgeries.length;

  const filtered = useMemo(() => {
    let result = surgeries;
    if (statusFilter !== "ALL") result = result.filter((s) => s.status === statusFilter);
    if (typeFilter !== "ALL") result = result.filter((s) => s.surgeryType === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((s) => {
        const id = s.surgeryId?.toLowerCase() || s.patientId?.toLowerCase() || "";
        return id.includes(q);
      });
    }
    return result;
  }, [surgeries, statusFilter, typeFilter, searchQuery]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleRowClick = async (surgery) => {
    if (!surgery.admissionId) {
      showToast("No admission linked. Click 'Create Admission' to add one.");
      return;
    }
    setLoadingAdmission(true);
    try {
      const res = await surgeryService.getAdmissionBySurgeryId(surgery._id);
      setSelectedAdmission(res?.data || null);
      if (!res?.data) showToast("Admission record not found");
    } catch {
      setSelectedAdmission(null);
      showToast("Failed to load admission details");
    } finally {
      setLoadingAdmission(false);
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

  const handleOpenLinkModal = async (e, surgery) => {
    e.stopPropagation();
    setLinkModal({ open: true, surgery });
    setLinkSearch("");
    setLinkLoading(true);
    try {
      const res = await admissionService.getAllAdmissionsWithPatient();
      setAdmissions(res?.data || res || []);
    } catch {
      setAdmissions([]);
      showToast("Failed to load admissions");
    } finally {
      setLinkLoading(false);
    }
  };

  const handleLinkAdmission = async (admissionId) => {
    const surgery = linkModal.surgery;
    setLinkingId(admissionId);
    try {
      await surgeryService.linkExistingAdmission(surgery._id, admissionId);
      showToast("Admission linked successfully");
      setLinkModal({ open: false, surgery: null });
      loadData();
    } catch (err) {
      showToast(err?.error || err.message || "Failed to link admission");
    } finally {
      setLinkingId(null);
    }
  };

  const filteredAdmissions = useMemo(() => {
    if (!linkSearch.trim()) return admissions;
    const q = linkSearch.trim().toLowerCase();
    return admissions.filter((a) => {
      const name = a.patient?.fullName?.toLowerCase() || "";
      const id = (a.patientId || "").toLowerCase();
      const reason = (a.admissionReason || "").toLowerCase();
      return name.includes(q) || id.includes(q) || reason.includes(q);
    });
  }, [admissions, linkSearch]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Surgery Records</h1>
          <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            {total} surgery records — track scheduled, in-progress, and completed surgeries
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() =>
              onNavigateToFunction?.({
                domain: "management",
                subsection: "room",
                functionId: "beds",
                centerTab: "dashboard",
              })
            }
            className="inline-flex max-w-40 items-center justify-center rounded-lg border border-slate-300 px-2.5 py-1.5 text-center text-xs font-medium leading-tight text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            type="button"
          >
            ← Back to Room Occupancy
          </button>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="btn btn-primary"
            type="button"
          >
            {showSearch ? "Hide Search" : "Search"}
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { key: "SCHEDULED", label: "Scheduled", color: STATUS_COLORS.SCHEDULED },
          { key: "IN_PROGRESS", label: "In Progress", color: STATUS_COLORS.IN_PROGRESS },
          { key: "COMPLETED", label: "Completed", color: STATUS_COLORS.COMPLETED },
          { key: "CANCELLED", label: "Cancelled", color: STATUS_COLORS.CANCELLED },
        ].map((item) => (
          <div key={item.key} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-1 text-3xl font-bold" style={{ color: item.color }}>{statusBreakdown[item.key]}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Surgeries by Status</h3>
          <BarChart data={statusChartData.data} labels={statusChartData.labels} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Status Distribution</h3>
          <div className="flex items-center justify-center">
            <MiniPieChart centerLabel={`${total}\nsurgeries`} slices={statusChartData.slices} />
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Surgeries by Type</h3>
          <BarChart data={typeChartData.data} labels={typeChartData.labels} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Type Distribution</h3>
          <div className="flex items-center justify-center">
            <MiniPieChart centerLabel={`${total}\nsurgeries`} slices={typeChartData.slices} />
          </div>
        </div>
      </div>

      {showSearch && (<>
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Surgery or Patient ID..."
          className="w-full max-w-sm rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-violet-400"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="self-center text-xs font-semibold uppercase tracking-wide text-slate-500">Status:</span>
        {["ALL", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {s === "ALL" ? "All" : s.replace("_", " ")}
          </button>
        ))}
        <span className="ml-2 self-center text-xs font-semibold uppercase tracking-wide text-slate-500">Type:</span>
        {["ALL", "ELECTIVE", "EMERGENCY", "MINOR", "MAJOR"].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              typeFilter === t
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="p-4 text-left font-semibold">Surgery ID</th>
              <th className="p-4 text-left font-semibold">Patient</th>
              <th className="p-4 text-left font-semibold">Procedure</th>
              <th className="p-4 text-left font-semibold">Type</th>
              <th className="p-4 text-left font-semibold">Op. Room</th>
              <th className="p-4 text-left font-semibold">Recovery Room</th>
              <th className="p-4 text-left font-semibold">Scheduled</th>
              <th className="p-4 text-left font-semibold">Status</th>
              <th className="p-4 text-left font-semibold">Outcome</th>
              <th className="p-4 text-left font-semibold">Link to Admission</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr
                key={s._id}
                onClick={() => handleRowClick(s)}
                className={`border-t border-slate-200 dark:border-slate-700 transition-colors ${
                  s.admissionId ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" : ""
                }`}
              >
                <td className="p-4 font-mono text-xs text-slate-600 dark:text-slate-400">{s.surgeryId}</td>
                <td className="p-4 font-medium text-slate-900 dark:text-white">
                  {patientMap[s.patientId]?.fullName || s.patientId}
                </td>
                <td className="p-4 text-slate-700 dark:text-slate-300 max-w-[200px]">
                  <div className="truncate">{s.procedureName}</div>
                </td>
                <td className="p-4">
                  <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: `${TYPE_COLORS[s.surgeryType] || "#94A3B8"}20`,
                      color: TYPE_COLORS[s.surgeryType] || "#94A3B8",
                    }}
                  >
                    {s.surgeryType}
                  </span>
                </td>
                <td className="p-4 text-slate-700 dark:text-slate-300">{s.operatingRoom || "-"}</td>
                <td className="p-4 text-slate-700 dark:text-slate-300">{s.recoveryRoom || "-"}</td>
                <td className="p-4 text-slate-700 dark:text-slate-300">
                  {s.scheduledDate ? new Date(s.scheduledDate).toLocaleDateString() : "-"}
                </td>
                <td className="p-4">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                    s.status === "COMPLETED"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      : s.status === "IN_PROGRESS"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : s.status === "CANCELLED"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                  }`}>
                    {s.status === "IN_PROGRESS" ? "In Progress" : s.status}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                    s.outcome === "SUCCESSFUL"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      : s.outcome === "COMPLICATIONS" || s.outcome === "FAILED"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {s.outcome}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    {s.admissionId && (
                      <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Linked
                      </span>
                    )}
                    <button
                      onClick={(e) => handleOpenLinkModal(e, s)}
                      className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4 4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      {s.admissionId ? "Re-link" : "Link Existing"}
                    </button>
                    {!s.admissionId && (
                      <button
                        onClick={(e) => handleOpenCreateForm(e, s)}
                        className="inline-flex items-center gap-1 rounded bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-violet-700"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Create
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-400">No surgery records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </>)}

      {selectedAdmission && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedAdmission(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Admission Details</h2>
              <button
                onClick={() => setSelectedAdmission(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {selectedAdmission.patient && (
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Patient</span>
                  <p className="text-slate-900 dark:text-white">{selectedAdmission.patient.fullName || selectedAdmission.patientId}</p>
                  {selectedAdmission.patient.ellyId && (
                    <p className="text-xs text-slate-400">{selectedAdmission.patient.ellyId}</p>
                  )}
                </div>
              )}
              {!selectedAdmission.patient && (
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Patient ID</span>
                  <p className="text-slate-900 dark:text-white">{selectedAdmission.patientId}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Department</span>
                  <p className="text-slate-900 dark:text-white">{selectedAdmission.department?.name || "-"}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Doctor</span>
                  <p className="text-slate-900 dark:text-white">{selectedAdmission.doctor?.name || "-"}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Room</span>
                  <p className="text-slate-900 dark:text-white">{selectedAdmission.roomId || "-"}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Bed</span>
                  <p className="text-slate-900 dark:text-white">{selectedAdmission.bedId || "-"}</p>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-500 dark:text-slate-400">Status</span>
                <p className="mt-0.5">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                    selectedAdmission.currentStatus === "ADMITTED" || selectedAdmission.currentStatus === "UNDER_TREATMENT"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : selectedAdmission.currentStatus === "DISCHARGED"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      : selectedAdmission.currentStatus === "TRANSFERRED"
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {selectedAdmission.currentStatus?.replace("_", " ") || "PENDING"}
                  </span>
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-500 dark:text-slate-400">Admission Reason</span>
                <p className="text-slate-900 dark:text-white">{selectedAdmission.admissionReason || "-"}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Admitted At</span>
                  <p className="text-slate-900 dark:text-white">
                    {selectedAdmission.admittedAt ? new Date(selectedAdmission.admittedAt).toLocaleString() : "-"}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Discharged At</span>
                  <p className="text-slate-900 dark:text-white">
                    {selectedAdmission.dischargedAt ? new Date(selectedAdmission.dischargedAt).toLocaleString() : "-"}
                  </p>
                </div>
              </div>

              {selectedAdmission.assignedNurseIds?.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Assigned Nurses</span>
                  <p className="text-slate-900 dark:text-white">{selectedAdmission.assignedNurseIds.join(", ")}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedAdmission(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {linkModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setLinkModal({ open: false, surgery: null })}
        >
          <div
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Link Existing Admission</h2>
              <button
                onClick={() => setLinkModal({ open: false, surgery: null })}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
              <p className="font-semibold">Surgery Patient:</p>
              <p>{patientMap[linkModal.surgery?.patientId]?.fullName || linkModal.surgery?.patientId}</p>
              <p className="text-xs opacity-75">ID: {linkModal.surgery?.patientId}</p>
              {linkModal.surgery?.admissionId && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Currently linked — selecting a new admission will break the existing link
                </p>
              )}
            </div>

            <input
              type="text"
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
              placeholder="Search admissions by patient name or ID..."
              className="mb-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
            />

            {linkLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAdmissions.length === 0 && (
                  <p className="py-4 text-center text-sm text-slate-400">No admissions found</p>
                )}
                {filteredAdmissions.map((adm) => {
                  const isLinking = linkingId === adm._id;
                  const linkedToSurgery = !!adm.surgeryId;
                  return (
                    <div
                      key={adm._id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {adm.patient?.fullName || adm.patientId}
                        </p>
                        <p className="text-xs text-slate-400">
                          ID: {adm.patientId} &middot; {adm.department?.name || "No dept"} &middot; {adm.currentStatus || "PENDING"}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {adm.admissionReason}
                        </p>
                        {linkedToSurgery && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4 4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Already linked to another surgery
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleLinkAdmission(adm._id)}
                        disabled={isLinking}
                        className="ml-3 shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
      )}

      {loadingAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
          </div>
        </div>
      )}

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
