import { useEffect, useState, useMemo, Fragment } from "react";
import { admissionService, surgeryService } from "../../../services/core-modules/hospitalApi";
import { patientService } from "../../../services/core-modules/patientApi";
import { roomService } from "../../../services/core-modules/roomApi";
import { staffService } from "../../../services/core-modules/staffApi";

const STAGES = [
  { id: "admitted", label: "Admitted", color: "bg-blue-500" },
  { id: "scheduled", label: "Scheduled Surgery", color: "bg-purple-400" },
  { id: "in-surgery", label: "In Surgery", color: "bg-amber-500" },
  { id: "in-recovery", label: "In Recovery", color: "bg-teal-500" },
  { id: "discharged", label: "Discharged", color: "bg-slate-400" },
];

export default function PatientWorkflow() {
  const [view, setView] = useState("pipeline");
  const [admissions, setAdmissions] = useState([]);
  const [surgeries, setSurgeries] = useState([]);
  const [patients, setPatients] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    Promise.all([
      admissionService.getAllAdmissionsWithPatient(),
      surgeryService.getAllSurgeries(),
      patientService.getAllPatients(),
      roomService.getAllRooms(),
      staffService.getAllStaff(),
    ])
      .then(([admRes, surgRes, patRes, roomRes, staffRes]) => {
        setAdmissions(admRes.data || []);
        setSurgeries(surgRes.data || []);
        setPatients(patRes.data || []);
        setRooms(roomRes.data || []);
        setStaff(staffRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const patientMap = useMemo(() => {
    const map = {};
    for (const p of patients) map[p.ellyId || p._id] = p;
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

  const staffMap = useMemo(() => {
    const map = {};
    for (const s of staff) map[s.ellyId || s._id] = s;
    return map;
  }, [staff]);

  const availableRooms = useMemo(
    () => rooms.filter((r) => r.status === "AVAILABLE"),
    [rooms]
  );

  const doctors = useMemo(
    () => staff.filter((s) => s.role?.toUpperCase() === "DOCTOR"),
    [staff]
  );

  const nurses = useMemo(
    () => staff.filter((s) => s.role?.toUpperCase() === "NURSE"),
    [staff]
  );

  const pipeline = useMemo(() => {
    const surgeryByPatient = {};
    for (const s of surgeries) {
      if (!surgeryByPatient[s.patientId]) surgeryByPatient[s.patientId] = [];
      surgeryByPatient[s.patientId].push(s);
    }

    const admittedPatientIds = new Set();

    const buckets = { admitted: [], scheduled: [], "in-surgery": [], "in-recovery": [], discharged: [] };

    for (const a of admissions) {
      const patientSurgeries = surgeryByPatient[a.patientId] || [];
      const activeSurgery = patientSurgeries.find((s) => s.status === "IN_PROGRESS");
      const hasScheduledSurgery = patientSurgeries.some((s) => s.status === "SCHEDULED");
      const completedSurgery = patientSurgeries.find((s) => s.status === "COMPLETED" && s.recoveryRoom);

      const card = {
        _id: a._id,
        patientId: a.patientId,
        patientName: patientMap[a.patientId]?.fullName || a.patientId,
        patient: patientMap[a.patientId] || null,
        admission: a,
        surgeries: patientSurgeries,
        sourceAdmission: a,
      };

      admittedPatientIds.add(a.patientId);

      if (a.currentStatus === "DISCHARGED") {
        buckets.discharged.push(card);
      } else if (activeSurgery) {
        card.activeSurgery = activeSurgery;
        buckets["in-surgery"].push(card);
      } else if (completedSurgery) {
        card.completedSurgery = completedSurgery;
        buckets["in-recovery"].push(card);
      } else if (hasScheduledSurgery) {
        buckets.scheduled.push(card);
      } else {
        buckets.admitted.push(card);
      }
    }

    for (const s of surgeries) {
      if (admittedPatientIds.has(s.patientId)) continue;

      const card = {
        _id: s._id,
        patientId: s.patientId,
        patientName: patientMap[s.patientId]?.fullName || s.patientId,
        patient: patientMap[s.patientId] || null,
        admission: null,
        surgeries: [s],
        activeSurgery: s.status === "IN_PROGRESS" ? s : null,
        completedSurgery: s.status === "COMPLETED" && s.recoveryRoom ? s : null,
        sourceSurgery: s,
      };

      if (s.status === "IN_PROGRESS") {
        buckets["in-surgery"].push(card);
      } else if (s.status === "SCHEDULED") {
        buckets["scheduled"].push(card);
      } else if (s.status === "COMPLETED" && s.recoveryRoom) {
        buckets["in-recovery"].push(card);
      }
    }

    return buckets;
  }, [admissions, surgeries, patientMap]);

  const showFeedback = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const assignAdmissionRoom = async (admissionId, roomId, bedId) => {
    try {
      await admissionService.assignAdmission(admissionId, { roomId, bedId });
      const [admRes] = await Promise.all([admissionService.getAllAdmissionsWithPatient()]);
      setAdmissions(admRes.data || []);
      showFeedback("success", `Patient assigned to room ${roomId} successfully`);
    } catch (error) {
      showFeedback("error", `Failed to assign room: ${error.message}`);
    }
  };

  const assignSurgeryRoom = async (surgeryId, operatingRoom, recoveryRoom) => {
    try {
      await surgeryService.updateSurgery(surgeryId, { operatingRoom, recoveryRoom });
      const [surgRes] = await Promise.all([surgeryService.getAllSurgeries()]);
      setSurgeries(surgRes.data || []);
      showFeedback("success", `Surgery rooms assigned (Op: ${operatingRoom || '-'}, Recovery: ${recoveryRoom || '-'})`);
    } catch (error) {
      showFeedback("error", `Failed to assign surgery rooms: ${error.message}`);
    }
  };

  const assignStaff = async (admissionId, doctorId, nurseId) => {
    try {
      const doctor = doctors.find((d) => (d.ellyId || d._id) === doctorId);
      const data = {
        doctor: doctorId,
        assignedNurseIds: nurseId ? [nurseId] : [],
      };
      if (doctor?.departmentId) {
        data.ellyDepartmentId = doctor.departmentId;
      }
      await admissionService.assignAdmission(admissionId, data);
      const [admRes] = await Promise.all([admissionService.getAllAdmissionsWithPatient()]);
      setAdmissions(admRes.data || []);
    } catch (error) {
      alert(error.message);
    }
  };

  const reloadAll = async () => {
    const [admRes, surgRes, roomRes] = await Promise.all([
      admissionService.getAllAdmissionsWithPatient(),
      surgeryService.getAllSurgeries(),
      roomService.getAllRooms(),
    ]);
    setAdmissions(admRes.data || []);
    setSurgeries(surgRes.data || []);
    setRooms(roomRes.data || []);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Patient Workflow and Room Assignment</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {view === "pipeline" ? "Track patients through admission, surgery, recovery, and discharge and assign rooms" : "Assign doctors and nurses to active admissions"}
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800">
          <button
            onClick={() => setView("pipeline")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${view === "pipeline" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
          >
            Pipeline
          </button>
          <button
            onClick={() => setView("staff")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${view === "staff" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
          >
            Staff Assignment
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {view === "pipeline" ? (
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <div key={stage.id} className="flex w-72 min-w-[18rem] flex-col rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
              <div className={`flex items-center gap-2 rounded-t-xl px-4 py-3 ${stage.color}`}>
                <span className="text-sm font-bold text-white">{stage.label}</span>
                <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">
                  {pipeline[stage.id].length}
                </span>
              </div>
              <div className="flex flex-col gap-2 p-3 overflow-y-auto max-h-[calc(100vh-22rem)]">
                {pipeline[stage.id].length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">No patients</p>
                ) : (
                  pipeline[stage.id].map((card) => (
                    <Fragment key={card._id}>
                      <button
                        onClick={() => setExpanded(expanded === card._id ? null : card._id)}
                        className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                      >
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {card.patientName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {card.patientId}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {card.admission?.roomId && roomMap[card.admission.roomId] && (
                            <span className="inline-flex items-center gap-1 rounded bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                              {roomMap[card.admission.roomId]?.roomNumber?.trim()}{card.admission.bedId ? ` · ${card.admission.bedId}` : ''}
                            </span>
                          )}
                          {card.admission?.roomId && !roomMap[card.admission.roomId] && (
                            <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
                              Unassigned · Assign a room
                            </span>
                          )}
                          {card.admission?.department?.name && (
                            <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              {card.admission.department.name}
                            </span>
                          )}
                          {card.activeSurgery && (
                            <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              {card.activeSurgery.procedureName}
                            </span>
                          )}
                        </div>
                      </button>

                      {expanded === card._id && (
                        <RoomAssignmentCard
                          card={card}
                          roomMap={roomMap}
                          staffMap={staffMap}
                          availableRooms={availableRooms}
                          onAssignAdmissionRoom={assignAdmissionRoom}
                          onAssignSurgeryRoom={assignSurgeryRoom}
                        />
                      )}
                    </Fragment>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <StaffAssignmentPanel
          admissions={admissions}
          doctors={doctors}
          nurses={nurses}
          onAssignStaff={assignStaff}
          setMessage={setMessage}
        />
      )}
    </div>
  );
}

function StaffAssignmentPanel({ admissions, doctors, nurses, onAssignStaff, setMessage }) {
  const [saving, setSaving] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const pendingAdmissions = useMemo(() => {
    const active = admissions.filter((a) => a.currentStatus !== "DISCHARGED");
    if (!searchQuery.trim()) return active;
    const q = searchQuery.toLowerCase();
    return active.filter((a) => {
      const patientName = (a.patient?.fullName || a.patientId || "").toLowerCase();
      const patientId = (a.patient?.ellyId || a.patientId || "").toLowerCase();
      const doctor = doctors.find((d) => (d.ellyId || d._id) === (a.doctor?.id || a.assignedDoctorId));
      const doctorName = doctor?.fullName?.toLowerCase() || "";
      const doctorId = (doctor?.ellyId || doctor?._id || "").toLowerCase();
      const nurseIds = a.assignedNurseIds || [];
      const nurseNames = nurses
        .filter((n) => nurseIds.includes(n.ellyId || n._id))
        .map((n) => n.fullName?.toLowerCase())
        .join(" ");
      return patientName.includes(q) || patientId.includes(q) || doctorName.includes(q) || doctorId.includes(q) || nurseNames.includes(q);
    });
  }, [admissions, searchQuery]);

  const handleAssign = async (admission, doctorId, nurseId) => {
    setSaving(admission._id);
    try {
      await onAssignStaff(admission._id, doctorId, nurseId);
      setMessage({ type: "success", text: `Assigned for ${admission.doctor?.name || admission.patientId}` });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto space-y-4">
      <div className="sticky top-0 z-10 pb-4">
        <div className="flex border border-slate-200 bg-white shadow-sm transition-all focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800">
          <input
            type="text"
            placeholder="Search by patient name, ID, doctor, or nurse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder-slate-500"
          />
          <div className="flex items-center border-l border-slate-200 px-3 text-slate-400 dark:border-slate-700 dark:text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      {pendingAdmissions.map((a) => {
        const patient = a.patient || {};
        const currentDoctor = doctors.find((d) => (d.ellyId || d._id) === (a.doctor?.id || a.assignedDoctorId));
        const currentNurseId = a.assignedNurseIds?.[0];
        const currentNurse = nurses.find((n) => (n.ellyId || n._id) === currentNurseId);

        return (
          <AdmissionStaffCard
            key={a._id}
            admission={a}
            patient={patient}
            doctors={doctors}
            nurses={nurses}
            currentDoctor={currentDoctor}
            currentNurse={currentNurse}
            saving={saving === a._id}
            onAssign={(doctorId, nurseId) => handleAssign(a, doctorId, nurseId)}
          />
        );
      })}
      {pendingAdmissions.length === 0 && (
        <p className="py-12 text-center text-sm text-slate-400">No active admissions</p>
      )}
    </div>
  );
}

function AdmissionStaffCard({ admission, patient, doctors, nurses, currentDoctor, currentNurse, saving, onAssign }) {
  const [selectedDoctor, setSelectedDoctor] = useState(currentDoctor ? (currentDoctor.ellyId || currentDoctor._id) : "");
  const [selectedNurse, setSelectedNurse] = useState(currentNurse ? (currentNurse.ellyId || currentNurse._id) : "");

  const filteredNurses = useMemo(() => {
    const doctor = doctors.find((d) => (d.ellyId || d._id) === selectedDoctor);
    if (!doctor?.departmentId) return nurses;
    return nurses.filter((n) => n.departmentId === doctor.departmentId);
  }, [selectedDoctor, doctors, nurses]);

  useEffect(() => {
    if (currentDoctor) setSelectedDoctor(currentDoctor.ellyId || currentDoctor._id);
    if (currentNurse) setSelectedNurse(currentNurse.ellyId || currentNurse._id);
  }, [currentDoctor, currentNurse]);

  const doctor = doctors.find((d) => (d.ellyId || d._id) === selectedDoctor);

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {patient.fullName || admission.patientId}
          </h3>
          <p className="text-xs text-slate-500">{admission.admissionReason || ""}</p>
        </div>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          {admission.currentStatus}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Doctor</label>
          <select
            value={selectedDoctor}
            onChange={(e) => { setSelectedDoctor(e.target.value); setSelectedNurse(""); }}
            className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Select doctor</option>
            {doctors.map((d) => (
              <option key={d.ellyId || d._id} value={d.ellyId || d._id}>
                {d.fullName} {d.specialization ? `(${d.specialization})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Nurse</label>
          <select
            value={selectedNurse}
            onChange={(e) => setSelectedNurse(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Select nurse</option>
            {filteredNurses.map((n) => (
              <option key={n.ellyId || n._id} value={n.ellyId || n._id}>
                {n.fullName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col justify-end">
          {doctor?.departmentId && (
            <p className="mb-2 text-xs text-slate-500">
              Department ID: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{doctor.departmentId}</span>
            </p>
          )}
          <button
            onClick={() => onAssign(selectedDoctor, selectedNurse)}
            disabled={!selectedDoctor || saving}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoomAssignmentCard({ card, roomMap, staffMap, availableRooms, onAssignAdmissionRoom, onAssignSurgeryRoom }) {
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedBedId, setSelectedBedId] = useState("");
  const [selectedOpRoom, setSelectedOpRoom] = useState("");
  const [selectedRecoveryRoom, setSelectedRecoveryRoom] = useState("");

  const currentRoom = card.admission
    ? roomMap[card.admission.roomId] || null
    : null;

  const selectedRoom = roomMap[selectedRoomId] || null;
  const roomFull = selectedRoom && selectedRoom.occupiedBeds >= selectedRoom.capacity;

  useEffect(() => {
    if (selectedRoom) {
      const nextNum = (selectedRoom.occupiedBeds || 0) + 1;
      const prefix = ((selectedRoom.roomNumber || selectedRoom.ellyId || 'BED').trim()).replace(/\s+/g, '-');
      setSelectedBedId(`${prefix}-BED-${String(nextNum).padStart(2, '0')}`);
    } else {
      setSelectedBedId('');
    }
  }, [selectedRoomId]);

  const surgeryOpRoom = card.activeSurgery || card.completedSurgery;
  const currentOpRoom = surgeryOpRoom
    ? roomMap[surgeryOpRoom.operatingRoom] || null
    : null;
  const currentRecoveryRoom = surgeryOpRoom
    ? roomMap[surgeryOpRoom.recoveryRoom] || null
    : null;

  const handleAssignAdmissionRoom = () => {
    if (!selectedRoomId) return;
    onAssignAdmissionRoom(card.admission._id, selectedRoomId, selectedBedId || undefined);
  };

  const handleAssignSurgeryRoom = () => {
    if (!selectedOpRoom && !selectedRecoveryRoom) return;
    onAssignSurgeryRoom(
      surgeryOpRoom._id,
      selectedOpRoom || undefined,
      selectedRecoveryRoom || undefined
    );
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-800">
      {card.admission && (
        <>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Admission</p>
          <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
            <p>Room: {currentRoom ? currentRoom.roomNumber?.trim() : <span className="text-red-500">Unassigned</span>}</p>
            <p>Bed: {card.admission.bedId || "-"}</p>
            <p>Doctor: {card.admission.doctor?.name || card.admission.doctor?.id || "-"}</p>
            <p>Nurse: {card.admission.assignedNurseIds?.map((id) => staffMap[id]?.fullName || id).join(", ") || "-"}</p>
            <p>Status: {card.admission.currentStatus}</p>
          </div>
          {card.admission.currentStatus !== "DISCHARGED" && (
            <div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-700">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {currentRoom ? 'Move to Another Room' : 'Assign Room'}
              </p>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="mb-1 w-full rounded border border-slate-300 bg-white p-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                <option value="">-- Select Room --</option>
                {availableRooms
                  .filter((r) => !currentRoom || (r.ellyId !== currentRoom.ellyId && r.roomNumber !== currentRoom.roomNumber))
                  .map((r) => (
                  <option key={r._id} value={r.ellyId || r._id}>
                    {r.roomNumber} ({r.roomType}) — {r.occupiedBeds}/{r.capacity}
                  </option>
                ))}
              </select>
              <div className="mb-1.5 flex items-center gap-1.5">
                <input
                  value={selectedBedId}
                  readOnly
                  placeholder="Auto-assigned bed ID"
                  className="flex-1 rounded border border-slate-300 bg-slate-50 p-1.5 text-xs text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400"
                />
                <span className="text-[10px] text-slate-400">auto</span>
              </div>
              {roomFull && (
                <p className="mb-1.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                  Room full — move a patient out first
                </p>
              )}
              <button
                onClick={handleAssignAdmissionRoom}
                disabled={!selectedRoomId || roomFull}
                className="w-full rounded bg-violet-600 px-2 py-1 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {currentRoom ? 'Move Room' : 'Assign Room'}
              </button>
            </div>
          )}
        </>
      )}

      {!card.admission && (
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">No admission record</p>
      )}

      {(card.activeSurgery || card.completedSurgery) && (
        <>
          <p className="mb-2 mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Surgery</p>
          <div className="space-y-1 text-slate-700 dark:text-slate-300">
            <p>Procedure: {surgeryOpRoom.procedureName}</p>
            <p>Surgeon: {staffMap[surgeryOpRoom.primarySurgeonId]?.fullName || surgeryOpRoom.primarySurgeonId || "-"}</p>
            <p>Nurses: {surgeryOpRoom.nurseIds?.map((id) => staffMap[id]?.fullName || id).join(", ") || "-"}</p>
            <p>Op. Room: {currentOpRoom?.roomNumber || surgeryOpRoom.operatingRoom || "-"}</p>
            <p>Recovery: {currentRecoveryRoom?.roomNumber || surgeryOpRoom.recoveryRoom || "-"}</p>
          </div>
          <div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-700">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Assign Surgery Rooms</p>
            <select
              value={selectedOpRoom}
              onChange={(e) => setSelectedOpRoom(e.target.value)}
              className="mb-1 w-full rounded border border-slate-300 bg-white p-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="">-- Operating Room --</option>
              {availableRooms.filter((r) => r.roomType === "SURGERY").map((r) => (
                <option key={r._id} value={r.ellyId || r._id}>
                  {r.roomNumber} ({r.occupiedBeds}/{r.capacity})
                </option>
              ))}
            </select>
            <select
              value={selectedRecoveryRoom}
              onChange={(e) => setSelectedRecoveryRoom(e.target.value)}
              className="mb-1.5 w-full rounded border border-slate-300 bg-white p-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="">-- Recovery Room --</option>
              {availableRooms.map((r) => (
                <option key={r._id} value={r.ellyId || r._id}>
                  {r.roomNumber} ({r.roomType}) — {r.occupiedBeds}/{r.capacity}
                </option>
              ))}
            </select>
            <button
              onClick={handleAssignSurgeryRoom}
              className="w-full rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700"
            >
              Assign Rooms
            </button>
          </div>
        </>
      )}

      {card.surgeries?.length > 0 && !card.activeSurgery && !card.completedSurgery && (
        <>
          <p className="mb-2 mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Surgery History</p>
          <div className="space-y-1 text-slate-700 dark:text-slate-300">
            {card.surgeries.map((s) => (
              <p key={s._id}>{s.procedureName} — {s.status}</p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
