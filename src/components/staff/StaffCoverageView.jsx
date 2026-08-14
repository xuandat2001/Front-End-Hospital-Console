import { useEffect, useState, useMemo, useCallback } from "react";
import { staffService } from "../../services/core-modules/staffApi";
import { hospitalService } from "../../services/core-modules/hospitalApi";
import StaffSearchBar from "./StaffSearchBar";
import { addLocalDays, formatLocalDate, getMonday, parseLocalDate } from "./staffScheduleDate";

const DAYS = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY",
  "FRIDAY", "SATURDAY", "SUNDAY",
];

const DAY_LABEL = {
  MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday", SUNDAY: "Sunday",
};

const DAY_MAP = { MONDAY:0,TUESDAY:1,WEDNESDAY:2,THURSDAY:3,FRIDAY:4,SATURDAY:5,SUNDAY:6 };

function addWeek(date, weeks) {
  return addLocalDays(date, weeks * 7);
}

const INITIAL_SHOW = 6;

const DEPT_COLORS = [
  "#8B5CF6","#06B6D4","#F59E0B","#EF4444","#22C55E","#3B82F6",
  "#EC4899","#14B8A6","#F97316","#6366F1","#84CC16","#D946EF",
];

function isMorning(startTime) {
  if (!startTime) return true;
  const hour = parseInt(startTime.split(":")[0], 10);
  return hour < 12;
}

