import { useState } from "react";
import { createPortal } from "react-dom";
import { staffService } from "../../services/core-modules/staffApi";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export default function StaffSchedulePanel({ member, onClose, onSaved }) {
  const [schedule, setSchedule] = useState(member?.schedule || []);

  const updateShift = (day, field, value) => {
    setSchedule((prev) => {
      const existing = prev.find((s) => s.day === day);
      if (existing) {
        return prev.map((s) =>
          s.day === day ? { ...s, [field]: value } : s
        );
      }
      return [
        ...prev,
        {
          day,
          startTime: field === "startTime" ? value : "",
          endTime: field === "endTime" ? value : "",
        },
      ];
    });
  };

  const handleSave = async () => {
    try {
      const cleanedSchedule = schedule.filter((s) => s.startTime && s.endTime);
      await staffService.updateSchedule(member.ellyId, cleanedSchedule);
      onSaved?.();
      alert("Schedule updated successfully");
    } catch (error) {
      alert(error.message);
    }
  };

  const isDayOff = (day) => {
    const shift = schedule.find((s) => s.day === day);
    return !shift || (!shift.startTime && !shift.endTime);
  };

  const toggleDayOff = (day) => {
    setSchedule((prev) => {
      const existing = prev.find((s) => s.day === day);
      if (existing) {
        return prev.filter((s) => s.day !== day);
      }
      return [...prev, { day, startTime: "", endTime: "" }];
    });
  };

  if (!member) return null;

  return createPortal(
    <div
      className="console-tinted-popup-layer staff-resource-popup-layer fixed inset-0 z-[12000] flex items-center justify-center bg-black/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-schedule-title"
    >
      <div className="console-tinted-popup staff-resource-popup max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-950" data-tone="staff-resource-popup">
        <h2 id="staff-schedule-title" className="mb-2 text-xl font-bold">Schedule</h2>
        <p className="mb-4 text-sm text-slate-500">{member.fullName}</p>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm text-black dark:bg-slate-800 dark:text-white">
          <table className="w-full">
            <thead className="bg-slate-100 dark:bg-slate-700">
              <tr>
                <th className="p-4 text-left">Day</th>
                <th className="p-4 text-left">Start Time</th>
                <th className="p-4 text-left">End Time</th>
                <th className="p-4 text-left">Day Off</th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day) => {
                const shift = schedule.find((s) => s.day === day);
                return (
                  <tr key={day} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="p-4 font-medium">{day}</td>
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
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isDayOff(day)}
                          onChange={() => toggleDayOff(day)}
                        />
                        Off Day
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border px-4 py-2">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-teal-600 px-6 py-2 font-semibold text-white hover:bg-teal-700"
          >
            Save Schedule
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
