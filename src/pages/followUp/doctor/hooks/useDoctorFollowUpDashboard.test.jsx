/* @vitest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getMyFollowUps: vi.fn(), getMyFollowUpSummary: vi.fn(), updateMyFollowUp: vi.fn(), completeMyFollowUp: vi.fn(), cancelMyFollowUp: vi.fn(),
}));
vi.mock("../../../../services/followUp/followUpApi", () => ({ default: api }));
const { default: useDoctorFollowUpDashboard } = await import("./useDoctorFollowUpDashboard");

beforeEach(() => {
  vi.clearAllMocks();
  api.getMyFollowUps.mockResolvedValue({ data: [] });
  api.getMyFollowUpSummary.mockResolvedValue({ data: { dueToday: 0 } });
  api.completeMyFollowUp.mockResolvedValue({ data: { status: "COMPLETED" } });
});

it("refreshes list and summary after a mutation without a page reload", async () => {
  const { result } = renderHook(() => useDoctorFollowUpDashboard());
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => {
    await result.current.complete({ followUpEllyId: "ELLY-FUP-1" }, { completionNotes: "Done" });
  });
  expect(api.completeMyFollowUp).toHaveBeenCalledWith("ELLY-FUP-1", { completionNotes: "Done" });
  expect(api.getMyFollowUps).toHaveBeenCalledTimes(2);
  expect(api.getMyFollowUpSummary).toHaveBeenCalledTimes(2);
});
