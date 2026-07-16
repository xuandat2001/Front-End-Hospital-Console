import { useEffect, useState, useMemo, useCallback } from "react";
import { staffService } from "../../../services/core-modules/staffApi";
import { hospitalService } from "../../../services/core-modules/hospitalApi";
import StaffSearchBar from "../../../components/staff/StaffSearchBar";
import StaffCalendar from "../../../components/staff/StaffCalendar";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function addWeek(date, weeks) {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

export default function StaffSchedule() {
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [schedule, setSchedule] = useState([]);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [weekStart, setWeekStart] = useState(() => formatDate(getMonday(new Date())));

  useEffect(() => {
    const load = async () => {
      const [staffRes, deptRes] = await Promise.allSettled([
        staffService.getAllStaff(),
        hospitalService.getAllDepartmentsList(),
      ]);
      if (staffRes.status === "fulfilled") setStaff(staffRes.value.data || []);
      if (deptRes.status === "fulfilled") setDepartments(deptRes.value || []);
    };
    load();
  }, []);

  const filteredStaff = searchTerm.trim()
    ? staff.filter((p) =>
        p.ellyId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p._id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : staff;

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [weekStart]);

  const weekLabel = useMemo(() => {
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    const opts = { month: "short", day: "numeric", year: "numeric" };
    return `${start.toLocaleDateString("en-US", opts)} — ${end.toLocaleDateString("en-US", opts)}`;
  }, [weekStart, weekEnd]);

  const goBack = () => setWeekStart(formatDate(addWeek(new Date(weekStart), -1)));
  const goForward = () => setWeekStart(formatDate(addWeek(new Date(weekStart), 1)));
  const goToday = () => setWeekStart(formatDate(getMonday(new Date())));

  const loadSchedule = useCallback(async (memberId, ws) => {
    if (!memberId) { setSchedule([]); return; }
    try {
      const res = await staffService.getScheduleByWeek(memberId, ws);
      setSchedule(res.data || []);
    } catch {
      const member = staff.find((m) => m.ellyId === memberId || m._id === memberId);
      const all = member?.schedule || [];
      const monday = getMonday(new Date(ws)).toISOString().split("T")[0];
      setSchedule(all.filter((s) => !s.weekStart || s.weekStart === monday));
    }
  }, [staff]);

  const handleMemberChange = (memberId) => {
    setSelectedMember(memberId);
    loadSchedule(memberId, weekStart);
  };

  useEffect(() => {
    if (selectedMember) loadSchedule(selectedMember, weekStart);
  }, [weekStart, selectedMember, loadSchedule]);

  const updateShift = (day, field, value) => {
    setSchedule((prev) => {
      const existing = prev.find((s) => s.day === day);
      if (existing) return prev.map((s) => s.day === day ? { ...s, [field]: value } : s);
      return [...prev, { day, weekStart, startTime: field === "startTime" ? value : "", endTime: field === "endTime" ? value : "" }];
    });
  };

  const handleSave = async () => {
    if (!selectedMember) { setMessage("Please select a staff member"); return; }
    try {
      const cleaned = schedule.filter((s) => s.startTime && s.endTime);
      await staffService.updateSchedule(selectedMember, cleaned, weekStart);
      setMessage("Schedule saved!");
      const res = await staffService.getAllStaff();
      setStaff(res.data || []);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const isDayOff = (day) => {
    const shift = schedule.find((s) => s.day === day && s.weekStart === weekStart);
    return !shift || (!shift.startTime && !shift.endTime);
  };

  const toggleDayOff = (day) => {
    setSchedule((prev) => {
      const existing = prev.find((s) => s.day === day);
      if (existing) return prev.filter((s) => s.day !== day);
      return [...prev, { day, weekStart, startTime: "", endTime: "" }];
    });
  };

  return (
    <div className="flex h-full gap-4 p-6">
      <div className="flex w-1/2 min-w-0 flex-col gap-4 overflow-y-auto">
        <div>
          <h1 className="mb-2 text-2xl font-bold dark:text-white">Schedule</h1>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Manage weekly staff shifts</p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <button onClick={goBack} className="rounded-lg border px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 dark:text-white dark:border-slate-600 dark:hover:bg-slate-700">&larr;</button>
          <button onClick={goToday} className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:text-white dark:border-slate-600 dark:hover:bg-slate-700">Today</button>
          <span className="flex-1 text-center text-sm font-semibold dark:text-white">{weekLabel}</span>
          <button onClick={goForward} className="rounded-lg border px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 dark:text-white dark:border-slate-600 dark:hover:bg-slate-700">&rarr;</button>
        </div>

        {message && (
          <div className="rounded bg-blue-100 p-3 text-sm dark:bg-blue-900 dark:text-blue-100">{message}</div>
        )}

        <div className="space-y-3">
          <label className="mb-2 block font-semibold dark:text-white">Select Staff</label>
          <StaffSearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          <select
            value={selectedMember}
            onChange={(e) => handleMemberChange(e.target.value)}
            className="w-full rounded border p-2 dark:bg-slate-800 dark:text-white dark:border-slate-600"
          >
            <option value="">Select Staff</option>
            {filteredStaff.map((m) => (
              <option key={m.ellyId || m._id} value={m.ellyId || m._id}>{m.fullName}</option>
            ))}
          </select>
        </div>

        {selectedMember && (
          <div>
            <div className="overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-slate-800">
              <table className="w-full">
                <thead className="bg-slate-100 dark:bg-slate-700">
                  <tr>
                    <th className="p-4 text-left dark:text-white">Day</th>
                    <th className="p-4 text-left dark:text-white">Start Time</th>
                    <th className="p-4 text-left dark:text-white">End Time</th>
                    <th className="p-4 text-left dark:text-white">Day Off</th>
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => {
                    const shift = schedule.find((s) => s.day === day);
                    return (
                      <tr key={day} className="border-t border-slate-200 dark:border-slate-700">
                        <td className="p-4 font-medium dark:text-white">{day}</td>
                        <td className="p-4">
                          <input
                            type="time"
                            value={shift?.startTime || ""}
                            onChange={(e) => updateShift(day, "startTime", e.target.value)}
                            className="rounded border p-2 dark:bg-slate-700 dark:text-white"
                          />
                        </td>
                        <td className="p-4">
                          <input
                            type="time"
                            value={shift?.endTime || ""}
                            onChange={(e) => updateShift(day, "endTime", e.target.value)}
                            className="rounded border p-2 dark:bg-slate-700 dark:text-white"
                          />
                        </td>
                        <td className="p-4">
                          <label className="flex items-center gap-2 dark:text-white">
                            <input type="checkbox" checked={isDayOff(day)} onChange={() => toggleDayOff(day)} />
                            Off Day
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6">
              <button
                onClick={handleSave}
                disabled={!selectedMember}
                className="rounded-lg bg-teal-600 px-6 py-2 font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                Save Schedule
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="w-1/2 min-w-0 overflow-y-auto">
        <h2 className="mb-2 text-2xl font-bold dark:text-white">Calendar</h2>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Staff color-coded by department.</p>
        <StaffCalendar staff={staff} departments={departments} />
      </div>
    </div>
  );
}
