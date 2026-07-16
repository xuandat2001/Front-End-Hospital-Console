import { describe, expect, it } from "vitest";
import {
  buildUnifiedNotifications,
  countActionRequiredNotifications,
  filterNotifications,
  getLatestNotification,
} from "./notificationPresentation";

describe("notificationPresentation", () => {
  const realtime = {
    requests: [
      { alertId: "alert-1", status: "ACCEPTED", severity: "Critical" },
      { alertId: "alert-2", status: "PENDING", severity: "High" },
    ],
    notifications: [
      {
        eventId: "emergency-old",
        eventType: "EMERGENCY_ADMISSION_REQUESTED",
        alertId: "alert-1",
        occurredAt: "2026-06-14T10:00:00.000Z",
      },
      {
        eventId: "emergency-new",
        eventType: "EMERGENCY_ADMISSION_REQUESTED",
        alertId: "alert-2",
        occurredAt: "2026-06-15T10:00:00.000Z",
      },
    ],
  };

  const registrationRealtime = {
    notifications: [
      {
        eventId: "reg-new",
        eventType: "RegistrationSuccessEvent",
        ellyId: "ELLY-1",
        occurredAt: "2026-06-15T12:00:00.000Z",
        read: false,
      },
      {
        eventId: "reg-read",
        eventType: "RegistrationSuccessEvent",
        ellyId: "ELLY-3",
        occurredAt: "2026-06-15T11:00:00.000Z",
        read: true,
      },
      {
        eventId: "reg-old",
        eventType: "RegistrationSuccessEvent",
        ellyId: "ELLY-2",
        occurredAt: "2026-06-14T12:00:00.000Z",
        read: true,
      },
    ],
  };

  it("returns unified notifications with newest first", () => {
    const notifications = buildUnifiedNotifications(
      realtime,
      registrationRealtime,
    );

    expect(notifications.map((item) => item.id)).toEqual([
      "reg-new",
      "reg-read",
      "emergency-new",
      "reg-old",
      "emergency-old",
    ]);
  });

  it("treats registrations as informational auto-accepted events", () => {
    const notifications = buildUnifiedNotifications(
      realtime,
      registrationRealtime,
    );

    expect(notifications.find((item) => item.id === "reg-new")).toMatchObject({
      actionRequired: false,
      statusLabel: "Auto-accepted",
      actionLabel: "Open record",
    });
    expect(notifications.find((item) => item.id === "reg-old")).toMatchObject({
      actionRequired: false,
      statusLabel: "Auto-accepted",
    });
    expect(
      notifications.find((item) => item.id === "emergency-new"),
    ).toMatchObject({
      actionRequired: true,
      statusLabel: "Action required",
    });
    expect(
      notifications.find((item) => item.id === "emergency-old"),
    ).toMatchObject({
      actionRequired: false,
      statusLabel: "Accepted",
    });
  });

  it("uses the same newest notification for bar and list", () => {
    const notifications = buildUnifiedNotifications(
      realtime,
      registrationRealtime,
    );
    const latest = getLatestNotification(realtime, registrationRealtime);

    expect(latest?.id).toBe(notifications[0]?.id);
    expect(latest?.id).toBe("reg-new");
  });

  it("filters action-required and completed notifications", () => {
    const notifications = buildUnifiedNotifications(
      realtime,
      registrationRealtime,
    );

    expect(
      filterNotifications(notifications, "action-required").map(
        (item) => item.id,
      ),
    ).toEqual(["emergency-new"]);
    expect(
      filterNotifications(notifications, "completed").map((item) => item.id),
    ).toEqual(["reg-new", "reg-read", "reg-old", "emergency-old"]);
    expect(countActionRequiredNotifications(notifications)).toBe(1);
  });

  it("never flags live registrations as action required", () => {
    const notifications = buildUnifiedNotifications(realtime, {
      notifications: [
        {
          eventId: "reg-live",
          eventType: "RegistrationSuccessEvent",
          ellyId: "ELLY-9",
          occurredAt: "2026-06-15T13:00:00.000Z",
          read: false,
        },
      ],
    });

    expect(notifications[0]).toMatchObject({
      actionRequired: false,
      statusLabel: "Auto-accepted",
    });
  });
});
