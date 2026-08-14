import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const reconnectMessagingSocket = vi.fn();

vi.mock("../store/useSessionStore", () => ({
  default: {
    getState: () => ({
      accessToken: "expired-access-token",
      refreshToken: "refresh-token",
      refresh,
      currentUser: { ellyId: "ELLY-STAFF-001" },
    }),
  },
}));

vi.mock("../services/messaging/socketClient", () => ({
  connectMessagingSocket: vi.fn(),
  disconnectMessagingSocket: vi.fn(),
  getMessagingSocket: vi.fn(),
  reconnectMessagingSocket,
}));

describe("messaging socket authentication recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refresh.mockResolvedValue({ accessToken: "refreshed-access-token" });
  });

  it("refreshes and reconnects once after an invalid socket token", async () => {
    const { default: useMessagingStore } = await import("./useMessagingStore");

    await useMessagingStore
      .getState()
      .handleSocketConnectError(new Error("Invalid socket token"));
    await useMessagingStore
      .getState()
      .handleSocketConnectError(new Error("Invalid socket token"));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reconnectMessagingSocket).toHaveBeenCalledTimes(1);
    expect(useMessagingStore.getState().error).toBe("Invalid socket token");
  });

  it("does not refresh for a non-authentication connection error", async () => {
    const { default: useMessagingStore } = await import("./useMessagingStore");

    await useMessagingStore
      .getState()
      .handleSocketConnectError(new Error("Connection refused"));

    expect(refresh).not.toHaveBeenCalled();
    expect(reconnectMessagingSocket).not.toHaveBeenCalled();
    expect(useMessagingStore.getState().error).toBe("Connection refused");
  });
});
