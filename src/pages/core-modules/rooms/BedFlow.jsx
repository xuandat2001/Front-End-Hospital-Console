import { useEffect, useState, useMemo, Fragment } from 'react';
import { roomService } from '../../../services/core-modules/roomApi';
import { admissionService } from '../../../services/core-modules/hospitalApi';

export default function BedFlow() {
  const [rooms, setRooms] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedWard, setExpandedWard] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [roomRes, admRes] = await Promise.all([
        roomService.getAllRooms(),
        admissionService.getAllAdmissionsWithPatient(),
      ]);
      setRooms(roomRes.data || []);
      setAdmissions(admRes.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeAdmissions = useMemo(
    () => admissions.filter((a) => a.currentStatus !== "DISCHARGED"),
    [admissions]
  );

  const roomAdmissionMap = useMemo(() => {
    const map = {};
    for (const a of activeAdmissions) {
      const key = a.roomId || a._id;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    return map;
  }, [activeAdmissions]);

  const roomOccupancy = useMemo(() => {
    const occ = {};
    for (const a of activeAdmissions) {
      const key = a.roomId || a._id;
      occ[key] = (occ[key] || 0) + 1;
    }
    return occ;
  }, [activeAdmissions]);

  const totalBeds = rooms.reduce((sum, r) => sum + r.capacity, 0);
  const occupiedBeds = rooms.reduce((sum, r) => sum + (roomOccupancy[r.roomNumber] || roomOccupancy[r.ellyId] || 0), 0);
  const availableBeds = totalBeds - occupiedBeds;

  return (
    <div className="p-6">
      <div className="mb-6 text-black">
        <h1 className="text-2xl font-bold">Bed Flow</h1>
        <p className="text-sm text-slate-500">Track bed availability and occupancy based on active admissions</p>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Total Beds</p>
          <p className="text-3xl font-bold text-black">{totalBeds}</p>
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
          <p className="text-sm text-slate-500">Active Admissions</p>
          <p className="text-3xl font-bold text-purple-600">{activeAdmissions.length}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="p-4 text-left">Ward</th>
              <th className="p-4 text-left">Type</th>
              <th className="p-4 text-left">Floor</th>
              <th className="p-4 text-left">Occupancy</th>
              <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Current Patients</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              rooms.map((room) => {
                const occBeds = roomOccupancy[room.roomNumber] || roomOccupancy[room.ellyId] || 0;
                const pct = room.capacity > 0 ? Math.round((occBeds / room.capacity) * 100) : 0;
                const roomAdmissions = roomAdmissionMap[room.roomNumber] || roomAdmissionMap[room.ellyId] || [];
                const hasPatients = roomAdmissions.length > 0;
                return (
                  <Fragment key={room._id}>
                  <tr className="cursor-pointer border-t border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50" onClick={() => setExpandedWard(expandedWard === room._id ? null : room._id)}>
                    <td className="p-4">
                      <div className="font-medium">{room.roomNumber}</div>
                      <div className="text-xs text-slate-500">{room.ellyId}</div>
                    </td>
                    <td className="p-4">{room.roomType}</td>
                    <td className="p-4">{room.floor || '-'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 w-32 rounded-full bg-slate-200">
                          <div
                            className={`h-2.5 rounded-full ${
                              pct >= 100 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm">{occBeds}/{room.capacity}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        room.status === 'AVAILABLE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        room.status === 'FULL' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        {room.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {hasPatients ? (
                        <div className="space-y-1">
                          {roomAdmissions.map((a) => (
                            <div key={a._id} className="rounded bg-blue-50 px-2 py-1 text-xs dark:bg-blue-900/20">
                              <p className="font-medium text-blue-800 dark:text-blue-300">
                                {a.patient?.fullName || a.patientId}
                              </p>
                              <p className="text-blue-600 dark:text-blue-400">
                                {a.department?.name || a.department?.id || a.ellyDepartmentId || "Dept"} · {a.currentStatus} · Bed: {a.bedId || "-"}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                  {expandedWard === room._id && (
                    <tr key={`${room._id}-detail`} className="bg-slate-50 dark:bg-slate-800/30">
                      <td colSpan={6} className="p-4">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Ward Info</p>
                            <div className="space-y-1 text-slate-700 dark:text-slate-300">
                              <p>ID: {room.ellyId}</p>
                              <p>Type: {room.roomType}</p>
                              <p>Floor: {room.floor || "-"}</p>
                              <p>Status: {room.status}</p>
                              <p>Department: {room.departmentId || "-"}</p>
                              <p>Hospital: {room.hospitalId || "-"}</p>
                            </div>
                          </div>
                          <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Bed Occupancy</p>
                            <div className="space-y-1 text-slate-700 dark:text-slate-300">
                              <p>Capacity: {room.capacity}</p>
                              <p>Occupied: {occBeds}</p>
                              <p>Available: {room.capacity - occBeds}</p>
                              <div className="mt-1 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                                <div className={`h-2 rounded-full ${pct >= 100 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Current Patients</p>
                            <div className="space-y-1 text-slate-700 dark:text-slate-300">
                              {roomAdmissions.length > 0 ? (
                                roomAdmissions.map((a) => (
                                  <div key={a._id} className="rounded bg-blue-50 p-2 dark:bg-blue-900/20">
                                    <p className="font-medium text-blue-800 dark:text-blue-300">{a.patient?.fullName || a.patientId}</p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400">{a.department?.name || a.department?.id || a.ellyDepartmentId || "Dept"} · {a.currentStatus} · Bed: {a.bedId || "-"}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-slate-400">No patients assigned</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
