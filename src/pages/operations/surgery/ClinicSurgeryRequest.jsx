import { useState, useEffect } from "react";
import { surgeryRequestService } from "../../../services/core-modules/surgeryRequestApi";
import { patientService } from "../../../services/core-modules/patientApi";
import { roomService } from "../../../services/core-modules/roomApi";
import useSessionStore from "../../../store/useSessionStore";
import {
  formatSurgeryDate,
  formatSurgeryDateTime,
  formatSurgeryTime,
  getSurgeryCalendarSlot,
  parseSurgeryDateTime,
} from "./surgeryTimeUtils";

export default function ClinicSurgeryRequest() {
  const currentUser = useSessionStore((s) => s.currentUser);
  const workspace = useSessionStore((s) => s.workspace);

  const [patients, setPatients] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [roomSchedule, setRoomSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleWeekOffset, setScheduleWeekOffset] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const [form, setForm] = useState({
    patientId: "",
    procedureName: "",
    diagnosis: "",
    surgeryType: "ELECTIVE",
    scheduledDate: "",
    anesthesiaType: "GENERAL",
    operatingRoom: "",
    notes: "",
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = () => {
    setLoading(true);
    Promise.allSettled([
      surgeryRequestService.getAll({ primarySurgeonId: currentUser?.ellyId }),
      patientService.getAllPatients(),
      roomService.getAllRooms(),
    ]).then(([surgRes, patRes, roomRes]) => {
      if (surgRes.status === "fulfilled") {
        setRequests(surgRes.value.data || []);
      } else {
        console.error("Failed to fetch surgery requests:", surgRes.reason);
      }
      if (patRes.status === "fulfilled") {
        setPatients(patRes.value.data || []);
      } else {
        console.error("Failed to fetch patients:", patRes.reason);
      }
      if (roomRes.status === "fulfilled") {
        const allRooms = roomRes.value.data || [];
        setRooms(allRooms.filter((r) => (r.roomType || r.type) === "SURGERY"));
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const [scheduleRoom, setScheduleRoom] = useState("");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patientId || !form.procedureName || !form.diagnosis || !form.scheduledDate || !form.startTime || !form.endTime) {
      showToast("Fill in all required fields.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const scheduledDate = parseSurgeryDateTime(form.scheduledDate);
      const startTime = parseSurgeryDateTime(form.startTime, form.scheduledDate);
      const endTime = parseSurgeryDateTime(form.endTime, form.scheduledDate);
      if (!scheduledDate || !startTime || !endTime) {
        showToast("Select a valid surgery date and time.", "error");
        return;
      }
      if (endTime <= startTime) endTime.setDate(endTime.getDate() + 1);

      const payload = {
        patientId: form.patientId,
        procedureName: form.procedureName,
        diagnosis: form.diagnosis,
        surgeryType: form.surgeryType,
        scheduledDate: scheduledDate.toISOString(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        anesthesiaType: form.anesthesiaType,
        operatingRoom: form.operatingRoom,
        notes: form.notes,
        primarySurgeonId: currentUser?.ellyId || "",
        hospitalId: workspace?.ellyHospitalId || workspace?.id || "",
        departmentId: currentUser?.departmentId || "",
        status: "REQUESTED",
      };

      await surgeryRequestService.create(payload);
      showToast("Surgery request submitted successfully.");
      setShowForm(false);
      setForm({
        patientId: "", procedureName: "", diagnosis: "",
        surgeryType: "ELECTIVE", scheduledDate: "", anesthesiaType: "GENERAL",
        operatingRoom: "", notes: "", startTime: "", endTime: "",
      });
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to submit request.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getPatientName = (id) => {
    const p = patients.find((p) => p.ellyId === id || p._id === id);
    return p ? p.fullName : id;
  };

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

  const myRequests = requests.filter((r) =>
    ["REQUESTED", "SCHEDULED", "IN_PROGRESS"].includes(r.status)
  );
  const completedRequests = requests.filter((r) =>
    ["COMPLETED", "CANCELLED", "REJECTED"].includes(r.status)
  );

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${
            toast.type === "error" ? "bg-red-600" : "bg-green-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">My Surgeries</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Surgeries where you are the primary surgeon
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-white font-medium text-sm"
          style={{ background: showForm ? "#6B7280" : "#3B82F6" }}
        >
          {showForm ? "Cancel" : "+ New Request"}
        </button>
      </div>

      {showForm && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">New Surgery Request</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Patient *</label>
                <select
                  name="patientId"
                  value={form.patientId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                >
                  <option value="">Select a patient</option>
                  {patients.map((p) => (
                    <option key={p._id || p.ellyId} value={p.ellyId || p._id}>
                      {p.fullName} ({p.ellyId || p._id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Surgery Type</label>
                <select
                  name="surgeryType"
                  value={form.surgeryType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="ELECTIVE">Elective</option>
                  <option value="EMERGENCY">Emergency</option>
                  <option value="MINOR">Minor</option>
                  <option value="MAJOR">Major</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Procedure Name *</label>
                <input
                  type="text"
                  name="procedureName"
                  value={form.procedureName}
                  onChange={handleChange}
                  placeholder="e.g. Appendectomy"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Scheduled Date *</label>
                <input
                  type="date"
                  name="scheduledDate"
                  value={form.scheduledDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Start Time *</label>
                <input
                  type="time"
                  name="startTime"
                  value={form.startTime}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">End Time *</label>
                <input
                  type="time"
                  name="endTime"
                  value={form.endTime}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Diagnosis *</label>
                <input
                  type="text"
                  name="diagnosis"
                  value={form.diagnosis}
                  onChange={handleChange}
                  placeholder="e.g. Acute appendicitis"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Anesthesia Type</label>
                <select
                  name="anesthesiaType"
                  value={form.anesthesiaType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="GENERAL">General</option>
                  <option value="LOCAL">Local</option>
                  <option value="REGIONAL">Regional</option>
                  <option value="SEDATION">Sedation</option>
                  <option value="NONE">None</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Operating Room</label>
                <select
                  name="operatingRoom"
                  value={form.operatingRoom}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select operating room</option>
                  {rooms.map((r) => (
                    <option key={r._id} value={r.roomNumber || r.name || r._id}>
                      {r.roomNumber || r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Additional details or instructions..."
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </div>
      )}

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <p className="text-2xl font-bold dark:text-white">{myRequests.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Scheduled</p>
          <p className="text-2xl font-bold dark:text-white">
            {requests.filter((r) => r.status === "SCHEDULED").length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
          <p className="text-2xl font-bold dark:text-white">
            {requests.filter((r) => r.status === "COMPLETED").length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold dark:text-white">{requests.length}</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3 dark:text-white">
          Active & Upcoming ({myRequests.length})
        </h2>
        {myRequests.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No active surgery requests.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium dark:text-gray-300">Patient</th>
                  <th className="px-4 py-3 font-medium dark:text-gray-300">Procedure</th>
                  <th className="px-4 py-3 font-medium dark:text-gray-300">Diagnosis</th>
                  <th className="px-4 py-3 font-medium dark:text-gray-300">Type</th>
                  <th className="px-4 py-3 font-medium dark:text-gray-300">Scheduled</th>
                  <th className="px-4 py-3 font-medium dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {myRequests.map((s) => (
                  <tr key={s._id} onClick={() => setSelectedDetail(s)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 dark:text-white">{getPatientName(s.patientId)}</td>
                    <td className="px-4 py-3 dark:text-white">{s.procedureName}</td>
                    <td className="px-4 py-3 dark:text-gray-300 max-w-[200px] truncate">{s.diagnosis}</td>
                    <td className="px-4 py-3 dark:text-gray-300">{s.surgeryType}</td>
                    <td className="px-4 py-3 dark:text-gray-300">
                      {formatSurgeryDate(s.scheduledDate)}
                    </td>
                    <td className="px-4 py-3">{statusBadge(s.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 dark:text-white">
          History ({completedRequests.length})
        </h2>
        {completedRequests.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No past surgery records.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium dark:text-gray-300">Patient</th>
                  <th className="px-4 py-3 font-medium dark:text-gray-300">Procedure</th>
                  <th className="px-4 py-3 font-medium dark:text-gray-300">Scheduled</th>
                  <th className="px-4 py-3 font-medium dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {completedRequests.map((s) => (
                  <tr key={s._id} onClick={() => setSelectedDetail(s)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 dark:text-white">{getPatientName(s.patientId)}</td>
                    <td className="px-4 py-3 dark:text-white">{s.procedureName}</td>
                    <td className="px-4 py-3 dark:text-gray-300">
                      {formatSurgeryDate(s.scheduledDate)}
                    </td>
                    <td className="px-4 py-3">{statusBadge(s.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                <div><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Patient</span><p className="font-medium text-slate-900 dark:text-white">{getPatientName(selectedDetail.patientId)}</p></div>
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
