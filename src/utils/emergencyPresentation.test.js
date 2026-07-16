import { describe, expect, it } from "vitest";
import {
  buildPersistedEmergencyTimeline,
  buildEmergencyTimeline,
  getEmergencySlaState,
  getDeadlineState,
  sortEmergencyRequests,
} from "./emergencyPresentation";

describe("emergency presentation", () => {
  it("orders requests by severity, SLA risk, then oldest waiting", () => {
    const requests = [
      {
        alertId: "oldest",
        status: "PENDING",
        severity: "CRITICAL",
        waitingSince: "2026-06-11T00:02:00.000Z",
        sla: { isRisk: false },
      },
      {
        alertId: "latest",
        status: "COMPLETED",
        severity: "LOW",
        waitingSince: "2026-06-11T00:00:00.000Z",
        sla: { isRisk: true },
      },
      {
        alertId: "middle",
        status: "ACCEPTED",
        severity: "CRITICAL",
        waitingSince: "2026-06-11T00:01:00.000Z",
        sla: { isRisk: true },
      },
    ];

    expect(
      sortEmergencyRequests(requests).map((request) => request.alertId),
    ).toEqual(["middle", "oldest", "latest"]);
  });

  it("marks pending cases due within two minutes as SLA risk", () => {
    expect(
      getEmergencySlaState(
        {
          status: "PENDING",
          timeoutAt: "2026-06-11T00:02:00.000Z",
        },
        Date.parse("2026-06-11T00:00:00.000Z"),
      ),
    ).toEqual({
      state: "AT_RISK",
      isRisk: true,
      deadlineAt: "2026-06-11T00:02:00.000Z",
    });
  });

  it("reports an overdue response deadline", () => {
    expect(
      getDeadlineState("2026-06-11T00:00:00.000Z", Date.parse("2026-06-11T00:01:00.000Z")),
    ).toEqual({ label: "Response overdue", overdue: true });
  });

  it("builds completed workflow stages from persisted notifications", () => {
    const request = {
      alertId: "alert-1",
      caseId: "case-1",
      status: "ACCEPTED",
      lastEventAt: "2026-06-11T00:01:00.000Z",
    };
    const notifications = [
      {
        alertId: "alert-1",
        eventType: "EMERGENCY_ADMISSION_REQUESTED",
        occurredAt: "2026-06-11T00:00:00.000Z",
      },
      {
        alertId: "alert-1",
        eventType: "EMERGENCY_REQUEST_ACCEPTED",
        occurredAt: "2026-06-11T00:01:00.000Z",
      },
    ];

    const timeline = buildEmergencyTimeline(request, notifications);
    expect(timeline[0].state).toBe("complete");
    expect(timeline[1].state).toBe("current");
    expect(timeline[2].state).toBe("upcoming");
  });

  it("maps persisted emergency events without inventing admission stages", () => {
    const timeline = buildPersistedEmergencyTimeline(
      {
        caseStatus: "AMBULANCE_DISPATCHED",
        updatedAt: "2026-06-11T00:03:00.000Z",
      },
      [
        {
          action: "CASE_CREATED",
          status: "CREATED",
          createdAt: "2026-06-11T00:00:00.000Z",
        },
        {
          action: "HOSPITALS_MATCHED",
          status: "MATCHING_HOSPITAL",
          createdAt: "2026-06-11T00:01:00.000Z",
        },
        {
          action: "ALERT_ACCEPTED",
          status: "ACKNOWLEDGED",
          createdAt: "2026-06-11T00:02:00.000Z",
        },
      ],
    );

    expect(timeline.map((stage) => stage.label)).not.toContain("Admission Started");
    expect(timeline.find((stage) => stage.id === "dispatched").state).toBe("current");
  });

  it("uses currentStage over stale caseStatus for the active timeline stage", () => {
    const timeline = buildPersistedEmergencyTimeline(
      {
        caseStatus: "MATCHING_HOSPITAL",
        currentStage: "ACKNOWLEDGED",
        updatedAt: "2026-06-11T00:03:00.000Z",
      },
      [
        {
          action: "CASE_CREATED",
          status: "CREATED",
          createdAt: "2026-06-11T00:00:00.000Z",
        },
        {
          action: "HOSPITALS_MATCHED",
          status: "MATCHING_HOSPITAL",
          createdAt: "2026-06-11T00:01:00.000Z",
        },
      ],
    );

    expect(timeline.find((stage) => stage.id === "matched").state).toBe("completed");
    expect(timeline.find((stage) => stage.id === "acknowledged").state).toBe("current");
  });
});
