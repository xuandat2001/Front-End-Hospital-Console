import { useEffect, useMemo, useState } from "react";
import { patientService } from "../../../../services/core-modules/patientApi";
import { admissionService, surgeryService } from "../../../../services/core-modules/hospitalApi";
import { getRegistrationsByEllyId } from "../../../../services/registration/registrationQueueApi";
import { isPatientRegisteredAtHospital } from "../../../../utils/patientHospitalAccess";
import RegistrationSummary from "./RegistrationSummary";
import PatientBodyModelSlot from "./PatientBodyModelSlot";

function toTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function timeOf(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortByDateDesc(items, key) {
  return [...items].sort(
    (a, b) => timeOf(b?.[key] || b?.updatedAt || b?.createdAt) - timeOf(a?.[key] || a?.updatedAt || a?.createdAt),
  );
}

const GLASS_PANEL =
  "rounded-2xl border border-white/60 bg-white/50 shadow-lg shadow-sky-900/5 ring-1 ring-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/45 dark:shadow-black/20";

function formatList(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return items.join(", ");
}

function formatMetric(value, unit) {
  if (value === null || value === undefined || value === "") return null;
  return `${value} ${unit}`;
}

function getClinicalRecordTimestamp(record) {
  const payload = record?.structuredData?.payload;
  const rawDate =
    payload?.period?.start ||
    payload?.effectiveDateTime ||
    payload?.occurrenceDateTime ||
    payload?.performedPeriod?.start ||
    payload?.issued ||
    record?.createdAt;

  return timeOf(rawDate);
}

const CLINICAL_TYPE_META = {
  Encounter: { label: "Encounter", color: "#3B82F6" },
  Immunization: { label: "Immunization", color: "#10B981" },
  Procedure: { label: "Procedure", color: "#8B5CF6" },
  DiagnosticReport: { label: "Lab Report", color: "#F59E0B" },
};

// Local status metadata mirroring the intelligence census layer, so the record
// header can show a consistent badge without depending on the census snapshot.
const STATUS_META = {
  PENDING: { label: "Pending", color: "#F59E0B" },
  ADMITTED: { label: "Admitted", color: "#3B82F6" },
  UNDER_TREATMENT: { label: "Under Treatment", color: "#F97316" },
  TRANSFERRED: { label: "Transferred", color: "#8B5CF6" },
  IN_SURGERY: { label: "In Surgery", color: "#8B5CF6" },
  IN_RECOVERY: { label: "In Recovery", color: "#14B8A6" },
  SCHEDULED_SURGERY: { label: "Scheduled Surgery", color: "#A78BFA" },
  DISCHARGED: { label: "Discharged", color: "#22C55E" },
  INACTIVE: { label: "Inactive", color: "#9CA3AF" },
};

function deriveStatusKey(admissions, surgeries) {
  const active = admissions.find((a) => a.currentStatus !== "DISCHARGED");
  const latest = admissions[0] || null;
  const inSurgery = surgeries.find((s) => s.status === "IN_PROGRESS");
  const recovery = surgeries.find((s) => s.status === "COMPLETED" && s.recoveryRoom);
  const scheduled = surgeries.find((s) => s.status === "SCHEDULED");

  if (inSurgery) return "IN_SURGERY";
  if (recovery && active) return "IN_RECOVERY";
  if (scheduled && active) return "SCHEDULED_SURGERY";
  if (active) return active.currentStatus;
  if (recovery) return "IN_RECOVERY";
  if (scheduled) return "SCHEDULED_SURGERY";
  if (latest?.currentStatus === "DISCHARGED") return "DISCHARGED";
  return "INACTIVE";
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-lg border border-white/50 bg-white/35 p-3 dark:border-slate-700/60 dark:bg-slate-900/30">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{value || "N/A"}</p>
    </div>
  );
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "medical-profile", label: "Medical Profile" },
  { id: "clinical", label: "Clinical History" },
  { id: "registration", label: "Registration" },
  { id: "admission", label: "Admission & Discharge" },
  { id: "surgery", label: "Surgery" },
];

function hasMedicalProfileData(profile = {}) {
  return Boolean(
    profile.bloodGroup ||
      profile.heightCm ||
      profile.weightKg ||
      formatList(profile.allergies) ||
      formatList(profile.chronicConditions) ||
      formatList(profile.currentMedications) ||
      formatList(profile.pastMedicalHistory),
  );
}

