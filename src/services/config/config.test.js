import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApi = vi.hoisted(() => ({
  request: vi.fn(),
  requestBlob: vi.fn(),
}));

vi.mock("../mock/mockApi", () => ({
  mockApiRequest: mockApi.request,
  mockApiRequestBlob: mockApi.requestBlob,
}));

import { API_BASE_URL, apiRequest, apiRequestBlob } from "./config";

describe("prototype API config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes JSON requests through the local mock API", async () => {
    mockApi.request.mockResolvedValueOnce({ success: true, data: { id: "appointment-1" } });

    await expect(apiRequest("/bookings/appointment-1", { method: "GET" })).resolves.toEqual({
      success: true,
      data: { id: "appointment-1" },
    });

    expect(API_BASE_URL).toBe("mock://elly-prototype/api");
    expect(mockApi.request).toHaveBeenCalledWith("/bookings/appointment-1", { method: "GET" });
  });

  it("routes export requests through the local mock blob API", async () => {
    const blob = new Blob(["mock export"], { type: "text/plain" });
    mockApi.requestBlob.mockResolvedValueOnce(blob);

    await expect(apiRequestBlob("/reports/export")).resolves.toBe(blob);

    expect(mockApi.requestBlob).toHaveBeenCalledWith("/reports/export", {});
  });
});
