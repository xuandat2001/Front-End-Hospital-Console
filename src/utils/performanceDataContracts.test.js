import { describe, expect, it } from "vitest";
import {
  clampPercent,
  extractCollection,
  finiteNumber,
  safeAverage,
  safePercent,
} from "./performanceDataContracts";

describe("performance data contracts", () => {
  it("returns an empty collection for the object-shaped mock fallback that crashed records.forEach", () => {
    const fallbackResponse = {
      success: true,
      data: { ok: true, mock: true, path: "/intelligence/admission-performance" },
    };

    expect(typeof fallbackResponse.data).toBe("object");
    expect(Array.isArray(fallbackResponse.data)).toBe(false);
    expect(extractCollection(fallbackResponse)).toEqual([]);
  });

  it("extracts common paginated collection shapes", () => {
    const records = [{ id: "record-1" }];

    expect(extractCollection({ success: true, data: records })).toBe(records);
    expect(extractCollection({ success: true, data: { records } })).toBe(records);
    expect(extractCollection({ success: true, data: { items: records } })).toBe(records);
  });

  it("keeps chart numbers finite and percentage widths bounded", () => {
    expect(finiteNumber("12")).toBe(12);
    expect(finiteNumber("not-a-number", 7)).toBe(7);
    expect(safeAverage([{ score: 10 }, { score: "20" }, { score: Infinity }], "score")).toBe(15);
    expect(safePercent(5, 0)).toBe(0);
    expect(clampPercent(135)).toBe(100);
    expect(clampPercent(-20)).toBe(0);
  });
});