const EMPTY = {
  patient: null,
  medicalProfile: null,
  medicalRecords: [],
  admissions: [],
  surgeries: [],
  registrations: [],
};

/**
 * Full patient-centric record for a single EllyID. Self-contained: fetches
 * demographics, admissions, surgeries, and registrations directly from the
 * per-patient endpoints (scoped to the session hospital), independent of the
 * census snapshot. Read-only.
 */
export default function PatientRecordView({ ellyId, workspace }) {
  const [state, setState] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [activeBodySystem, setActiveBodySystem] = useState("overview");

  const hospitalId = workspace?.ellyHospitalId || workspace?.id || undefined;
  const hospitalName = workspace?.hospitalName;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setRestricted(false);
    setError("");
    setActiveTab("overview");
    setActiveBodySystem("overview");

    async function load() {
      try {
        const profileResponse = await patientService.getPatientByEllyId(ellyId);
        const patient = profileResponse?.data?.patient || profileResponse?.data || null;
        const medicalProfile = profileResponse?.data?.medicalProfile || null;

        if (!patient) {
          if (!cancelled) {
            setState(EMPTY);
            setNotFound(true);
            setLoading(false);
          }
          return;
        }

        if (!isPatientRegisteredAtHospital(patient, workspace)) {
          if (!cancelled) {
            setState({ ...EMPTY, patient });
            setRestricted(true);
            setLoading(false);
          }
          return;
        }

        const [admissionsRes, surgeriesRes, registrationsRes, medicalRecordsRes] =
          await Promise.all([
            admissionService.getAdmissionsByPatient(ellyId, hospitalId).catch(() => []),
            surgeryService.getSurgeriesByPatient(ellyId, hospitalId).catch(() => ({ data: [] })),
            getRegistrationsByEllyId(ellyId).catch(() => ({ data: [] })),
            patientService.getMedicalRecordsByEllyId(ellyId).catch(() => ({ data: [] })),
          ]);

        if (cancelled) return;

        const admissions = Array.isArray(admissionsRes)
          ? admissionsRes
          : admissionsRes?.data || [];
        const surgeries = Array.isArray(surgeriesRes)
          ? surgeriesRes
          : surgeriesRes?.data || [];
        const registrations = Array.isArray(registrationsRes?.data)
          ? registrationsRes.data
          : [];
        const medicalRecords = Array.isArray(medicalRecordsRes?.data)
          ? medicalRecordsRes.data
          : [];

        setState({
          patient,
          medicalProfile,
          medicalRecords,
          admissions,
          surgeries,
          registrations,
        });
        setLoading(false);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError.message || "Failed to load patient record.");
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [ellyId, hospitalId, workspace]);

  const admissionsHistory = useMemo(
    () => sortByDateDesc(state.admissions, "admittedAt"),
    [state.admissions],
  );
  const surgeriesHistory = useMemo(
    () => sortByDateDesc(state.surgeries, "scheduledDate"),
    [state.surgeries],
  );
  const clinicalHistory = useMemo(
    () =>
      [...state.medicalRecords].sort(
        (a, b) => getClinicalRecordTimestamp(b) - getClinicalRecordTimestamp(a),
      ),
    [state.medicalRecords],
  );

  const currentAdmission = useMemo(
    () => admissionsHistory.find((a) => a.currentStatus !== "DISCHARGED") || admissionsHistory[0] || null,
    [admissionsHistory],
  );
  const currentSurgery = useMemo(
    () =>
      surgeriesHistory.find((s) => s.status === "IN_PROGRESS") ||
      surgeriesHistory.find((s) => s.status === "SCHEDULED") ||
      surgeriesHistory[0] ||
      null,
    [surgeriesHistory],
  );

  const statusKey = useMemo(
    () => deriveStatusKey(admissionsHistory, surgeriesHistory),
    [admissionsHistory, surgeriesHistory],
  );
  const statusMeta = STATUS_META[statusKey] || STATUS_META.INACTIVE;
  const isInPatient = Boolean(admissionsHistory.find((a) => a.currentStatus !== "DISCHARGED"));

  if (loading) {
    return (
      <RecordShell>
        <div className="flex min-h-[520px] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
        </div>
      </RecordShell>
    );
  }

  if (error) {
    return (
      <RecordShell>
        <div className={`${GLASS_PANEL} px-6 py-16 text-center`}>
          <p className="text-lg font-semibold text-red-700 dark:text-red-300">Could not load record</p>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </RecordShell>
    );
  }

  if (notFound) {
    return (
      <RecordShell>
        <div className={`${GLASS_PANEL} border-dashed px-6 py-16 text-center`}>
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            No patient found for EllyID “{ellyId}”
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Check the EllyID and try again.
          </p>
        </div>
      </RecordShell>
    );
  }

  if (restricted) {
    return (
      <RecordShell>
        <div className={`${GLASS_PANEL} border-amber-200/80 px-6 py-16 text-center dark:border-amber-900/60`}>
          <p className="text-lg font-semibold text-amber-800 dark:text-amber-200">Access restricted</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-amber-700/90 dark:text-amber-300/90">
            This patient is not registered with{" "}
            <span className="font-semibold">{hospitalName || "your hospital"}</span>. Records can
            only be opened for patients registered at your hospital.
          </p>
          <p className="mt-2 text-xs text-amber-600/80 dark:text-amber-400/70">
            EllyID <span className="font-mono">{ellyId}</span>
          </p>
        </div>
      </RecordShell>
    );
  }

  const patient = state.patient || {};

  return (
    <RecordShell>
      <div className="flex h-full min-h-0 flex-col gap-4 xl:flex-row xl:items-stretch">
        <section className="min-h-[480px] shrink-0 flex-1 xl:h-full xl:min-h-0 xl:basis-[58%]">
          <PatientBodyModelSlot
            activeSystem={activeBodySystem}
            onSystemChange={setActiveBodySystem}
            patientName={patient.fullName}
          />
        </section>

        <aside
          className={`flex h-full min-h-0 flex-col overflow-hidden xl:basis-[42%] xl:max-w-xl ${GLASS_PANEL}`}
        >
          <div className="shrink-0 border-b border-white/50 p-5 dark:border-slate-700/80">
            <PatientRecordHeader
              patient={patient}
              ellyId={ellyId}
              statusMeta={statusMeta}
              isInPatient={isInPatient}
            />

            <div className="mt-4 flex flex-wrap gap-1.5">
              {TABS.map((tab) => {
                const count =
                  tab.id === "clinical"
                    ? clinicalHistory.length
                    : tab.id === "registration"
                      ? state.registrations.length
                      : tab.id === "admission"
                        ? admissionsHistory.length
                        : tab.id === "surgery"
                          ? surgeriesHistory.length
                          : null;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-violet-600 text-white shadow-sm"
                        : "bg-white/60 text-slate-600 hover:bg-white dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {tab.label}
                    {count !== null && count > 0 ? ` (${count})` : ""}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.45)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/70 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600/70 [&::-webkit-scrollbar-track]:bg-transparent">
            {activeTab === "overview" && (
              <OverviewSection patient={patient} statusLabel={statusMeta.label} />
            )}

            {activeTab === "medical-profile" && (
              <MedicalProfileSection medicalProfile={state.medicalProfile} />
            )}

            {activeTab === "clinical" && (
              <ClinicalHistorySection records={clinicalHistory} />
            )}

            {activeTab === "registration" && (
              <RegistrationSummary registrations={state.registrations} loading={false} error="" />
            )}

            {activeTab === "admission" && (
              <AdmissionSection
                currentAdmission={currentAdmission}
                admissionsHistory={admissionsHistory}
                isInPatient={isInPatient}
              />
            )}

            {activeTab === "surgery" && (
              <SurgerySection currentSurgery={currentSurgery} surgeriesHistory={surgeriesHistory} />
            )}
          </div>
        </aside>
      </div>
    </RecordShell>
  );
}

function RecordShell({ children }) {
  return (
    <div className="h-full overflow-hidden bg-gradient-to-br from-sky-50 via-slate-50 to-blue-100/80 px-4 pb-4 pt-2 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {children}
    </div>
  );
}

function PatientRecordHeader({ patient, ellyId, statusMeta, isInPatient }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-950 dark:text-white sm:text-2xl">
            {patient.fullName || ellyId}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            <span className="font-mono font-semibold tracking-tight text-violet-600 dark:text-violet-400">
              {patient.ellyId || ellyId}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: `${statusMeta.color}20`, color: statusMeta.color }}
          >
            {statusMeta.label}
          </span>
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              isInPatient
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
            }`}
          >
            {isInPatient ? "Inpatient" : "Outpatient"}
          </span>
        </div>
      </div>

      <StatusScoreBar statusMeta={statusMeta} isInPatient={isInPatient} />
    </div>
  );
}

function StatusScoreBar({ statusMeta, isInPatient }) {
  const score = isInPatient ? 68 : 32;
  const label = isInPatient ? "Elevated" : "Stable";

  return (
    <div className="rounded-xl border border-white/50 bg-white/35 px-3 py-2.5 dark:border-slate-700/60 dark:bg-slate-900/30">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600 dark:text-slate-300">Care priority</span>
        <span className="font-semibold" style={{ color: statusMeta.color }}>
          {label}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: statusMeta.color }}
        />
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <section className="rounded-xl border border-white/60 bg-white/40 p-4 dark:border-white/10 dark:bg-slate-800/35">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function OverviewSection({ patient, statusLabel }) {
  return (
    <>
      <SectionCard title="Demographics">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoItem label="Full Name" value={patient.fullName} />
          <InfoItem label="Gender" value={patient.gender} />
          <InfoItem label="Date of Birth" value={toTime(patient.dateOfBirth)} />
          <InfoItem label="Phone" value={patient.phone} />
          <InfoItem label="Email" value={patient.email} />
          <InfoItem label="Current Status" value={statusLabel} />
        </div>
      </SectionCard>

      <SectionCard title="Contact & Address">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoItem label="Address" value={patient.address?.line1} />
          <InfoItem
            label="City / State"
            value={[patient.address?.city, patient.address?.state].filter(Boolean).join(", ")}
          />
          <InfoItem label="Country" value={patient.address?.country} />
          <InfoItem label="Postal Code" value={patient.address?.postalCode} />
          <InfoItem label="Emergency Contact" value={patient.emergencyContact?.name} />
          <InfoItem label="Emergency Contact Phone" value={patient.emergencyContact?.phone} />
        </div>
      </SectionCard>

      {Array.isArray(patient.registeredHospitals) && patient.registeredHospitals.length > 0 && (
        <SectionCard title="Registered Facilities">
          <div className="flex flex-wrap gap-2">
            {patient.registeredHospitals.map((item, idx) => (
              <span
                key={`hospital-${idx}`}
                className="rounded-full bg-teal-900/50 px-3 py-1 text-xs font-medium text-teal-300"
              >
                {typeof item === "object" ? item.hospitalName || item.hospitalId : item}
              </span>
            ))}
          </div>
        </SectionCard>
      )}
    </>
  );
}

function MedicalProfileSection({ medicalProfile }) {
  const profile = medicalProfile || {};
  const hasMedicalProfile = hasMedicalProfileData(profile);

  return (
    <SectionCard
      title="Medical Profile"
      subtitle={
        hasMedicalProfile
          ? "Vitals and clinical background from imported records"
          : "No medical profile on file yet"
      }
    >
      {hasMedicalProfile ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoItem label="Blood Group" value={profile.bloodGroup} />
          <InfoItem label="Height" value={formatMetric(profile.heightCm, "cm")} />
          <InfoItem label="Weight" value={formatMetric(profile.weightKg, "kg")} />
          <InfoItem label="Allergies" value={formatList(profile.allergies)} />
          <InfoItem label="Chronic Conditions" value={formatList(profile.chronicConditions)} />
          <InfoItem label="Current Medications" value={formatList(profile.currentMedications)} />
          <InfoItem
            label="Past Medical History"
            value={formatList(profile.pastMedicalHistory)}
          />
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Medical profile data appears here after FHIR or clinical imports (height, weight,
          allergies, history).
        </p>
      )}
    </SectionCard>
  );
}

function ClinicalHistorySection({ records }) {
  if (!records.length) {
    return (
      <SectionCard title="Clinical History">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No clinical records on file. Encounters, immunizations, procedures, and lab reports
          imported from FHIR will appear here.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Clinical History" subtitle={`${records.length} record(s)`}>
      <div className="space-y-3">
        {records.map((record) => {
          const structured = record.structuredData || {};
          const resourceType = structured.fhirResourceType || "Record";
          const typeMeta = CLINICAL_TYPE_META[resourceType] || {
            label: resourceType,
            color: "#64748B",
          };
          const recordDate = getClinicalRecordTimestamp(record);
          const displayDate = recordDate ? toTime(recordDate) : "N/A";

          return (
            <article
              key={record._id}
              className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {record.title}
                  </p>
                  {record.description && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {record.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      backgroundColor: `${typeMeta.color}20`,
                      color: typeMeta.color,
                    }}
                  >
                    {typeMeta.label}
                  </span>
                  {structured.source === "FHIR_R4" && (
                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                      FHIR
                    </span>
                  )}
                </div>
              </div>

              {record.notes && (
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{record.notes}</p>
              )}

              <p className="mt-2 text-[11px] text-slate-400">
                Recorded {displayDate}
                {structured.externalKey ? ` · ${structured.externalKey}` : ""}
              </p>
            </article>
          );
        })}
      </div>
    </SectionCard>
  );
}

function AdmissionSection({ currentAdmission, admissionsHistory, isInPatient }) {
  const admission = currentAdmission || {};
  return (
    <>
      <SectionCard title="Current / Latest Admission">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoItem label="Admission ID" value={admission._id || admission.admissionId} />
          <InfoItem label="Patient Type" value={isInPatient ? "Inpatient" : "Outpatient"} />
          <InfoItem label="Admission Status" value={admission.currentStatus} />
          <InfoItem label="Admission Reason" value={admission.admissionReason} />
          <InfoItem label="Admitted At" value={toTime(admission.admittedAt)} />
          <InfoItem label="Discharged At" value={toTime(admission.dischargedAt)} />
          <InfoItem label="Department" value={admission.department?.name || admission.department?.id} />
          <InfoItem
            label="Room / Bed"
            value={[admission.roomId, admission.bedId].filter(Boolean).join(" / ")}
          />
          <InfoItem label="Assigned Doctor" value={admission.doctor?.name || admission.doctor?.id} />
          <InfoItem
            label="Assigned Nurses"
            value={admission.assignedNurseIds?.length ? admission.assignedNurseIds.join(", ") : ""}
          />
        </div>
      </SectionCard>

      <SectionCard title="Admission History" subtitle={`${admissionsHistory.length} record(s)`}>
        <div className="space-y-2">
          {admissionsHistory.length ? (
            admissionsHistory.map((item) => (
              <div key={item._id} className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {item.currentStatus} • {item.department?.name || item.department?.id || "-"}
                </p>
                <p className="text-slate-500">Admitted: {toTime(item.admittedAt)}</p>
                <p className="text-slate-500">Discharged: {toTime(item.dischargedAt)}</p>
                <p className="text-slate-500">Room/Bed: {item.roomId || "-"} / {item.bedId || "-"}</p>
                <p className="text-slate-500">Doctor: {item.doctor?.name || item.doctor?.id || "-"}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">No admissions on file at this hospital.</p>
          )}
        </div>
      </SectionCard>
    </>
  );
}

function SurgerySection({ currentSurgery, surgeriesHistory }) {
  const surgery = currentSurgery || {};
  return (
    <>
      <SectionCard title="Current / Latest Surgery">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoItem label="Surgery ID" value={surgery.surgeryId || surgery._id} />
          <InfoItem label="Surgery Status" value={surgery.status} />
          <InfoItem label="Procedure" value={surgery.procedureName} />
          <InfoItem label="Diagnosis" value={surgery.diagnosis} />
          <InfoItem label="Surgery Type" value={surgery.surgeryType} />
          <InfoItem label="Scheduled Date" value={toTime(surgery.scheduledDate)} />
          <InfoItem label="Operating Room" value={surgery.operatingRoom} />
          <InfoItem label="Outcome" value={surgery.outcome} />
        </div>
      </SectionCard>

      <SectionCard title="Surgery History" subtitle={`${surgeriesHistory.length} record(s)`}>
        <div className="space-y-2">
          {surgeriesHistory.length ? (
            surgeriesHistory.map((item) => (
              <div key={item._id || item.surgeryId} className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {item.procedureName || item.surgeryId || "Surgery"}
                </p>
                <p className="text-slate-500">Status: {item.status || "-"}</p>
                <p className="text-slate-500">Type: {item.surgeryType || "-"}</p>
                <p className="text-slate-500">Scheduled: {toTime(item.scheduledDate)}</p>
                <p className="text-slate-500">Operating Room: {item.operatingRoom || "-"}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">No surgeries on file at this hospital.</p>
          )}
        </div>
      </SectionCard>
    </>
  );
}
