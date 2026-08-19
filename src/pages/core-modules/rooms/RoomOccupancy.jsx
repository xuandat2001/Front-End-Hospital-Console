import { useState } from 'react';
import useRoomOccupancy from '../../../hooks/useRoomOccupancy';

const ROOM_TYPE_LABELS = {
  GENERAL_WARD: 'General Ward',
  PRIVATE: 'Private',
  ICU: 'ICU',
  EMERGENCY: 'Emergency',
  SURGERY: 'Surgery',
};

const ROOM_TYPE_COLORS = {
  GENERAL_WARD: 'from-blue-500 to-blue-600',
  PRIVATE: 'from-purple-500 to-purple-600',
  ICU: 'from-red-500 to-red-600',
  EMERGENCY: 'from-amber-500 to-amber-600',
  SURGERY: 'from-teal-500 to-teal-600',
};

const PATIENTS_PER_ROOM = 3;

export default function RoomOccupancy({ onNavigateToFunction }) {
  const {
    rooms, loading, error, connectionState,
    totalBeds, occupiedBeds, availableBeds, byRoomType, refresh,
  } = useRoomOccupancy();

  const [expandedRoom, setExpandedRoom] = useState(null);
  const [expandedPatients, setExpandedPatients] = useState({});

  const overallPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold dark:text-white">Room & Bed Occupancy</h1>
          <p className="text-[10px] text-slate-500">
            {connectionState === 'connected' ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-green-500">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-500">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Polling
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onNavigateToFunction?.({
                domain: "operations",
                subsection: "admission",
                functionId: "admissions",
                centerTab: "dashboard",
              })
            }
            className="rounded-lg border border-violet-300 px-2.5 py-1 text-[10px] font-medium text-violet-600 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/30"
          >
            View Admission
          </button>
          <button
            onClick={() =>
              onNavigateToFunction?.({
                domain: "operations",
                subsection: "surgery",
                functionId: "surgery-records",
                centerTab: "dashboard",
              })
            }
            className="rounded-lg border border-teal-300 px-2.5 py-1 text-[10px] font-medium text-teal-600 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300 dark:hover:bg-teal-900/30"
          >
            View Surgery
          </button>
          <button
            onClick={refresh}
            className="rounded-lg border border-slate-300 px-2.5 py-1 text-[10px] text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        <SummaryCard label="Total Beds" value={totalBeds} />
        <SummaryCard label="Occupied" value={occupiedBeds} />
        <SummaryCard label="Available" value={availableBeds} />
        <SummaryCard label="Occupancy" value={`${overallPct}%`} />
        <SummaryCard label="Rooms" value={rooms.length} />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-[10px] text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(byRoomType).map(([type, typeRooms]) => (
          <div key={type} className="flex min-w-0 flex-col">
            <h2 className="mb-1.5 flex min-w-0 items-center gap-1.5 text-xs font-semibold dark:text-white">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br ${ROOM_TYPE_COLORS[type] || 'from-slate-400 to-slate-500'}`} />
              <span className="min-w-0 truncate">{ROOM_TYPE_LABELS[type] || type}</span>
              <span className="shrink-0 font-normal text-slate-400">({typeRooms.length} room{typeRooms.length !== 1 ? 's' : ''})</span>
            </h2>
            <div className="flex min-h-0 flex-col gap-1.5 overflow-y-auto pr-1">
              {typeRooms.map((room) => {
                const pct = room.occupancyRate || 0;
                const isExpanded = expandedRoom === room._id;
                return (
                  <div
                    key={room._id}
                    className="flex min-w-0 flex-col rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="mb-1.5 flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-xs font-semibold dark:text-white">{room.roomNumber?.trim()}</h3>
                        <p className="truncate text-[9px] text-slate-400">{room.ellyId?.trim()}</p>
                        {room.floor && <p className="text-[9px] text-slate-400">Floor {room.floor}</p>}
                      </div>
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${
                        room.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                        room.status === 'FULL' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {room.status}
                      </span>
                    </div>

                    <dl className="space-y-0">
                      <div className="flex items-center justify-between gap-3 border-t border-slate-100 py-1.5 dark:border-slate-700">
                        <dt className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">Occupancy</dt>
                        <dd className="truncate text-right text-[9px] font-semibold text-slate-800 dark:text-white">{room.occupiedBeds} / {room.capacity}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-slate-100 py-1.5 dark:border-slate-700">
                        <dt className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">Free</dt>
                        <dd className="truncate text-right text-[9px] font-semibold text-green-600">{room.bedsAvailable}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-slate-100 py-1.5 dark:border-slate-700">
                        <dt className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">Rate</dt>
                        <dd className="truncate text-right text-[9px] font-semibold dark:text-white">{pct}%</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-slate-100 py-1.5 dark:border-slate-700">
                        <dt className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">Patients</dt>
                        <dd className="truncate text-right text-[9px] font-semibold dark:text-white">{room.patients?.length || 0}</dd>
                      </div>
                    </dl>

                    <div className="mb-2 mt-auto">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct >= 100 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {room.patients && room.patients.length > 0 && (() => {
                      const roomKey = room._id;
                      const isPatExpanded = expandedPatients[roomKey];
                      const showLimit = !isPatExpanded && room.patients.length > PATIENTS_PER_ROOM;
                      const displayPats = showLimit ? room.patients.slice(0, PATIENTS_PER_ROOM) : room.patients;
                      return (
                      <>
                        <button
                          onClick={() => {
                            if (showLimit) {
                              setExpandedPatients((prev) => ({ ...prev, [roomKey]: true }));
                            } else if (isPatExpanded) {
                              setExpandedPatients((prev) => ({ ...prev, [roomKey]: false }));
                            } else {
                              setExpandedRoom(isExpanded ? null : room._id);
                            }
                          }}
                          className="mb-1 w-full rounded-md border border-slate-200 py-1 text-[9px] font-medium text-blue-600 hover:bg-slate-50 dark:border-slate-600 dark:text-blue-400 dark:hover:bg-slate-700"
                        >
                          {isPatExpanded ? 'Hide patients' : `View ${room.patients.length} patient${room.patients.length !== 1 ? 's' : ''}`}
                        </button>

                        {(isExpanded || isPatExpanded) && (
                          <div className="mt-1 space-y-1">
                            {displayPats.map((p) => (
                              <div key={p.admissionId} className="rounded-lg bg-slate-50 px-2 py-1.5 text-[9px] dark:bg-slate-700/50">
                                <p className="truncate font-medium dark:text-white">{p.patientName || p.patientId}</p>
                                <p className="text-slate-400">Bed: {p.bedId || '-'} · {p.status}</p>
                              </div>
                            ))}
                            {showLimit && (
                              <button
                                onClick={() => setExpandedPatients((prev) => ({ ...prev, [roomKey]: true }))}
                                className="w-full rounded border border-slate-200 py-1 text-[9px] font-medium text-violet-600 hover:bg-slate-50 dark:border-slate-700 dark:text-violet-400 dark:hover:bg-slate-800"
                              >
                                See more ({room.patients.length - PATIENTS_PER_ROOM} more)
                              </button>
                            )}
                            {isPatExpanded && (
                              <button
                                onClick={() => setExpandedPatients((prev) => ({ ...prev, [roomKey]: false }))}
                                className="w-full rounded border border-slate-200 py-1 text-[9px] font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                              >
                                Show less
                              </button>
                            )}
                          </div>
                        )}
                      </>
                      );
                    })()}

                    <footer className="mt-auto grid grid-cols-2 gap-1">
                      <span className={`inline-flex h-5 min-w-0 items-center justify-center truncate rounded-md px-1 text-[8px] font-semibold ${
                        pct >= 100
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : pct > 60
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {pct}% Full
                      </span>
                      <span className={`inline-flex h-5 min-w-0 items-center justify-center truncate rounded-md px-1 text-[8px] font-semibold ${
                        room.status === 'AVAILABLE'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : room.status === 'FULL'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        {room.status}
                      </span>
                    </footer>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!loading && rooms.length === 0 && (
        <div className="flex flex-1 items-center justify-center text-xs text-slate-400">
          <p>No rooms found</p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-[9px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-bold dark:text-white">{value}</p>
    </div>
  );
}
