import { useEffect, useState, useMemo } from "react";
import { surgeryService } from "../../../services/core-modules/hospitalApi";
import { surgeryRequestService } from "../../../services/core-modules/surgeryRequestApi";
import { patientService } from "../../../services/core-modules/patientApi";
import { roomService } from "../../../services/core-modules/roomApi";
import SurgeryAdmissionLinker from "./SurgeryAdmissionLinker";
import {
  formatSurgeryDate,
  formatSurgeryDateTime,
  formatSurgeryTime,
  getSurgeryCalendarSlot,
  getSurgeryEnd,
  getSurgeryStart,
} from "./surgeryTimeUtils";

const SUB_VIEWS = [
  { key: "requests", label: "Requests" },
  { key: "calendar", label: "Calendar" },
  { key: "linker", label: "Link Admissions" },
];

const TYPE_COLORS = {
  ELECTIVE: "#8B5CF6",
  EMERGENCY: "#EF4444",
  MINOR: "#22C55E",
  MAJOR: "#F97316",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const statusBadge = (status) => {
  const colors = {
    REQUESTED: "#F59E0B",
    SCHEDULED: "#3B82F6",
    IN_PROGRESS: "#8B5CF6",
    COMPLETED: "#22C55E",
    CANCELLED: "#EF4444",
    REJECTED: "#6B7280",
  };
  return (
    <span
      style={{
        background: colors[status] || "#6B7280",
        color: "#fff",
        padding: "2px 10px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {status}
    </span>
  );
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function SurgeryPlanning() {
  const [subView, setSubView] = useState("requests");

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-slate-200 bg-white px-6 pt-3 dark:border-slate-800 dark:bg-slate-900">
        {SUB_VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setSubView(v.key)}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
              subView === v.key
                ? "bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      {subView === "requests" && <SurgeryRequestsView />}
      {subView === "calendar" && <SurgeryCalendar />}
      {subView === "linker" && <SurgeryAdmissionLinker />}
    </div>
  );
}

const COMMON_REJECT_REASONS = [
  "Incomplete documentation",
  "Missing required pre-op tests",
  "Operating room unavailable",
  "Surgeon not available on requested date",
  "Patient condition not suitable",
  "Duplicate request",
  "Schedule conflict",
  "Insurance / authorization pending",
];

function SurgeryRequestsView() {
  const [requests, setRequests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([
      surgeryRequestService.getAll({ status: "REQUESTED" }),
      patientService.getAllPatients(),
      roomService.getAllRooms(),
    ])
      .then(([reqRes, patRes, roomRes]) => {
        setRequests(reqRes.data || []);
        setPatients(patRes.data || []);
        const allRooms = roomRes.data || [];
        setRooms(allRooms.filter((r) => (r.roomType || r.type) === "SURGERY"));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const patientMap = useMemo(() => {
    const map = {};
    for (const p of patients) map[p.ellyId || p._id] = p;
    return map;
  }, [patients]);

  const [rejectForm, setRejectForm] = useState({
    reason: "",
    additionalNotes: "",
  });

  const [roomSchedule, setRoomSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleRoom, setScheduleRoom] = useState("");
  const [scheduleWeekOffset, setScheduleWeekOffset] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const loadSchedule = (roomId) => {
    if (!roomId) { setRoomSchedule([]); return; }
    setScheduleLoading(true);
    Promise.all([
      surgeryRequestService.getAll({ operatingRoom: roomId, status: "REQUESTED" }),
      surgeryRequestService.getAll({ operatingRoom: roomId, status: "SCHEDULED" }),
    ])
      .then(([requested, scheduled]) => {
        const all = [...(requested.data || []), ...(scheduled.data || [])];
        all.sort((a, b) => new Date(a.scheduledDate || 0) - new Date(b.scheduledDate || 0));
        setRoomSchedule(all);
      })
      .catch(() => setRoomSchedule([]))
      .finally(() => setScheduleLoading(false));
  };

  const handleApprove = async () => {
    if (!approving.operatingRoom || !approving.scheduledDate) {
      showToast("The doctor must select an operating room and date first.", "error");
      return;
    }

    const newStart = getSurgeryStart(approving);
    const newEnd = getSurgeryEnd(approving, newStart);
    if (!newStart || !newEnd) {
      showToast("The selected surgery request has an invalid date or time.", "error");
      return;
    }

    for (const existing of roomSchedule) {
      if (existing._id === approving._id) continue;
      const existingStart = getSurgeryStart(existing);
      if (!existingStart) continue;
      const existingEnd = getSurgeryEnd(existing, existingStart);

      if (newStart < existingEnd && newEnd > existingStart) {
        showToast(
          `Time conflict with existing booking: "${existing.procedureName}" on ${existingStart.toLocaleString()}.`,
          "error",
        );
        return;
      }
    }

    try {
      await surgeryRequestService.update(approving._id, { status: "SCHEDULED" });

      const surgeryPayload = {
        patientId: approving.patientId,
        hospitalId: approving.hospitalId,
        departmentId: approving.departmentId,
        primarySurgeonId: approving.primarySurgeonId,
        procedureName: approving.procedureName,
        diagnosis: approving.diagnosis,
        surgeryType: approving.surgeryType,
        anesthesiaType: approving.anesthesiaType,
        notes: approving.notes,
        surgeryId: approving.surgeryId,
        operatingRoom: approving.operatingRoom,
        recoveryRoom: approving.recoveryRoom || "",
        scheduledDate: newStart.toISOString(),
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        status: "SCHEDULED",
      };

      await surgeryService.createSurgery(surgeryPayload);

      showToast("Surgery request approved and scheduled.");
      setApproving(null);
      setRoomSchedule([]);
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to approve request.", "error");
    }
  };

  const handleReject = async () => {
    if (!rejectForm.reason) {
      showToast("Please select a rejection reason.", "error");
      return;
    }

    try {
      const rejectionText = rejectForm.additionalNotes
        ? `${rejectForm.reason} — ${rejectForm.additionalNotes}`
        : rejectForm.reason;

      await surgeryRequestService.update(rejecting._id, {
        status: "REJECTED",
        rejectionReason: rejectionText,
      });

      showToast("Surgery request rejected.");
      setRejecting(null);
      setRejectForm({ reason: "", additionalNotes: "" });
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to reject request.", "error");
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
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${
          toast.type === "error" ? "bg-red-600" : "bg-green-600"
        }`}>
          {toast.message}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Surgery Requests</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {requests.length} pending request{requests.length !== 1 ? "s" : ""} awaiting approval
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-blue-800 dark:text-blue-300">Surgery Room Schedule</h2>
          <select
            value={scheduleRoom}
            onChange={(e) => { setScheduleRoom(e.target.value); loadSchedule(e.target.value); }}
            className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-700 dark:bg-slate-800 dark:text-blue-300"
          >
            <option value="">Select a room to view schedule</option>
            {rooms.map((r) => (
              <option key={r._id} value={r.roomNumber || r.name || r._id}>
                {r.roomNumber || r.name}
              </option>
            ))}
          </select>
        </div>
        {scheduleLoading ? (
          <p className="text-sm text-blue-600 dark:text-blue-400">Loading schedule...</p>
        ) : !scheduleRoom ? (
          <p className="text-sm text-blue-600 dark:text-blue-400">Select a surgery room above to see its schedule.</p>
        ) : (
          (() => {
            const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            const HOURS = Array.from({ length: 24 }, (_, i) => i);
            const now = new Date();
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7) + scheduleWeekOffset * 7);
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);

            const grid = {};
            const spanMap = {};
            for (const b of roomSchedule) {
              const slot = getSurgeryCalendarSlot(b);
              if (!slot || slot.start < weekStart || slot.start > weekEnd) continue;
              const { dayIdx, startHour, rowSpan } = slot;
              if (!grid[dayIdx]) grid[dayIdx] = {};
              if (!grid[dayIdx][startHour]) grid[dayIdx][startHour] = [];
              if (!spanMap[dayIdx]) spanMap[dayIdx] = {};
              spanMap[dayIdx][startHour] = Math.max(spanMap[dayIdx][startHour] || 1, rowSpan);
              grid[dayIdx][startHour].push({ ...b, _rowSpan: rowSpan });
            }

            const weekLabel = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
            const todayStr = new Date().toDateString();

            return (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <button onClick={() => setScheduleWeekOffset((o) => o - 1)} className="rounded border border-blue-300 bg-white px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100">&larr;</button>
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">{weekLabel}</span>
                  <button onClick={() => setScheduleWeekOffset((o) => o + 1)} className="rounded border border-blue-300 bg-white px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100">&rarr;</button>
                  <button onClick={() => setScheduleWeekOffset(0)} className="ml-1 rounded bg-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-300">Today</button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-blue-200 bg-white dark:border-blue-800 dark:bg-slate-900">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 w-12 border-r border-blue-200 bg-blue-100 p-1 text-center text-[10px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Hour</th>
                        {DAYS.map((d, i) => {
                          const dayDate = new Date(weekStart);
                          dayDate.setDate(weekStart.getDate() + i);
                          const isToday = dayDate.toDateString() === todayStr;
                          return (
                            <th key={d} className={`p-1 text-center text-[10px] font-semibold ${isToday ? "bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-200" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"} border-r border-blue-200 dark:border-blue-800`}>
                              {d}<br /><span className="text-[9px] opacity-70">{dayDate.getDate()}</span>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {HOURS.map((hour) => (
                        <tr key={hour}>
                          <td className="sticky left-0 z-10 border-b border-r border-blue-200 bg-blue-50 p-1 text-center text-[10px] font-medium text-blue-600 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400">
                            {hour.toString().padStart(2, "0")}:00
                          </td>
                          {DAYS.map((_, dayIdx) => {
                            const dayDate = new Date(weekStart);
                            dayDate.setDate(weekStart.getDate() + dayIdx);
                            const isPast = dayDate < new Date(new Date().toDateString());

                            if (spanMap[dayIdx]?.[hour] && hour < 23) {
                              const bookedHours = spanMap[dayIdx][hour];
                              const bookings = grid[dayIdx]?.[hour] || [];
                              return (
                                <td key={dayIdx} rowSpan={bookedHours} className={`h-10 border-b border-r border-blue-100 align-top dark:border-blue-800 ${isPast ? "opacity-40" : ""}`}>
	                                  {bookings.map((b) => (
	                                    <div
	                                      key={b._id}
	                                      onClick={() => setSelectedBooking(b)}
	                                      className={`mx-0.5 mb-0.5 flex cursor-pointer items-start overflow-hidden rounded px-2 py-1 text-[9px] leading-tight hover:opacity-80 ${
	                                      b.status === "SCHEDULED" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"
	                                    }`}
	                                      style={{ minHeight: `calc(${b._rowSpan} * 2.5rem - 0.25rem)` }}
	                                      title={`${b.procedureName} - ${b.primarySurgeonId}`}
	                                    >
	                                      <span className="min-w-0 truncate">
	                                        <span className="font-semibold">{b.procedureName}</span>
	                                        <span className="ml-1 text-[8px] opacity-70">
	                                          {formatSurgeryTime(b.startTime || b.scheduledDate, b.scheduledDate)}
	                                          {`-${formatSurgeryTime(b.endTime, b.scheduledDate)}`}
	                                        </span>
	                                      </span>
	                                    </div>
	                                  ))}
                                </td>
                              );
                            }

                            const skipFrom = spanMap[dayIdx];
                            let skip = false;
                            for (let h = hour - 1; h >= 0; h--) {
                              if (skipFrom?.[h] && h + skipFrom[h] > hour) { skip = true; break; }
                            }
                            if (skip) return null;

                            return (
                              <td key={dayIdx} className={`h-10 border-b border-r border-blue-100 align-top dark:border-blue-800 ${isPast ? "opacity-40" : ""}`} />
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="p-3 text-left font-semibold">Patient</th>
              <th className="p-3 text-left font-semibold">Procedure</th>
              <th className="p-3 text-left font-semibold">Diagnosis</th>
              <th className="p-3 text-left font-semibold">Type</th>
              <th className="p-3 text-left font-semibold">Surgeon</th>
              <th className="p-3 text-left font-semibold">Scheduled</th>
              <th className="p-3 text-center font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r._id} onClick={() => setSelectedDetail(r)} className="cursor-pointer border-t border-slate-200 dark:border-slate-700">
                <td className="p-3 font-medium text-slate-900 dark:text-white">
                  {patientMap[r.patientId]?.fullName || r.patientId}
                </td>
                <td className="p-3 max-w-[180px] text-slate-700 dark:text-slate-300">
                  <div className="truncate">{r.procedureName}</div>
                </td>
                <td className="p-3 max-w-[160px] text-slate-700 dark:text-slate-300">
                  <div className="truncate">{r.diagnosis}</div>
                </td>
                <td className="p-3 text-slate-700 dark:text-slate-300">{r.surgeryType}</td>
                <td className="p-3 text-slate-700 dark:text-slate-300">{r.primarySurgeonId}</td>
                <td className="p-3 text-slate-700 dark:text-slate-300">
                  {formatSurgeryDate(r.scheduledDate)}
                </td>
                <td className="p-3 text-center">
                  <div className="flex justify-center gap-2">
                      <button
                      onClick={() => {
                        setApproving(r);
                        if (r.operatingRoom) {
                          setScheduleLoading(true);
                          Promise.all([
                            surgeryRequestService.getAll({ operatingRoom: r.operatingRoom, status: "REQUESTED" }),
                            surgeryRequestService.getAll({ operatingRoom: r.operatingRoom, status: "SCHEDULED" }),
                          ])
                            .then(([requested, scheduled]) => {
                              const all = [...(requested.data || []), ...(scheduled.data || [])];
                              all.sort((a, b) => new Date(a.scheduledDate || 0) - new Date(b.scheduledDate || 0));
                              setRoomSchedule(all);
                            })
                            .catch(() => setRoomSchedule([]))
                            .finally(() => setScheduleLoading(false));
                        }
                      }}
                      className="rounded bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setRejecting(r);
                        setRejectForm({ reason: "", additionalNotes: "" });
                      }}
                      className="rounded bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">No pending surgery requests</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {approving && !rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">Approve Surgery Request</h2>
            <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <p><span className="font-semibold text-slate-500">Patient:</span> {patientMap[approving.patientId]?.fullName || approving.patientId}</p>
                <p><span className="font-semibold text-slate-500">Procedure:</span> {approving.procedureName}</p>
                <p><span className="font-semibold text-slate-500">Surgeon:</span> {approving.primarySurgeonId}</p>
                <p><span className="font-semibold text-slate-500">Type:</span> {approving.surgeryType}</p>
                <p><span className="font-semibold text-slate-500">Diagnosis:</span> {approving.diagnosis}</p>
                <p><span className="font-semibold text-slate-500">Anesthesia:</span> {approving.anesthesiaType}</p>
                <p><span className="font-semibold text-slate-500">Room:</span> {approving.operatingRoom || "-"}</p>
                <p><span className="font-semibold text-slate-500">Date:</span> {formatSurgeryDate(approving.scheduledDate)}</p>
                <p><span className="font-semibold text-slate-500">Start:</span> {formatSurgeryTime(approving.startTime || approving.scheduledDate, approving.scheduledDate)}</p>
                <p><span className="font-semibold text-slate-500">End:</span> {formatSurgeryTime(approving.endTime, approving.scheduledDate)}</p>
              </div>
            </div>

            {approving.operatingRoom && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                  Room Schedule — {approving.operatingRoom} {scheduleLoading ? "(loading...)" : `(${roomSchedule.length} bookings)`}
                </p>
                {scheduleLoading ? (
                  <p className="text-xs text-blue-500">Loading...</p>
                ) : roomSchedule.length === 0 ? (
                  <p className="text-xs text-blue-500">No existing bookings in this room.</p>
                ) : (
                  <div className="max-h-28 space-y-0.5 overflow-y-auto">
                    {roomSchedule.map((b) => (
                      <div key={b._id} className="flex items-center justify-between rounded bg-white px-2 py-0.5 text-[11px] dark:bg-slate-800">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {formatSurgeryDateTime(b.startTime || b.scheduledDate, b.scheduledDate)}
                        </span>
                        <span className="text-slate-500">{b.procedureName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setApproving(null); setRoomSchedule([]); }}
                className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="rounded bg-violet-600 px-6 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">Reject Surgery Request</h2>
            <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <p><span className="font-semibold text-slate-500">Patient:</span> {patientMap[rejecting.patientId]?.fullName || rejecting.patientId}</p>
                <p><span className="font-semibold text-slate-500">Procedure:</span> {rejecting.procedureName}</p>
                <p><span className="font-semibold text-slate-500">Surgeon:</span> {rejecting.primarySurgeonId}</p>
                <p><span className="font-semibold text-slate-500">Type:</span> {rejecting.surgeryType}</p>
              </div>
            </div>

            <label className="mb-3 flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reason *</span>
              <div className="flex flex-wrap gap-2">
                {COMMON_REJECT_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRejectForm((f) => ({ ...f, reason: r }))}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      rejectForm.reason === r
                        ? "bg-red-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Additional Notes</span>
              <textarea
                value={rejectForm.additionalNotes}
                onChange={(e) => setRejectForm((f) => ({ ...f, additionalNotes: e.target.value }))}
                placeholder="Optional additional details..."
                rows={3}
                className="rounded border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setRejecting(null); setRejectForm({ reason: "", additionalNotes: "" }); }}
                className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectForm.reason}
                className="rounded bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedBooking(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Booking Details</h3>
              <button onClick={() => setSelectedBooking(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Procedure</span><p className="font-medium text-slate-900 dark:text-white">{selectedBooking.procedureName}</p></div>
              <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Surgeon</span><p className="text-slate-700 dark:text-slate-300">{selectedBooking.primarySurgeonId}</p></div>
              <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Patient</span><p className="text-slate-700 dark:text-slate-300">{selectedBooking.patientId}</p></div>
              <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Date</span><p className="text-slate-700 dark:text-slate-300">{formatSurgeryDate(selectedBooking.scheduledDate)}</p></div>
              <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Start Time</span><p className="text-slate-700 dark:text-slate-300">{formatSurgeryTime(selectedBooking.startTime || selectedBooking.scheduledDate, selectedBooking.scheduledDate)}</p></div>
              <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">End Time</span><p className="text-slate-700 dark:text-slate-300">{formatSurgeryTime(selectedBooking.endTime, selectedBooking.scheduledDate)}</p></div>
              <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Diagnosis</span><p className="text-slate-700 dark:text-slate-300">{selectedBooking.diagnosis || "-"}</p></div>
              <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</span><p><span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${selectedBooking.status === "SCHEDULED" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}>{selectedBooking.status}</span></p></div>
            </div>
          </div>
        </div>
      )}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedDetail(null)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Surgery Request Details</h3>
              <button onClick={() => setSelectedDetail(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Patient</span><p className="font-medium text-slate-900 dark:text-white">{patientMap[selectedDetail.patientId]?.fullName || selectedDetail.patientId}</p></div>
                <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Surgeon</span><p className="text-slate-700 dark:text-slate-300">{selectedDetail.primarySurgeonId}</p></div>
              </div>
              <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Procedure</span><p className="font-medium text-slate-900 dark:text-white">{selectedDetail.procedureName}</p></div>
              <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Diagnosis</span><p className="text-slate-700 dark:text-slate-300">{selectedDetail.diagnosis || "-"}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Surgery Type</span><p className="text-slate-700 dark:text-slate-300">{selectedDetail.surgeryType}</p></div>
                <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Anesthesia</span><p className="text-slate-700 dark:text-slate-300">{selectedDetail.anesthesiaType}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Scheduled Date</span><p className="text-slate-700 dark:text-slate-300">{formatSurgeryDate(selectedDetail.scheduledDate)}</p></div>
                <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</span><p>{statusBadge(selectedDetail.status)}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Operating Room</span><p className="text-slate-700 dark:text-slate-300">{selectedDetail.operatingRoom || "-"}</p></div>
                <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recovery Room</span><p className="text-slate-700 dark:text-slate-300">{selectedDetail.recoveryRoom || "-"}</p></div>
              </div>
              {selectedDetail.startTime && <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Start Time</span><p className="text-slate-700 dark:text-slate-300">{formatSurgeryDateTime(selectedDetail.startTime, selectedDetail.scheduledDate)}</p></div>}
              {selectedDetail.endTime && <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">End Time</span><p className="text-slate-700 dark:text-slate-300">{formatSurgeryDateTime(selectedDetail.endTime, selectedDetail.scheduledDate)}</p></div>}
              {selectedDetail.rejectionReason && <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rejection Reason</span><p className="text-red-600 dark:text-red-400">{selectedDetail.rejectionReason}</p></div>}
              {selectedDetail.notes && <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</span><p className="text-slate-600 dark:text-slate-400">{selectedDetail.notes}</p></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SurgeryCalendar() {
  const [surgeries, setSurgeries] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedSurgery, setSelectedSurgery] = useState(null);
  const [typeFilter, setTypeFilter] = useState("ALL");

  useEffect(() => {
    Promise.all([
      surgeryService.getAllSurgeries(),
      patientService.getAllPatients(),
    ])
      .then(([surgRes, patRes]) => {
        setSurgeries(surgRes.data || []);
        setPatients(patRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const patientMap = useMemo(() => {
    const map = {};
    for (const p of patients) map[p.ellyId || p._id] = p;
    return map;
  }, [patients]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const cells = [];
    for (let i = 0; i < startPadding; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const surgeriesByDate = useMemo(() => {
    const map = {};
    const filtered = typeFilter === "ALL" ? surgeries : surgeries.filter((s) => s.surgeryType === typeFilter);
    for (const s of filtered) {
      if (!s.scheduledDate) continue;
      const key = getSurgeryStart(s)?.toDateString();
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [surgeries, typeFilter]);

  const weekRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < calendarGrid.length; i += 7) {
      rows.push(calendarGrid.slice(i, i + 7));
    }
    return rows;
  }, [calendarGrid]);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const today = new Date();

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
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Surgery Planning</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {surgeries.length} surgeries — calendar view by scheduled date
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <button onClick={() => setViewDate(new Date())} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">Today</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type:</span>
          {["ALL", "ELECTIVE", "EMERGENCY", "MINOR", "MAJOR"].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${typeFilter === t ? "bg-violet-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}>
              {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-1">
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
            {DAYS.map((d) => (
              <div key={d} className="p-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {weekRows.map((week, wi) =>
              week.map((day, di) => {
                if (!day) return <div key={`empty-${wi}-${di}`} className="min-h-[100px] border-b border-slate-100 p-1 dark:border-slate-800" />;
                const dateKey = day.toDateString();
                const daySurgeries = surgeriesByDate[dateKey] || [];
                const isToday = day.toDateString() === today.toDateString();
                const isPast = day < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                return (
                  <div key={dateKey} className={`min-h-[100px] border-b border-r border-slate-100 p-1 dark:border-slate-800 ${isToday ? "bg-violet-50 dark:bg-violet-900/10" : ""} ${isPast ? "opacity-50" : ""}`}>
                    <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isToday ? "bg-violet-600 text-white" : "text-slate-600 dark:text-slate-400"}`}>{day.getDate()}</div>
                    <div className="space-y-0.5">
                      {daySurgeries.slice(0, 3).map((s) => (
                        <button key={s._id} onClick={() => setSelectedSurgery(s)} className="w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium leading-tight" style={{ backgroundColor: `${TYPE_COLORS[s.surgeryType] || "#94A3B8"}20`, color: TYPE_COLORS[s.surgeryType] || "#94A3B8" }}>
                          {s.surgeryId}
                        </button>
                      ))}
                      {daySurgeries.length > 3 && <div className="text-center text-[10px] font-semibold text-slate-400">+{daySurgeries.length - 3} more</div>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto">
          {selectedSurgery ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Surgery Details</h3>
                  <p className="font-mono text-xs text-slate-500">{selectedSurgery.surgeryId}</p>
                </div>
                <button onClick={() => setSelectedSurgery(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="mb-4">
                <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${TYPE_COLORS[selectedSurgery.surgeryType] || "#94A3B8"}20`, color: TYPE_COLORS[selectedSurgery.surgeryType] || "#94A3B8" }}>{selectedSurgery.surgeryType}</span>
                <span className={`ml-2 inline-block rounded px-2 py-0.5 text-xs font-semibold ${selectedSurgery.status === "COMPLETED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : selectedSurgery.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : selectedSurgery.status === "CANCELLED" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"}`}>{selectedSurgery.status === "IN_PROGRESS" ? "In Progress" : selectedSurgery.status}</span>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Patient</span>
                  <p className="font-medium text-slate-900 dark:text-white">{patientMap[selectedSurgery.patientId]?.fullName || selectedSurgery.patientId}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Procedure</span>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedSurgery.procedureName}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Surgeon</span><p className="font-medium text-slate-900 dark:text-white">{selectedSurgery.primarySurgeonId}</p></div>
                  <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Op. Room</span><p className="font-medium text-slate-900 dark:text-white">{selectedSurgery.operatingRoom || "-"}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Scheduled Date</span><p className="font-medium text-slate-900 dark:text-white">{formatSurgeryDate(selectedSurgery.scheduledDate)}</p></div>
                  <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Outcome</span><p className="font-medium text-slate-900 dark:text-white">{selectedSurgery.outcome || "Pending"}</p></div>
                </div>
                <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recovery Room</span><p className="font-medium text-slate-900 dark:text-white">{selectedSurgery.recoveryRoom || "-"}</p></div>
                {selectedSurgery.diagnosis && <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Diagnosis</span><p className="font-medium text-slate-900 dark:text-white">{selectedSurgery.diagnosis}</p></div>}
                {selectedSurgery.notes && <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</span><p className="text-slate-600 dark:text-slate-400">{selectedSurgery.notes}</p></div>}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <div className="text-center">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Select a surgery on the calendar</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Click any colored block to view details</p>
              </div>
            </div>
          )}
          <div className="mt-auto rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Legend</h4>
            <div className="flex flex-wrap gap-3">
              {Object.entries(TYPE_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
