import { describe, expect, it } from "vitest";
import {
  getRegistrationEventId,
  normalizeRegistrationEvent,
} from "../hooks/useRegistrationRealtime";

describe("useRegistrationRealtime helpers", () => {
  it("uses a stable event id across notification and kafka payloads", () => {
    const kafkaEvent = {
      eventId: "evt_123",
      eventType: "RegistrationSuccessEvent",
      timestamp: "2026-06-15T10:00:00.000Z",
      data: {
        ellyId: "ELLY-1",
        hospitalId: "HCM-2048",
        partnerId: "HCM-2048",
      },
    };

    const dbNotification = {
      eventId: "evt_123",
      eventType: "RegistrationSuccessEvent",
      hospitalId: "HCM-2048",
      payload: kafkaEvent,
      read: false,
      occurredAt: "2026-06-15T10:00:00.000Z",
    };

    expect(getRegistrationEventId(kafkaEvent)).toBe("evt_123");
    expect(getRegistrationEventId(dbNotification)).toBe("evt_123");
    expect(normalizeRegistrationEvent(kafkaEvent).eventId).toBe("evt_123");
    expect(normalizeRegistrationEvent(dbNotification).ellyId).toBe("ELLY-1");
  });
});
