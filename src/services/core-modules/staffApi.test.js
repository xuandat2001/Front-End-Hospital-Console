import { beforeEach, describe, expect, it, vi } from "vitest";
import { staffService } from "./staffApi";
import { apiRequest } from "../config/config";

vi.mock("../config/config", () => ({
  apiRequest: vi.fn(),
}));

beforeEach(() => {
  apiRequest.mockReset();
});

describe("staffService", () => {
  it("requests staff with and without role filtering", async () => {
    apiRequest.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [] });

    await staffService.getAllStaff();
    await staffService.getAllStaff("doctor");

    expect(apiRequest).toHaveBeenNthCalledWith(1, "/staff");
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/staff?role=doctor");
  });

  it("sends staff create, update, delete, department assignment, and schedule requests", async () => {
    apiRequest.mockResolvedValue({ success: true });
    const staffPayload = { fullName: "Dr Maya Chen", hospitalId: "HOSP-1" };
    const schedule = [{ day: "MONDAY", startTime: "08:00", endTime: "16:00" }];

    await staffService.createStaff(staffPayload);
    await staffService.updateStaff("ELLY-STAFF-1", { status: "BUSY" });
    await staffService.deleteStaff("ELLY-STAFF-1");
    await staffService.assignDepartment("ELLY-STAFF-1", "CARD");
    await staffService.getScheduleByWeek("ELLY-STAFF-1", "2026-08-10");
    await staffService.updateSchedule("ELLY-STAFF-1", schedule, "2026-08-10");

    expect(apiRequest).toHaveBeenNthCalledWith(1, "/staff", {
      method: "POST",
      body: JSON.stringify(staffPayload),
    });
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/staff/ELLY-STAFF-1", {
      method: "PUT",
      body: JSON.stringify({ status: "BUSY" }),
    });
    expect(apiRequest).toHaveBeenNthCalledWith(3, "/staff/ELLY-STAFF-1", {
      method: "DELETE",
    });
    expect(apiRequest).toHaveBeenNthCalledWith(4, "/staff/ELLY-STAFF-1/department", {
      method: "PUT",
      body: JSON.stringify({ departmentId: "CARD" }),
    });
    expect(apiRequest).toHaveBeenNthCalledWith(
      5,
      "/staff/ELLY-STAFF-1/schedule?weekStart=2026-08-10",
    );
    expect(apiRequest).toHaveBeenNthCalledWith(6, "/staff/ELLY-STAFF-1/schedule", {
      method: "PUT",
      body: JSON.stringify({ schedule, weekStart: "2026-08-10" }),
    });
  });
});
