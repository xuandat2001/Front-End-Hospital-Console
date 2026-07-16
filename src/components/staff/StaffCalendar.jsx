import { useState, useMemo } from "react";

const DAY_MAP = { MONDAY:0,TUESDAY:1,WEDNESDAY:2,THURSDAY:3,FRIDAY:4,SATURDAY:5,SUNDAY:6 };
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_ABBR = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const DEPT_COLORS = [
  "#8B5CF6","#06B6D4","#F59E0B","#EF4444","#22C55E","#3B82F6",
  "#EC4899","#14B8A6","#F97316","#6366F1","#84CC16","#D946EF",
];


export default function StaffCalendar({ staff = [], departments = [], onStaffClick }) {
  const [selectedDept, setSelectedDept] = useState(null);

  const filteredStaff = useMemo(() => {
    if (!selectedDept) return staff;
    return staff.filter((p) => String(p.departmentId || "") === selectedDept);
  }, [staff, selectedDept]);
  const deptColorMap = useMemo(() => {
    const map = new Map();
    departments.forEach((d, i) => {
      const id = d.ellyDepartmentId || d._id || d.name;
      map.set(String(id), DEPT_COLORS[i % DEPT_COLORS.length]);
    });
    return map;
  }, [departments]);

  const deptNameMap = useMemo(() => {
    const map = new Map();
    departments.forEach((d) => {
      const id = d.ellyDepartmentId || d._id || d.name;
      map.set(String(id), d.name || id);
    });
    return map;
  }, [departments]);

  const getStaffDeptColor = (person) => {
    const id = String(person.departmentId || "");
    return deptColorMap.get(id) || "#6B7280";
  };

  const getStaffDeptName = (person) => {
    const id = String(person.departmentId || "");
    return deptNameMap.get(id) || id;
  };

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const daysInMonth = Array.from({ length: totalDays }, (_, i) => i + 1);

  function getWeekStartOfDate(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date.toISOString().split("T")[0];
  }

  const shiftsByDate = useMemo(() => {
    const map = {};
    for (const person of filteredStaff) {
      for (const shift of person.schedule || []) {
        if (!shift.day || !shift.startTime || !shift.endTime) continue;
        const dow = DAY_MAP[shift.day];
        for (const date of daysInMonth) {
          const d = new Date(year, month, date);
          if (d.getDay() !== dow) continue;

          if (shift.weekStart) {
            const expectedDate = new Date(shift.weekStart + "T00:00:00");
            expectedDate.setDate(expectedDate.getDate() + dow);
            if (expectedDate.toISOString().split("T")[0] !== d.toISOString().split("T")[0]) continue;
          } else {
            const currentWeek = getWeekStartOfDate(today);
            const dateWeek = getWeekStartOfDate(d);
            if (dateWeek !== currentWeek) continue;
          }

          const key = String(date);
          if (!map[key]) map[key] = [];
          map[key].push({ person, shift });
        }
      }
    }
    return map;
  }, [filteredStaff]);

  const deptSummaryByDate = useMemo(() => {
    const summary = {};
    for (const [date, shifts] of Object.entries(shiftsByDate)) {
      const deptCounts = {};
      for (const { person } of shifts) {
        const deptId = String(person.departmentId || "");
        deptCounts[deptId] = (deptCounts[deptId] || 0) + 1;
      }
      summary[date] = Object.entries(deptCounts).map(([deptId, count]) => ({
        deptId,
        name: deptNameMap.get(deptId) || deptId,
        color: deptColorMap.get(deptId) || "#6B7280",
        count,
      }));
    }
    return summary;
  }, [shiftsByDate, deptNameMap, deptColorMap]);

  const grid = [];
  let cells = Array(startPad).fill(null);
  for (const date of daysInMonth) {
    cells.push(date);
    if (cells.length === 7) {
      grid.push(cells);
      cells = [];
    }
  }
  if (cells.length) {
    while (cells.length < 7) cells.push(null);
    grid.push(cells);
  }

  const [popupDate, setPopupDate] = useState(null);

  const closePopup = () => setPopupDate(null);

  const openPopup = (date) => setPopupDate(date);

  const popupShifts = useMemo(() => {
    if (!popupDate) return [];
    return shiftsByDate[String(popupDate)] || [];
  }, [popupDate, shiftsByDate]);

  const filteredPopupShifts = useMemo(() => {
    if (!selectedDept) return popupShifts;
    return popupShifts.filter(({ person }) => String(person.departmentId || "") === selectedDept);
  }, [popupShifts, selectedDept]);

  const weekDayName = (date) => {
    const d = new Date(year, month, date);
    return DAY_ABBR[d.getDay()];
  };

  return (
    <div>
      <div className="mb-3">
        <h3 className="text-lg font-bold dark:text-white">
          {MONTHS[month]} {year}
        </h3>
      </div>
      <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap gap-1.5">
          {selectedDept && (
            <button
              onClick={() => setSelectedDept(null)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2.5 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              ✕ Clear filter
            </button>
          )}
          {departments.map((d, i) => {
            const deptId = String(d.ellyDepartmentId || d._id || d.name);
            const isActive = selectedDept === deptId;
            return (
              <button
                key={d._id || i}
                onClick={() => setSelectedDept(isActive ? null : deptId)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-all ${
                  isActive
                    ? 'shadow-sm ring-1'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  borderColor: isActive ? DEPT_COLORS[i % DEPT_COLORS.length] : DEPT_COLORS[i % DEPT_COLORS.length] + '40',
                  backgroundColor: isActive ? DEPT_COLORS[i % DEPT_COLORS.length] + '20' : DEPT_COLORS[i % DEPT_COLORS.length] + '10',
                  color: DEPT_COLORS[i % DEPT_COLORS.length],
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                {d.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px rounded-xl border border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-700 overflow-hidden">
        {DAY_ABBR.map((d) => (
          <div key={d} className="bg-slate-50 px-2 py-1.5 text-center text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {d}
          </div>
        ))}
        {grid.flat().map((date, i) => {
          if (date === null) return <div key={`empty-${i}`} className="bg-white dark:bg-slate-900 min-h-[80px]" />;
          const isToday = date === today.getDate();
          const dayShifts = shiftsByDate[String(date)] || [];
          return (
            <div
              key={date}
              onClick={() => openPopup(date)}
              className={`min-h-[80px] bg-white p-1 dark:bg-slate-900 ${
                isToday ? "ring-2 ring-inset ring-violet-400" : ""
              } cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800`}
            >
              <span className={`text-[10px] font-bold ${isToday ? "text-violet-600 dark:text-violet-400" : "text-slate-400 dark:text-slate-500"}`}>
                {date}
              </span>
              {dayShifts.length > 0 && (() => {
                const deptSummary = deptSummaryByDate[String(date)] || [];
                return (
                  <div className="mt-0.5 space-y-0.5">
                    <div className="text-sm font-bold dark:text-white">{dayShifts.length}</div>
                    <div className="flex items-center gap-1 text-[9px] leading-tight text-slate-600 dark:text-slate-400">
                      <span>👨‍⚕️</span>
                      <span className="font-semibold">{dayShifts.length} Staff</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] leading-tight text-slate-600 dark:text-slate-400">
                      <span>🏥</span>
                      <span className="font-semibold">{deptSummary.length} Depts</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {popupDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closePopup}>
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:border dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold dark:text-white">
                {weekDayName(popupDate)}, {MONTHS[month]} {popupDate}, {year}
              </h3>
              <button onClick={closePopup} className="rounded-lg px-3 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">&times;</button>
            </div>

            {filteredPopupShifts.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">No staff scheduled this day</p>
            )}

            <div className="space-y-2">
              {filteredPopupShifts.map(({ person, shift }) => {
                const personId = person.ellyId || person._id;
                const color = getStaffDeptColor(person);
                return (
                  <div
                    key={personId}
                    onClick={() => onStaffClick?.(person)}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 hover:opacity-70 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <div>
                        <span className="text-sm font-semibold dark:text-white">{person.fullName}</span>
                        <p className="text-[10px] text-slate-400">{getStaffDeptName(person)}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {shift.startTime}-{shift.endTime}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
