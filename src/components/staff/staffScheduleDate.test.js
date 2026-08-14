import { describe, expect, it } from "vitest";
import { addLocalDays, formatLocalDate, getMonday, parseLocalDate } from "./staffScheduleDate";

describe("staff schedule local dates", () => {
  it("keeps a local Monday on the same calendar date", () => {
    const monday = getMonday(new Date(2026, 7, 6, 12));
    expect(formatLocalDate(monday)).toBe("2026-08-03");
  });

  it("parses date-only values as local dates", () => {
    const date = parseLocalDate("2026-08-03");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(3);
  });

  it("maps a weekly Sunday without crossing UTC boundaries", () => {
    const sunday = addLocalDays(parseLocalDate("2026-08-03"), 6);
    expect(formatLocalDate(sunday)).toBe("2026-08-09");
  });
});
