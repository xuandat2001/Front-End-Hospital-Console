import { useEffect, useState, useMemo, useCallback } from 'react';
import { roomService } from '../../../services/core-modules/roomApi';
import { admissionService, surgeryService } from '../../../services/core-modules/hospitalApi';
import { patientService } from '../../../services/core-modules/patientApi';

const STATUS_COLORS = {
  ADMITTED: 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20',
  UNDER_TREATMENT: 'border-red-400 bg-red-50 dark:bg-red-900/20',
  PENDING: 'border-amber-400 bg-amber-50 dark:bg-amber-900/20',
  TRANSFERRED: 'border-purple-400 bg-purple-50 dark:bg-purple-900/20',
  DISCHARGED: 'border-green-400 bg-green-50 dark:bg-green-900/20',
};

function durationSince(date) {
  if (!date) return '';
  const ms = Date.now() - new Date(date).getTime();
  if (ms < 0) return 'Just now';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  if (hrs < 24) return `${hrs}h ${remainMins}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

export default function WardPlanning() {
  const [rooms, setRooms] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [surgeries, setSurgeries] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedAdmission, setDraggedAdmission] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRooms, setExpandedRooms] = useState({});
  const PATIENTS_PER_ROOM = 2;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [roomRes, admRes, surgRes, patRes] = await Promise.all([
        roomService.getAllRooms(),
        admissionService.getAllAdmissionsWithPatient(),
        surgeryService.getAllSurgeries(),
        patientService.getAllPatients(),
      ]);
      setRooms(roomRes.data || []);
      setAdmissions(admRes.data || []);
      setSurgeries(surgRes.data || []);
      setPatients(patRes.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const patientMap = useMemo(() => {
    const map = {};
    for (const p of patients) {
      map[p.ellyId || p._id] = p;
    }
    return map;
  }, [patients]);

  const activeSurgeries = useMemo(
    () => surgeries.filter((s) => s.status === "IN_PROGRESS" || s.status === "SCHEDULED"),
    [surgeries]
  );

  const activeAdmissions = useMemo(
    () => admissions.filter((a) => a.currentStatus !== "DISCHARGED"),
    [admissions]
  );

  const roomAdmissionMap = useMemo(() => {
    const map = {};
    for (const a of activeAdmissions) {
      const keys = [a.roomId, a.roomNumber].filter(Boolean);
      for (const k of keys) {
        if (!map[k]) map[k] = [];
        map[k].push(a);
      }
    }
    return map;
  }, [activeAdmissions]);

  const surgeryRoomMap = useMemo(() => {
    const map = {};
    for (const s of activeSurgeries) {
      if (s.operatingRoom) {
        if (!map[s.operatingRoom]) map[s.operatingRoom] = [];
        map[s.operatingRoom].push({ ...s, _sourceLabel: "Operating" });
      }
      if (s.recoveryRoom && s.status === "IN_PROGRESS") {
        if (!map[s.recoveryRoom]) map[s.recoveryRoom] = [];
        map[s.recoveryRoom].push({ ...s, _sourceLabel: "Recovery" });
      }
    }
    return map;
  }, [activeSurgeries]);

  const handleDragStart = (e, admission, fromRoom) => {
    setDraggedAdmission({ admission, fromRoom });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', admission._id);
  };

  const handleDragOver = (e, room) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setMoveTarget(room._id);
  };

  const handleDragLeave = () => {
    setMoveTarget(null);
  };

  const handleDragEnd = () => {
    setMoveTarget(null);
    setDraggedAdmission(null);
  };

  const handleRoomChange = async (admissionId, toRoom) => {
    try {
      const nextNum = (toRoom.occupiedBeds || 0) + 1;
      const prefix = ((toRoom.roomNumber || toRoom.ellyId || 'BED').trim()).replace(/\s+/g, '-');
      await admissionService.updateAdmission(admissionId, {
        roomId: toRoom.roomNumber || toRoom.ellyId,
        bedId: `${prefix}-BED-${String(nextNum).padStart(2, '0')}`,
      });
      await loadData();
    } catch (error) {
      console.error('Room change failed:', error);
    }
  };

  const handleDrop = async (e, toRoom) => {
    e.preventDefault();
    setMoveTarget(null);
    if (!draggedAdmission) return;

    const { admission } = draggedAdmission;
    if (admission.roomId === toRoom.roomNumber || admission.roomId === toRoom.ellyId) {
      setDraggedAdmission(null);
      return;
    }

    try {
      const nextNum = (toRoom.occupiedBeds || 0) + 1;
      const prefix = ((toRoom.roomNumber || toRoom.ellyId || 'BED').trim()).replace(/\s+/g, '-');
      await admissionService.updateAdmission(admission._id, {
        roomId: toRoom.roomNumber || toRoom.ellyId,
        bedId: `${prefix}-BED-${String(nextNum).padStart(2, '0')}`,
      });
      await loadData();
    } catch (error) {
      console.error('Move failed:', error);
    }
    setDraggedAdmission(null);
  };

  const totalBeds = rooms.reduce((sum, r) => sum + r.capacity, 0);
  const occupiedBeds = rooms.reduce((sum, r) => sum + r.occupiedBeds, 0);
  const availableBeds = totalBeds - occupiedBeds;
  const surgeryRooms = rooms.filter((r) => r.roomType === "SURGERY");
  const totalSurgeryBeds = surgeryRooms.reduce((sum, r) => sum + r.capacity, 0);
  const occupiedSurgeryBeds = surgeryRooms.reduce((sum, r) => sum + r.occupiedBeds, 0);

  const floors = useMemo(() => {
    const f = {};
    for (const r of rooms) {
      const fl = r.floor || 'Unknown';
      if (!f[fl]) f[fl] = [];
      f[fl].push(r);
    }
    return Object.entries(f).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  }, [rooms]);

  const floorChunks = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < floors.length; i += 3) {
      chunks.push(floors.slice(i, i + 3));
    }
    return chunks;
  }, [floors]);

  if (loading) {
    return <div className="flex h-full items-center justify-center p-12"><div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" /></div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black dark:text-white">Ward Planning</h1>
        <p className="text-sm text-slate-500">Visual ward layout — drag patients between rooms to move them</p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search patient by name, ID, doctor, or department..."
          className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Total Beds</p>
          <p className="text-3xl font-bold text-black dark:text-white">{totalBeds}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Occupied</p>
          <p className="text-3xl font-bold text-red-600">{occupiedBeds}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Available</p>
          <p className="text-3xl font-bold text-green-600">{availableBeds}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Surgery Beds</p>
          <p className="text-3xl font-bold text-purple-600">{occupiedSurgeryBeds}/{totalSurgeryBeds}</p>
        </div>
      </div>

      <div className="space-y-6">
        {floorChunks.map((chunk, ci) => (
          <div key={ci} className="flex gap-6" style={{ alignItems: 'flex-start' }}>
            {chunk.map(([floor, floorRooms]) => (
              <div key={floor} className="min-w-0 flex-1">
                <h2 className="mb-3 text-lg font-bold text-slate-800 dark:text-slate-200">
                  Floor {floor}
                </h2>
                <div className="space-y-3">
              {floorRooms.map((room) => {
                const pct = room.capacity > 0 ? Math.round((room.occupiedBeds / room.capacity) * 100) : 0;
                const roomSurgeries = surgeryRoomMap[room.roomNumber] || surgeryRoomMap[room.ellyId] || [];
                const roomPatients = roomAdmissionMap[room.roomNumber] || roomAdmissionMap[room.ellyId] || [];
                const hasPatients = roomSurgeries.length > 0 || roomPatients.length > 0;
                const isDragOver = moveTarget === room._id;
                const bedLabel = room.roomType === 'SURGERY' ? 'Tables' : 'Beds';

                return (
                  <div
                    key={room._id}
                    className={`rounded-xl border-2 bg-white p-4 shadow-sm transition-all dark:bg-slate-900 ${
                      isDragOver
                        ? 'border-violet-500 shadow-lg shadow-violet-200 dark:shadow-violet-900/30'
                        : hasPatients
                        ? 'border-slate-200 dark:border-slate-700'
                        : 'border-dashed border-slate-300 dark:border-slate-600'
                    }`}
                    onDragOver={(e) => handleDragOver(e, room)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, room)}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{room.roomNumber?.trim()}</p>
                        <p className="text-xs text-slate-500">{room.roomType} · {room.ellyId?.trim()}</p>
                      </div>
                      <div className="text-right">
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          room.status === 'AVAILABLE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                          room.status === 'FULL' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {room.status}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className={`h-2 rounded-full ${pct >= 100 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {room.occupiedBeds}/{room.capacity} {bedLabel}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(() => {
                        const surgeryPatientIds = new Set(roomSurgeries.map((s) => s.patientId));
                        const filteredSurgeries = roomSurgeries.filter((s) => {
                          const matchedAdmission = roomPatients.find((a) => a.patientId === s.patientId);
                          return !matchedAdmission;
                        });

                        const matchesSearch = (a) => {
                          if (!searchQuery.trim()) return true;
                          const q = searchQuery.toLowerCase();
                          const doctorLabel = a.doctor?.name
                            ? `${a.doctor.name} (${a.doctor.id})`
                            : a.doctor?.id || a.assignedDoctorId || '';
                          const deptLabel = a.department?.name || a.department?.id || a.ellyDepartmentId || '';
                          return (
                            (a.patient?.fullName || '').toLowerCase().includes(q) ||
                            (a.patientId || '').toLowerCase().includes(q) ||
                            doctorLabel.toLowerCase().includes(q) ||
                            deptLabel.toLowerCase().includes(q)
                          );
                        };

                        const matchesSurgerySearch = (s) => {
                          if (!searchQuery.trim()) return true;
                          const q = searchQuery.toLowerCase();
                          const surgeryPatient = patientMap[s.patientId];
                          return (
                            (surgeryPatient?.fullName || s.patientId || '').toLowerCase().includes(q) ||
                            (s.procedureName || '').toLowerCase().includes(q)
                          );
                        };

                        const filteredPatients = roomPatients.filter(matchesSearch);
                        const filteredSurg = filteredSurgeries.filter(matchesSurgerySearch);
                        const totalVisible = filteredPatients.length + filteredSurg.length;

                        const roomKey = room._id;
                        const isExpanded = expandedRooms[roomKey];
                        const showLimit = !isExpanded && totalVisible > PATIENTS_PER_ROOM;
                        const displayPatients = showLimit
                          ? filteredPatients.slice(0, PATIENTS_PER_ROOM)
                          : filteredPatients;
                        const remainingSlots = showLimit
                          ? Math.max(0, PATIENTS_PER_ROOM - displayPatients.length)
                          : Infinity;
                        const displaySurgeries = showLimit
                          ? filteredSurg.slice(0, remainingSlots)
                          : filteredSurg;

                        return (
                          <>
                            {displayPatients.map((a) => {
                              const borderColor = STATUS_COLORS[a.currentStatus] || 'border-slate-300';
                              const doctorLabel = a.doctor?.name
                                ? `${a.doctor.name} (${a.doctor.id})`
                                : a.doctor?.id || a.assignedDoctorId || '-';
                              const matchingSurgery = roomSurgeries.find((s) => s.patientId === a.patientId);
                              return (
                                <div
                                  key={a._id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, a, room)}
                                  onDragEnd={handleDragEnd}
                                  className={`cursor-grab rounded-lg border-l-4 p-3 text-xs active:cursor-grabbing ${borderColor}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                                      {a.patient?.fullName || a.patientId}
                                    </p>
                                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                      {durationSince(a.admittedAt)}
                                    </span>
                                  </div>
                                  {matchingSurgery && (
                                    <span className="mb-1 inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                                      {matchingSurgery.status === 'SCHEDULED' ? 'Upcoming Surgery' : 'In Surgery'} · {matchingSurgery.procedureName}
                                    </span>
                                  )}
                                  <p className="mt-0.5 text-slate-500">
                                    {a.department?.name || a.department?.id || a.ellyDepartmentId || '-'}
                                  </p>
                                  <p className="text-slate-500">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">Dr:</span> {doctorLabel}
                                  </p>
                                  <p className="text-slate-400">
                                    Bed {a.bedId || '-'} · {a.currentStatus}
                                  </p>
                                  <div className="mt-1.5 flex items-center gap-1">
                                    <span className="text-[10px] font-medium text-slate-400">Move to:</span>
                                    <select
                                      value=""
                                      onChange={(e) => {
                                        const target = rooms.find(
                                          (r) => (r.roomNumber || r.ellyId) === e.target.value
                                        );
                                        if (target) handleRoomChange(a._id, target);
                                      }}
                                      className="h-5 flex-1 rounded border border-slate-200 bg-white px-1 text-[10px] text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                    >
                                      <option value="" disabled>Room...</option>
                                      {rooms
                                        .filter((r) => r.roomNumber !== room.roomNumber || r.ellyId !== room.ellyId)
                                        .map((r) => (
                                          <option key={r._id} value={r.roomNumber || r.ellyId}>
                                            {r.roomNumber} ({r.occupiedBeds}/{r.capacity})
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                </div>
                              );
                            })}

                            {displaySurgeries.map((s) => {
                              const surgeryPatient = patientMap[s.patientId];
                              return (
                              <div
                                key={s._id}
                                className="cursor-default rounded-lg border-l-4 border-purple-400 bg-purple-50 p-3 text-xs dark:bg-purple-900/20"
                              >
                                <p className="font-semibold text-purple-900 dark:text-purple-300">
                                  {surgeryPatient?.fullName || s.patientId}
                                </p>
                                <p className="mt-0.5 text-purple-700 dark:text-purple-400">
                                  {s.procedureName} · {s._sourceLabel || s.status}
                                </p>
                              </div>
                              );
                            })}
                            {!hasPatients && !searchQuery.trim() && (
                              <p className="py-2 text-center text-xs text-slate-400">
                                {room.roomType === 'SURGERY' ? 'No surgeries scheduled' : 'No patients'}
                              </p>
                            )}
                            {hasPatients && totalVisible === 0 && searchQuery.trim() && (
                              <p className="py-2 text-center text-xs text-slate-400">No matching patients</p>
                            )}
                            {showLimit && (
                              <button
                                onClick={() => setExpandedRooms((prev) => ({ ...prev, [roomKey]: true }))}
                                className="w-full rounded border border-slate-200 py-1 text-xs font-medium text-violet-600 hover:bg-slate-50 dark:border-slate-700 dark:text-violet-400 dark:hover:bg-slate-800"
                              >
                                See more ({totalVisible - PATIENTS_PER_ROOM} more)
                              </button>
                            )}
                            {isExpanded && (
                              <button
                                onClick={() => setExpandedRooms((prev) => ({ ...prev, [roomKey]: false }))}
                                className="w-full rounded border border-slate-200 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                              >
                                Show less
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          ))}
          </div>
        ))}
      </div>
    </div>
  );
}
