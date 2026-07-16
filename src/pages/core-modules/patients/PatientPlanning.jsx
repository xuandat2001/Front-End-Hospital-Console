import { useEffect, useState, useMemo } from "react";
import { admissionService, surgeryService } from "../../../services/core-modules/hospitalApi";
import { patientService } from "../../../services/core-modules/patientApi";

const INPATIENT_STAGES = [
  { id: "registration", label: "Patient Registration", color: "bg-slate-500", index: 0 },
  { id: "appointment", label: "Appointment", color: "bg-blue-400", index: 1 },
  { id: "doctor-assessment", label: "Doctor Assessment", color: "bg-cyan-500", index: 2 },
  { id: "tests-imaging", label: "Tests / Imaging", color: "bg-sky-500", index: 3 },
  { id: "doctor-decision", label: "Doctor Decision", color: "bg-indigo-500", index: 4 },
  { id: "admission", label: "Admission", color: "bg-violet-500", index: 5 },
  { id: "room-bed", label: "Room & Bed Assignment", color: "bg-purple-500", index: 6 },
  { id: "treatment-surgery", label: "Treatment / Surgery", color: "bg-amber-500", index: 7 },
  { id: "recovery", label: "Recovery", color: "bg-teal-500", index: 8 },
  { id: "discharge", label: "Discharge", color: "bg-emerald-500", index: 9 },
];

function mapInpatientStage(admission) {
  if (!admission) return "registration";
  if (admission.currentStatus === "DISCHARGED") return "discharge";
  if (admission.currentStatus === "TRANSFERRED") return "recovery";
  if (admission.currentStatus === "UNDER_TREATMENT") return "treatment-surgery";
  if (admission.currentStatus === "ADMITTED" && admission.roomId) return "room-bed";
  if (admission.currentStatus === "ADMITTED") return "admission";
  if (admission.currentStatus === "PENDING") return "doctor-decision";
  return "registration";
}

export default function PatientPlanning() {
  const [admissions, setAdmissions] = useState([]);
  const [surgeries, setSurgeries] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      admissionService.getAllAdmissionsWithPatient(),
      surgeryService.getAllSurgeries(),
      patientService.getAllPatients(),
    ])
      .then(([admRes, surgRes, patRes]) => {
        setAdmissions(admRes.data || []);
        setSurgeries(surgRes.data || []);
        setPatients(patRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const patientLookup = useMemo(() => {
    const map = {};
    for (const p of patients) {
      map[p._id] = p;
      if (p.ellyId) map[p.ellyId] = p;
    }
    return map;
  }, [patients]);

  const admissionPatientIds = useMemo(() => {
    const ids = new Set();
    for (const a of admissions) ids.add(a.patientId);
    return ids;
  }, [admissions]);

  const buckets = useMemo(() => {
    const cards = [];

    for (const a of admissions) {
      const stage = mapInpatientStage(a);
      cards.push({
        _id: a._id,
        patientId: a.patientId,
        patientName: a.patient?.fullName || a.patientId,
        department: a.department?.name,
        currentStatus: a.currentStatus,
        doctor: a.doctor?.name,
        roomId: a.roomId,
        bedId: a.bedId,
        stage,
      });
    }

    for (const s of surgeries) {
      if (!admissionPatientIds.has(s.patientId)) {
        const patient = patientLookup[s.patientId];
        cards.push({
          _id: s._id,
          patientId: s.patientId,
          patientName: patient?.fullName || s.patientId,
          procedureName: s.procedureName,
          surgeryStatus: s.status,
          stage: "treatment-surgery",
        });
      }
    }

    for (const p of patients) {
      const pid = p.ellyId || p._id;
      if (!admissionPatientIds.has(pid)) {
        cards.push({
          _id: pid,
          patientId: pid,
          patientName: p.fullName || pid,
          stage: "registration",
        });
      }
    }

    const b = {};
    for (const st of INPATIENT_STAGES) b[st.id] = [];
    for (const c of cards) b[c.stage]?.push(c);
    return b;
  }, [admissions, surgeries, admissionPatientIds, patientLookup]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Patient Roadmap</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Inpatient journey — patients with admissions or surgeries
        </p>
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {INPATIENT_STAGES.map((stage) => (
          <div
            key={stage.id}
            className="flex w-64 min-w-[16rem] flex-col rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50"
          >
            <div className={`flex items-center gap-2 rounded-t-xl px-4 py-3 ${stage.color}`}>
              <span className="text-xs font-bold tracking-wide text-white uppercase">
                {stage.index + 1}.
              </span>
              <span className="text-sm font-bold text-white">{stage.label}</span>
              <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">
                {(buckets[stage.id] || []).length}
              </span>
            </div>
            <div className="flex flex-col gap-2 p-3 overflow-y-auto max-h-[calc(100vh-22rem)]">
              {(buckets[stage.id] || []).length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">No patients</p>
              ) : (
                buckets[stage.id].map((card) => (
                  <div
                    key={card._id}
                    className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {card.patientName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{card.patientId}</p>
                    {card.department && (
                      <span className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {card.department}
                      </span>
                    )}
                    {card.currentStatus && (
                      <span className="mt-1 ml-1 inline-block rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        {card.currentStatus}
                      </span>
                    )}
                    {card.surgeryStatus && (
                      <span className="mt-1 ml-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        {card.surgeryStatus}
                      </span>
                    )}
                    {card.procedureName && (
                      <p className="mt-1 text-[10px] text-slate-400">{card.procedureName}</p>
                    )}
                    {card.roomId && (
                      <p className="mt-1 text-[10px] text-slate-400">
                        Room: {card.roomId}{card.bedId ? ` / Bed: ${card.bedId}` : ""}
                      </p>
                    )}
                    {card.doctor && (
                      <p className="mt-0.5 text-[10px] text-slate-400">Dr. {card.doctor}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
