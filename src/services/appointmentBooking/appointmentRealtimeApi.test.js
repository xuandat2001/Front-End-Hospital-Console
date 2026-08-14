import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APPOINTMENT_SOCKET_PATH,
  APPOINTMENT_SOCKET_URL,
  connectAppointmentRealtime,
} from "./appointmentRealtimeApi";

describe("prototype appointment realtime client", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs local ready, change, and disconnect callbacks without opening a socket", () => {
    const handlers = {
      onReady: vi.fn(),
      onChanged: vi.fn(),
      onDisconnect: vi.fn(),
    };

    const socket = connectAppointmentRealtime(handlers);

    expect(APPOINTMENT_SOCKET_URL).toBe("mock://elly-prototype/appointments");
    expect(APPOINTMENT_SOCKET_PATH).toBe("/mock/socket.io");
    expect(socket.connected).toBe(true);

    vi.advanceTimersByTime(120);
    expect(handlers.onReady).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(30000);
    expect(handlers.onChanged).toHaveBeenCalledOnce();

    socket.disconnect();
    expect(handlers.onDisconnect).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(30000);
    expect(handlers.onChanged).toHaveBeenCalledOnce();
  });
});