export default function StaffCoverageView({ onStaffClick, editable, compact, hideSearch }) {
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [focusMember, setFocusMember] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingSlot, setEditingSlot] = useState(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [weekStart, setWeekStart] = useState(() => formatLocalDate(getMonday(new Date())));
  const [message, setMessage] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffRes, deptRes] = await Promise.allSettled([
        staffService.getAllStaff(),
        hospitalService.getAllDepartmentsList(),
      ]);
      if (staffRes.status === "fulfilled") setStaff(staffRes.value.data || []);
      if (deptRes.status === "fulfilled") setDepartments(deptRes.value || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const deptColorMap = useMemo(() => {
    const map = new Map();
    departments.forEach((d, i) => {
      const id = d.ellyDepartmentId || d._id || d.name;
      map.set(String(id), DEPT_COLORS[i % DEPT_COLORS.length]);
    });
    return map;
  }, [departments]);

  const getDeptColor = (member) => {
    const id = String(member.departmentId || "");
    return deptColorMap.get(id) || "#6B7280";
  };

  const getWeekSchedule = useCallback((member) => {
    return (member.schedule || []).filter((s) => {
      if (!s.weekStart) return true;
      return s.weekStart === weekStart;
    });
  }, [weekStart]);

  const filteredStaff = useMemo(() => {
    let result = focusMember ? [focusMember] : staff;
    const search = searchTerm.toLowerCase().trim();
    if (search) {
      result = result.filter((p) =>
        p.ellyId?.toLowerCase().includes(search) ||
        p._id?.toLowerCase().includes(search) ||
        p.fullName?.toLowerCase().includes(search)
      );
    }
    if (filterDept) {
      result = result.filter((p) => String(p.departmentId) === filterDept);
    }
    if (filterRole) {
      result = result.filter((p) => p.role?.toUpperCase() === filterRole);
    }
    return result;
  }, [staff, searchTerm, focusMember, filterDept, filterRole]);

  const onShiftStaff = useMemo(() => {
    const onShiftIds = new Set();
    for (const member of filteredStaff) {
      const weekSchedule = getWeekSchedule(member);
      const hasShift = weekSchedule.some(
        (s) => s.day && s.startTime && s.endTime
      );
      if (hasShift) onShiftIds.add(member.ellyId || member._id);
    }
    return filteredStaff.filter((m) => onShiftIds.has(m.ellyId || m._id));
  }, [filteredStaff, getWeekSchedule]);

  const stats = useMemo(() => {
    const total = onShiftStaff.length;
    const doctors = onShiftStaff.filter((p) => p.role?.toUpperCase() === "DOCTOR" || !p.role).length;
    const nurses = onShiftStaff.filter((p) => p.role?.toUpperCase() === "NURSE").length;
    return { total, doctors, nurses };
  }, [onShiftStaff]);

  const weekData = useMemo(() => {
    const data = {};
    for (const day of DAYS) {
      const morning = [];
      const afternoon = [];
      for (const member of filteredStaff) {
        const weekSchedule = getWeekSchedule(member);
        const shift = weekSchedule.find((s) => s.day === day);
        if (!shift || (!shift.startTime && !shift.endTime)) continue;
        if (isMorning(shift.startTime)) {
          morning.push({ member, shift });
        } else {
          afternoon.push({ member, shift });
        }
      }
      data[day] = { morning, afternoon };
    }
    return data;
  }, [filteredStaff, getWeekSchedule]);

  const handleFocusMember = (member) => {
    setFocusMember(member);
    setSearchTerm("");
  };

  const clearFocus = useCallback(() => {
    setFocusMember(null);
  }, []);

  const toggleExpand = (day) => {
    setExpandedDay((prev) => (prev === day ? null : day));
  };

  const visibleMembers = (list, day) => {
    const isExpanded = expandedDay === day;
    return isExpanded ? list : list.slice(0, INITIAL_SHOW);
  };

  const startEditing = (member, day, shift) => {
    setEditingSlot(`${member.ellyId || member._id}-${day}`);
    setEditStart(shift?.startTime || "");
    setEditEnd(shift?.endTime || "");
  };

  const cancelEditing = () => {
    setEditingSlot(null);
    setEditStart("");
    setEditEnd("");
  };

  const saveShift = async (member, day) => {
    try {
      const currentWeekSchedule = (member.schedule || []).filter(
        (s) => !s.weekStart || s.weekStart === weekStart
      );
      const existing = currentWeekSchedule.filter(
        (s) => !(s.day === day && (!s.weekStart || s.weekStart === weekStart))
      );
      const updated = editStart || editEnd
        ? [...existing, { day, weekStart, startTime: editStart, endTime: editEnd }]
        : existing;
      await staffService.updateSchedule(member.ellyId || member._id, updated.filter((s) => s.startTime && s.endTime), weekStart);
      cancelEditing();
      setMessage({ text: "Shift saved", type: "success" });
      loadData();
    } catch (error) {
      setMessage({ text: error.message, type: "error" });
    }
  };

  const removeShift = async (member, day) => {
    try {
      const currentWeekSchedule = (member.schedule || []).filter(
        (s) => !s.weekStart || s.weekStart === weekStart
      );
      const updated = currentWeekSchedule.filter(
        (s) => !(s.day === day && (!s.weekStart || s.weekStart === weekStart))
      );
      await staffService.updateSchedule(member.ellyId || member._id, updated, weekStart);
      cancelEditing();
      setMessage({ text: "Shift removed", type: "success" });
      loadData();
    } catch (error) {
      setMessage({ text: error.message, type: "error" });
    }
  };

  const renderSlot = (member, day, shift) => {
    const slotKey = `${member.ellyId || member._id}-${day}`;
    const isEditing = editingSlot === slotKey;
    const color = getDeptColor(member);

    if (isEditing) {
      return (
        <div className="space-y-1.5 p-1">
          <input
            type="time"
            value={editStart}
            onChange={(e) => setEditStart(e.target.value)}
            className="w-full rounded border p-1 text-[11px] dark:bg-slate-700 dark:text-white dark:border-slate-600"
          />
          <input
            type="time"
            value={editEnd}
            onChange={(e) => setEditEnd(e.target.value)}
            className="w-full rounded border p-1 text-[11px] dark:bg-slate-700 dark:text-white dark:border-slate-600"
          />
          <div className="flex gap-1">
            <button
              onClick={() => saveShift(member, day)}
              className="flex-1 rounded bg-teal-600 py-1 text-[10px] font-semibold text-white hover:bg-teal-700"
            >
              Save
            </button>
            {shift && (
              <button
                onClick={() => removeShift(member, day)}
                className="rounded bg-red-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-700"
              >
                Remove
              </button>
            )}
            <button
              onClick={cancelEditing}
              className="rounded bg-slate-400 px-2 py-1 text-[10px] font-semibold text-white hover:bg-slate-500"
            >
              X
            </button>
          </div>
        </div>
      );
    }

    return (
      <button
        onClick={() => {
          if (editable) {
            startEditing(member, day, shift);
          } else {
            handleFocusMember(member);
            onStaffClick?.(member);
          }
        }}
        className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition"
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate">{member.fullName}</span>
          {editable && (
            <span className="ml-auto shrink-0 text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {shift ? `${shift.startTime}-${shift.endTime}` : "+ Add"}
            </span>
          )}
        </div>
        {!editable && (
          <span className="ml-4 text-[10px] font-medium text-slate-500 dark:text-slate-400">
            {member.role?.toUpperCase() === "NURSE" ? "Nurse" : member.specialization || ""}
          </span>
        )}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600 mx-auto" />
          <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Loading staffing data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!compact && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border-l-4 border-violet-400 bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Staff On Duty</p>
            <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{stats.total}</p>
          </div>
          <div className="rounded-2xl border-l-4 border-indigo-400 bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Doctors</p>
            <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{stats.doctors}</p>
          </div>
          <div className="rounded-2xl border-l-4 border-cyan-400 bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nurses</p>
            <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{stats.nurses}</p>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <button onClick={() => setWeekStart(formatLocalDate(addWeek(weekStart, -1)))} className="rounded-lg border px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 dark:text-white dark:border-slate-600 dark:hover:bg-slate-700">&larr;</button>
        <button onClick={() => setWeekStart(formatLocalDate(getMonday(new Date())))} className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:text-white dark:border-slate-600 dark:hover:bg-slate-700">Today</button>
        <span className="flex-1 text-center text-sm font-semibold dark:text-white">
          {(() => {
            const start = parseLocalDate(weekStart);
            const end = addLocalDays(start, 6);
            const opts = { month: "short", day: "numeric", year: "numeric" };
            return `${start.toLocaleDateString("en-US", opts)} — ${end.toLocaleDateString("en-US", opts)}`;
          })()}
        </span>
        <button onClick={() => setWeekStart(formatLocalDate(addWeek(weekStart, 1)))} className="rounded-lg border px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 dark:text-white dark:border-slate-600 dark:hover:bg-slate-700">&rarr;</button>
      </div>

      {message && (
        <div className={`mb-4 rounded-lg px-4 py-2 text-sm font-semibold ${message.type === "error" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200" : "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200"}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-3 text-xs">&times;</button>
        </div>
      )}

      {!hideSearch && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="max-w-xs grow">
            <StaffSearchBar searchTerm={searchTerm} onSearchChange={(v) => { setSearchTerm(v); if (focusMember) setFocusMember(null); }} />
          </div>
          <select
            value={filterDept}
            onChange={(e) => { setFilterDept(e.target.value); setFocusMember(null); }}
            className="rounded border p-2 text-sm dark:bg-slate-800 dark:text-white dark:border-slate-600"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.ellyDepartmentId || d._id} value={d.ellyDepartmentId || d._id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); setFocusMember(null); }}
            className="w-36 rounded border p-2 text-sm dark:bg-slate-800 dark:text-white dark:border-slate-600"
          >
            <option value="">All Roles</option>
            <option value="DOCTOR">Doctor</option>
            <option value="NURSE">Nurse</option>
          </select>
        </div>
      )}

      {focusMember && (
        <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20">
          <div className="flex items-start justify-between gap-4 border-b border-violet-200 px-5 py-4 dark:border-violet-700">
            <div>
              <h2 className="text-xl font-bold text-violet-900 dark:text-violet-100">{focusMember.fullName}</h2>
              <p className="mt-1 text-sm text-violet-600 dark:text-violet-300">
                {focusMember.role?.toUpperCase() === "NURSE" ? "Nurse" : "Doctor"}
                {focusMember.specialization && <span> — {focusMember.specialization}</span>}
              </p>
            </div>
            <button
              onClick={clearFocus}
              className="shrink-0 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Show all staff
            </button>
          </div>
          <div className="overflow-x-auto px-5 py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-violet-200 dark:border-violet-700">
                  <th className="pb-2 text-left font-semibold text-violet-800 dark:text-violet-200">Day</th>
                  <th className="pb-2 text-left font-semibold text-violet-800 dark:text-violet-200">Clock In</th>
                  <th className="pb-2 text-left font-semibold text-violet-800 dark:text-violet-200">Clock Out</th>
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => {
                  const shift = getWeekSchedule(focusMember).find((s) => s.day === day);
                  return (
                    <tr key={day} className="border-b border-violet-100 dark:border-violet-800/50">
                      <td className="py-2.5 font-medium text-violet-900 dark:text-violet-100">{DAY_LABEL[day]}</td>
                      <td className="py-2.5 text-violet-700 dark:text-violet-300">{shift?.startTime || "—"}</td>
                      <td className="py-2.5 text-violet-700 dark:text-violet-300">{shift?.endTime || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="w-full">
        <div className="flex flex-wrap gap-4 pb-2">
          {DAYS.map((day) => {
            const { morning, afternoon } = weekData[day];
            const morningAll = [...morning];
            const afternoonAll = [...afternoon];

            const unscheduledStaff = editable
              ? filteredStaff.filter((m) => {
                  const shift = getWeekSchedule(m).find((s) => s.day === day);
                  return !shift || (!shift.startTime && !shift.endTime);
                })
              : [];

            return (
              <div key={day} className="min-w-[240px] flex-1 shrink-0 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{DAY_LABEL[day]}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {morning.length + afternoon.length} shifts
                  </p>
                </div>

                <div className="p-3 space-y-3">
                  {morning.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Morning</p>
                      <div className="space-y-1">
                        {visibleMembers(morningAll, `${day}-am`).map(({ member, shift }) => (
                          <div
                            key={member.ellyId || member._id}
                            className={`rounded-lg transition ${
                              editingSlot === `${member.ellyId || member._id}-${day}`
                                ? "bg-amber-50 ring-2 ring-amber-300 dark:bg-amber-900/30 dark:ring-amber-600"
                                : "bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30"
                            }`}
                          >
                            {renderSlot(member, day, shift)}
                          </div>
                        ))}
                        {morningAll.length > INITIAL_SHOW && expandedDay !== `${day}-am` && (
                          <button onClick={() => toggleExpand(`${day}-am`)} className="w-full rounded-lg px-3 py-2 text-center text-xs font-semibold text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/20">
                            +{morningAll.length - INITIAL_SHOW} more
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {afternoon.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">Afternoon</p>
                      <div className="space-y-1">
                        {visibleMembers(afternoonAll, `${day}-pm`).map(({ member, shift }) => (
                          <div
                            key={member.ellyId || member._id}
                            className={`rounded-lg transition ${
                              editingSlot === `${member.ellyId || member._id}-${day}`
                                ? "bg-teal-50 ring-2 ring-teal-300 dark:bg-teal-900/30 dark:ring-teal-600"
                                : "bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/20 dark:hover:bg-teal-900/30"
                            }`}
                          >
                            {renderSlot(member, day, shift)}
                          </div>
                        ))}
                        {afternoonAll.length > INITIAL_SHOW && expandedDay !== `${day}-pm` && (
                          <button onClick={() => toggleExpand(`${day}-pm`)} className="w-full rounded-lg px-3 py-2 text-center text-xs font-semibold text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/20">
                            +{afternoonAll.length - INITIAL_SHOW} more
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {editable && unscheduledStaff.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Unscheduled</p>
                      <div className="space-y-1">
                        {unscheduledStaff.slice(0, 3).map((member) => (
                          <div
                            key={member.ellyId || member._id}
                            className={`rounded-lg transition ${
                              editingSlot === `${member.ellyId || member._id}-${day}`
                                ? "bg-slate-100 ring-2 ring-slate-300 dark:bg-slate-800 dark:ring-slate-600"
                                : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800"
                            }`}
                          >
                            {renderSlot(member, day, null)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {morning.length === 0 && afternoon.length === 0 && !editable && (
                    <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-600">No staff scheduled</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
