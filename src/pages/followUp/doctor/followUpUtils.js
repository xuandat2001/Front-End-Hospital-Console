export const FOLLOW_UP_TYPES = [
  "FOLLOW_UP_VISIT",
  "MEDICATION_REVIEW",
  "REVIEW_RESULT",
  "REPEAT_TEST",
  "REFERRAL",
  "PHONE_CHECK",
];

export const FOLLOW_UP_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

export function humanize(value) {
  return String(value || "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatDue(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function localDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isDueToday(task, now = new Date()) {
  return task.status === "PENDING" && localDateKey(task.dueAt) === localDateKey(now);
}

export function isUpcoming(task, now = new Date()) {
  const due = new Date(task.dueAt);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() + 7);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  return task.status === "PENDING" && due > todayEnd && due <= end;
}

export function statusCounts(tasks = []) {
  return tasks.reduce(
    (counts, task) => {
      if (task.status === "COMPLETED") counts.COMPLETED += 1;
      else if (task.status === "CANCELED") counts.CANCELED += 1;
      else if (task.overdue || task.displayStatus === "OVERDUE") counts.OVERDUE += 1;
      else counts.PENDING += 1;
      return counts;
    },
    { PENDING: 0, COMPLETED: 0, CANCELED: 0, OVERDUE: 0 },
  );
}

export function dueThisWeek(tasks = [], now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const count = tasks.filter(
      (task) => task.status === "PENDING" && localDateKey(task.dueAt) === localDateKey(date),
    ).length;
    return {
      label: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date),
      date: localDateKey(date),
      count,
    };
  });
}

export function taskId(task) {
  return task?.followUpEllyId || task?._id || "";
}
