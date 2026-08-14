import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { hospitalService, admissionService } from "../../../services/core-modules/hospitalApi";
import { patientAccessService } from "../../../services/core-modules/patientAccessApi";
import useSessionStore from "../../../store/useSessionStore";
import { formatDateTime } from "../../../utils/dateFormat";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-violet-400";

export default function DoctorAdmitPatient() {
  const currentUser = useSessionStore((state) => state.currentUser);

  const [hospitals, setHospitals] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [patientFilter, setPatientFilter] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [hospitalId, setHospitalId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [admissionReason, setAdmissionReason] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [agreeingId, setAgreeingId] = useState("");
  const [toast, setToast] = useState(null);

  const doctorId = currentUser?.ellyId || "";
  const doctorName = currentUser?.fullName || "Unknown";

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(() => {
    Promise.all([
      hospitalService.getAllHospitals(),
      hospitalService.getAllDepartmentsList(),
      admissionService.getAllAdmissionsWithPatient(),
      patientAccessService.getAll({ doctorId }),
    ])
      .then(([hospRes, depts, admRes, accessRes]) => {
        setHospitals(hospRes.data || []);
        setDepartments(depts || []);
        setAdmissions(admRes.data || []);
        setAccessRequests(accessRes.data || []);
      })
      .catch((loadError) => {
        console.error("Failed to load admission data:", loadError);
        setError(loadError.message || "Failed to load admission data.");
      })
      .finally(() => setLoading(false));
  }, [doctorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedHospital = useMemo(
    () => hospitals.find((h) => h.ellyHospitalId === hospitalId) || hospitals[0] || null,
    [hospitals, hospitalId],
  );

  const hospitalDepartments = useMemo(() => {
    if (!selectedHospital) return [];
    return departments.filter(
      (d) =>
        String(d.status || "").toUpperCase() === "ACTIVE" &&
        (d.hospitalId === selectedHospital.ellyHospitalId ||
          d.hospitalId === selectedHospital._id ||
          d.hospital?.ellyHospitalId === selectedHospital.ellyHospitalId),
    );
  }, [departments, selectedHospital]);

  const effectiveDepartmentId =
    departmentId || hospitalDepartments[0]?.ellyDepartmentId || hospitalDepartments[0]?._id || "";
  const effectiveHospital = selectedHospital?.ellyHospitalId || "";

  const selectablePatients = useMemo(() => {
    return accessRequests
      .filter((r) => r.status === "APPROVED")
      .map((r) => ({ ellyId: r.patientId, fullName: r.patientName || r.patientId }));
  }, [accessRequests]);

  const filteredPatients = useMemo(() => {
    const query = patientFilter.trim().toLowerCase();
    if (!query) return selectablePatients;
    return selectablePatients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(query) ||
        String(p.ellyId).toLowerCase().includes(query),
    );
  }, [selectablePatients, patientFilter]);

  const pendingAdmissions = useMemo(
    () =>
      admissions
        .filter(
          (a) => a.currentStatus === "PENDING" && a.doctor?.id === doctorId,
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [admissions, doctorId],
  );

  const admittedAdmissions = useMemo(
    () =>
      admissions
        .filter(
          (a) =>
            a.currentStatus === "ADMITTED" &&
            a.doctor?.id === doctorId,
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [admissions, doctorId],
  );

  const handleCreateRequest = async () => {
    if (!selectedPatient) {
      showToast("Select a patient first.", "error");
      return;
    }
    if (!selectedHospital) {
      showToast("No hospital available to admit to.", "error");
      return;
    }
    if (!admissionReason.trim()) {
      showToast("Add an admission reason.", "error");
      return;
    }

    const department = hospitalDepartments.find(
      (d) => (d.ellyDepartmentId || d._id) === effectiveDepartmentId,
    );

    setSubmitting(true);
    try {
      await admissionService.createAdmission({
        patientId: selectedPatient.ellyId,
        hospitalId: selectedHospital.ellyHospitalId,
        department: {
          id: department?.ellyDepartmentId || effectiveDepartmentId,
          name: department?.name || "General",
        },
        admissionReason: admissionReason.trim(),
        doctor: { id: doctorId, name: doctorName },
      });

      showToast(
        "Admission request sent. Waiting for patient agreement before admitting.",
      );
      setSelectedPatient(null);
      setPatientFilter("");
      setAdmissionReason("");
      loadData();
    } catch (submitError) {
      showToast(submitError.message || "Failed to send admission request.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePatientAgreed = async (admission) => {
    setAgreeingId(admission._id);
    try {
      await admissionService.updateAdmissionStatus(admission._id, "ADMITTED");
      showToast(
        `Patient ${admission.patient?.fullName || admission.patientId} agreed — admitted to ${selectedHospital?.hospitalName || "the hospital"}.`,
      );
      loadData();
    } catch (agreeError) {
      showToast(agreeError.message || "Failed to admit patient.", "error");
    } finally {
      setAgreeingId("");
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
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pb-3 pt-3 sm:px-5">
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
            toast.type === "error" ? "bg-red-600" : "bg-green-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/60 bg-white/95 px-4 py-3 shadow-sm ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95 dark:ring-white/5">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-slate-950 dark:text-white sm:text-xl">
            Admit Patient
          </h1>
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
            Choose one of your approved patients and send an admission request.
            The patient is admitted automatically once they agree. Room and bed
            are assigned later by the hospital admin.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="rounded-lg bg-amber-100 px-2 py-1 font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            {pendingAdmissions.length} awaiting agreement
          </span>
          <span className="rounded-lg bg-green-100 px-2 py-1 font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
            {admittedAdmissions.length} admitted
          </span>
        </div>
      </header>

      {error && (
        <p className="shrink-0 rounded-lg bg-red-100 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-sm ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95 dark:ring-white/5">
          <div className="shrink-0 border-b border-slate-200/70 px-4 py-3 dark:border-slate-700/70">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              New Admission Request
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sent to the patient for agreement before admitting
            </p>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <Field label="1. Patient (approved)">
              <input
                type="text"
                value={patientFilter}
                onChange={(e) => setPatientFilter(e.target.value)}
                placeholder="Filter your patients by name or Elly ID..."
                className={inputClass}
              />
              <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                {selectablePatients.length === 0 ? (
                  <p className="p-3 text-sm text-slate-500 dark:text-slate-400">
                    You have no approved patients yet. Request access from "My
                    Patients" first — you can only admit patients you take care
                    of.
                  </p>
                ) : filteredPatients.length === 0 ? (
                  <p className="p-3 text-sm text-slate-500 dark:text-slate-400">
                    No approved patients matched “{patientFilter}”.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredPatients.map((patient) => {
                      const isSelected = selectedPatient?.ellyId === patient.ellyId;
                      return (
                        <li key={patient.ellyId}>
                          <button
                            type="button"
                            onClick={() => setSelectedPatient(patient)}
                            className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                              isSelected ? "bg-violet-50 dark:bg-violet-900/30" : ""
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {patient.fullName}
                              </span>
                              <span className="block truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                {patient.ellyId}
                              </span>
                            </span>
                            <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              {isSelected ? "Selected" : "Select"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {selectedPatient && (
                <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-indigo-300/50 bg-indigo-50/60 px-3 py-2.5 dark:border-indigo-500/40 dark:bg-indigo-950/30">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {selectedPatient.fullName}
                    </p>
                    <p className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                      {selectedPatient.ellyId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Remove
                  </button>
                </div>
              )}
            </Field>

            <Field label="2. Choose Hospital">
              <select
                value={effectiveHospital}
                onChange={(e) => {
                  setHospitalId(e.target.value);
                  setDepartmentId("");
                }}
                className={inputClass}
              >
                {hospitals.length === 0 && <option value="">No hospitals</option>}
                {hospitals.map((h) => (
                  <option key={h.ellyHospitalId || h._id} value={h.ellyHospitalId}>
                    {h.hospitalName}
                  </option>
                ))}
              </select>
              {selectedHospital && (
                <p className="mt-1 text-[10px] text-slate-400">
                  {selectedHospital.hospitalName} ·{" "}
                  <span className="font-mono">{selectedHospital.ellyHospitalId}</span>
                </p>
              )}
            </Field>

            <Field label="3. Department">
              <select
                value={effectiveDepartmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className={inputClass}
              >
                {hospitalDepartments.length === 0 && (
                  <option value="">No active departments</option>
                )}
                {hospitalDepartments.map((d) => (
                  <option
                    key={d.ellyDepartmentId || d._id}
                    value={d.ellyDepartmentId || d._id}
                  >
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="4. Admission Reason">
              <textarea
                rows={3}
                value={admissionReason}
                onChange={(e) => setAdmissionReason(e.target.value)}
                placeholder="Why does this patient need to be admitted?"
                className={inputClass}
              />
            </Field>

            <div className="flex flex-wrap items-end justify-between gap-3">
              <Field label="Admitting Doctor">
                <input
                  type="text"
                  value={`${doctorName}${doctorId ? ` (${doctorId})` : ""}`}
                  readOnly
                  disabled
                  className={`${inputClass} cursor-not-allowed opacity-70`}
                />
              </Field>
            </div>

            <button
              type="button"
              onClick={handleCreateRequest}
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send size={16} />
              {submitting ? "Sending…" : "Send Admission Request"}
            </button>
          </div>
        </section>

        <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-sm ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95 dark:ring-white/5">
            <div className="shrink-0 border-b border-slate-200/70 px-4 py-3 dark:border-slate-700/70">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Awaiting Patient Agreement
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Patient agrees → auto-admitted to the chosen hospital
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {pendingAdmissions.length === 0 ? (
                <p className="p-6 text-sm text-slate-500 dark:text-slate-400">
                  No pending admission requests. Send one from the left to ask a
                  patient to be admitted.
                </p>
              ) : (
                <ul className="divide-y divide-slate-200 dark:divide-slate-700/60">
                  {pendingAdmissions.map((admission) => (
                    <li
                      key={admission._id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {admission.patient?.fullName || admission.patientId}
                        </p>
                        <p className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                          {admission.patientId}
                        </p>
                        <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {admission.department?.name}
                          {admission.roomId ? ` · ${admission.roomId}` : " · room & bed pending admin assignment"}
                        </p>
                        {admission.admissionReason && (
                          <p className="mt-0.5 truncate text-[11px] italic text-slate-400">
                            “{admission.admissionReason}”
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          {formatDateTime(admission.createdAt)}
                        </span>
                        <button
                          type="button"
                          disabled={agreeingId === admission._id}
                          onClick={() => handlePatientAgreed(admission)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle2 size={14} />
                          {agreeingId === admission._id
                            ? "Admitting…"
                            : "Patient Agreed — Admit Now"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="shrink-0 rounded-2xl border border-white/60 bg-white/95 shadow-sm ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95 dark:ring-white/5">
            <div className="border-b border-slate-200/70 px-4 py-3 dark:border-slate-700/70">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Recently Admitted
              </h2>
            </div>
            {admittedAdmissions.length === 0 ? (
              <p className="p-4 text-xs text-slate-500 dark:text-slate-400">
                No admissions yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-700/60">
                {admittedAdmissions.slice(0, 5).map((admission) => (
                  <li
                    key={admission._id}
                    className="flex items-center justify-between gap-2 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-800 dark:text-slate-200">
                        {admission.patient?.fullName || admission.patientId}
                      </p>
                      <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                        {admission.department?.name}
                        {admission.roomId ? ` · ${admission.roomId}` : " · room pending admin assignment"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      Admitted
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
