import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MESSAGING_SOCKET_URL,
  connectMessagingSocket,
  disconnectMessagingSocket,
  getMessagingSocket,
  reconnectMessagingSocket,
} from "./socketClient";

describe("prototype messaging socket client", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    disconnectMessagingSocket();
  });

  afterEach(() => {
    disconnectMessagingSocket();
    vi.useRealTimers();
  });

  it("uses a local mock socket and dispatches registered events", () => {
    const onConnect = vi.fn();
    const onMessage = vi.fn();

    const socket = connectMessagingSocket({ connect: onConnect });
    socket.on("message:new", onMessage);
    socket.emit("message:new", { id: "msg-1" });
    vi.runOnlyPendingTimers();

    expect(MESSAGING_SOCKET_URL).toBe("mock://elly-prototype/messages");
    expect(socket.connected).toBe(true);
    expect(onConnect).toHaveBeenCalledOnce();
    expect(onMessage).toHaveBeenCalledWith({ id: "msg-1" });
  });

  it("reuses, reconnects, and disconnects the singleton mock socket", () => {
    const first = connectMessagingSocket();
    const second = connectMessagingSocket();

    expect(first).toBe(second);
    expect(getMessagingSocket()).toBe(first);

    const reconnected = reconnectMessagingSocket();
    expect(reconnected).toBe(first);
    expect(reconnected.connected).toBe(true);

    disconnectMessagingSocket();
    expect(getMessagingSocket()).toBeNull();
  });
});
