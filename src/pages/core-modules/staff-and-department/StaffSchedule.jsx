import { useEffect, useState, useMemo, useCallback } from "react";
import { staffService } from "../../../services/core-modules/staffApi";
import { hospitalService } from "../../../services/core-modules/hospitalApi";
import StaffSearchBar from "../../../components/staff/StaffSearchBar";
import StaffCalendar from "../../../components/staff/StaffCalendar";
import {
  addLocalDays,
  formatLocalDate,
  getMonday,
  parseLocalDate,
} from "../../../components/staff/staffScheduleDate";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

function addWeek(date, weeks) {
  return addLocalDays(date, weeks * 7);
}

export default function StaffSchedule() {
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [schedule, setSchedule] = useState([]);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [weekStart, setWeekStart] = useState(() => formatLocalDate(getMonday(new Date())));

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

  const filteredStaff = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return staff;
    return staff.filter((p) =>
      p.ellyId?.toLowerCase().includes(search) ||
      p._id?.toLowerCase().includes(search) ||
      p.fullName?.toLowerCase().includes(search)
    );
  }, [staff, searchTerm]);

  const selectedStaff = useMemo(
    () => staff.find((m) => m.ellyId === selectedMember || m._id === selectedMember),
    [staff, selectedMember],
  );
  const showStaffResults = !selectedMember || Boolean(searchTerm.trim());

  const weekEnd = useMemo(() => {
    return addLocalDays(weekStart, 6);
  }, [weekStart]);

  const weekLabel = useMemo(() => {
    const start = parseLocalDate(weekStart);
    const end = new Date(weekEnd);
    const opts = { month: "short", day: "numeric", year: "numeric" };
    return `${start.toLocaleDateString("en-US", opts)} — ${end.toLocaleDateString("en-US", opts)}`;
  }, [weekStart, weekEnd]);

  const goBack = () => setWeekStart(formatLocalDate(addWeek(weekStart, -1)));
  const goForward = () => setWeekStart(formatLocalDate(addWeek(weekStart, 1)));
  const goToday = () => setWeekStart(formatLocalDate(getMonday(new Date())));

  const loadSchedule = useCallback(async (memberId, ws) => {
    if (!memberId) { setSchedule([]); return; }
    try {
      const res = await staffService.getScheduleByWeek(memberId, ws);
      setSchedule(res.data || []);
    } catch {
      const member = staff.find((m) => m.ellyId === memberId || m._id === memberId);
      const all = member?.schedule || [];
      const monday = formatLocalDate(getMonday(ws));
      setSchedule(all.filter((s) => !s.weekStart || s.weekStart === monday));
    }
  }, [staff]);

  const handleMemberSelect = (member) => {
    const memberId = member?.ellyId || member?._id || "";
    setSelectedMember(memberId);
    setSearchTerm("");
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

  const handleCalendarShiftDelete = async (member, shift, shiftDate) => {
    const memberId = member?.ellyId || member?._id;
    if (!memberId || !shift?.day) return;

    const targetWeekStart = shift.weekStart || formatLocalDate(getMonday(shiftDate));
    const updatedMemberSchedule = (member.schedule || []).filter((item) => {
      const itemWeekStart = item.weekStart || targetWeekStart;
      return !(item.day === shift.day && itemWeekStart === targetWeekStart);
    });
    const updatedWeekSchedule = updatedMemberSchedule.filter((item) => {
      const itemWeekStart = item.weekStart || targetWeekStart;
      return itemWeekStart === targetWeekStart;
    });

    try {
      await staffService.updateSchedule(memberId, updatedWeekSchedule, targetWeekStart);
      setStaff((current) =>
        current.map((item) =>
          (item.ellyId || item._id) === memberId
            ? { ...item, schedule: updatedMemberSchedule }
            : item
        )
      );
      if (selectedMember === memberId && weekStart === targetWeekStart) {
        setSchedule((current) => current.filter((item) => item.day !== shift.day));
      }
      setMessage("Shift deleted.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const isDayOff = (day) => {
    const shift = schedule.find((s) => s.day === day);
    return !shift || (!shift.startTime && !shift.endTime);
  };

  const toggleDayOff = (day, checked) => {
    setSchedule((prev) => {
      const existing = prev.find((s) => s.day === day);
      if (checked) return prev.filter((s) => s.day !== day);
      if (existing) return prev;
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
          <label className="mb-2 block font-semibold dark:text-white">Find Staff</label>
          <StaffSearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder="Search staff name or ID..."
          />
          {selectedMember && (
            <div className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm text-teal-900 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-100">
              <span className="block text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                Edit weekly shifts
              </span>
              Viewing shifts for <strong>{selectedStaff?.fullName || selectedMember}</strong>
            </div>
          )}
          {showStaffResults && (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              {filteredStaff.length ? (
                filteredStaff.map((m) => {
                  const memberId = m.ellyId || m._id;
                  const isSelected = selectedMember === memberId;
                  return (
                    <button
                      key={memberId}
                      type="button"
                      onClick={() => handleMemberSelect(m)}
                      className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-purple-50 dark:border-slate-700 dark:hover:bg-slate-700 ${
                        isSelected ? "bg-purple-100 dark:bg-purple-900/40" : ""
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-semibold text-slate-900 dark:text-white">
                          {m.fullName || "Unnamed staff"}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                          {[m.role, m.ellyId || m._id].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                        {isSelected ? "Viewing" : "View shifts"}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="px-4 py-5 text-sm text-slate-500 dark:text-slate-400">
                  No staff matched your search.
                </p>
              )}
            </div>
          )}
        </div>

        {selectedMember && (
          <div>
            <div className="rounded-xl border bg-white shadow-sm dark:bg-slate-800">
              <div className="grid grid-cols-[72px_minmax(92px,1fr)_minmax(92px,1fr)_72px] gap-2 rounded-t-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                <span>Day</span>
                <span>Start</span>
                <span>End</span>
                <span>Off</span>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {DAYS.map((day) => {
                  const shift = schedule.find((s) => s.day === day);
                  return (
                    <div
                      key={day}
                      className="grid grid-cols-[72px_minmax(92px,1fr)_minmax(92px,1fr)_72px] items-center gap-2 px-3 py-2"
                    >
                      <span className="text-xs font-semibold dark:text-white">{day.slice(0, 3)}</span>
                      <input
                        type="time"
                        value={shift?.startTime || ""}
                        onChange={(e) => updateShift(day, "startTime", e.target.value)}
                        className="w-full rounded border p-2 text-sm [color-scheme:light] dark:bg-slate-700 dark:text-white dark:[color-scheme:dark]"
                      />
                      <input
                        type="time"
                        value={shift?.endTime || ""}
                        onChange={(e) => updateShift(day, "endTime", e.target.value)}
                        className="w-full rounded border p-2 text-sm [color-scheme:light] dark:bg-slate-700 dark:text-white dark:[color-scheme:dark]"
                      />
                      <label className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                        <input
                          type="checkbox"
                          checked={isDayOff(day)}
                          onChange={(e) => toggleDayOff(day, e.target.checked)}
                          className="h-4 w-4 accent-teal-600"
                        />
                        Off
                      </label>
                    </div>
                  );
                })}
              </div>
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
        <StaffCalendar
          staff={staff}
          departments={departments}
          onShiftDelete={handleCalendarShiftDelete}
        />
      </div>
    </div>
  );
}
