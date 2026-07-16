/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import Emergency from "./Emergency";
import { getEmergencyCaseTimeline } from "../../../services/emergency/emergencyRealtimeApi";

vi.mock("../../../services/emergency/emergencyRealtimeApi", () => ({
  getEmergencyCaseTimeline: vi.fn(),
  hospitalIdentity: {
    ellyId: "ELLY-STAFF-TEST",
    partnerId: "HCM-TEST",
    role: "EMERGENCY_CHIEF",
  },
}));

const activeCases = [
  {
    alertId: "alert-1",
    caseId: "case-1",
    caseStatus: "MATCHING_HOSPITAL",
    currentStage: "MATCHING_HOSPITAL",
    ellyId: "ELLY-PAT-001",
    requiredSpecialty: "Cardiology",
    severity: "CRITICAL",
    status: "PENDING",
    timeoutAt: "2099-06-11T00:02:00.000Z",
    transport: { ambulanceId: "AMB-1", eta: "2099-06-11T00:12:00.000Z" },
    updatedAt: "2099-06-11T00:01:00.000Z",
    waitingSince: "2099-06-11T00:00:00.000Z",
  },
  {
    alertId: "alert-2",
    caseId: "case-2",
    caseStatus: "AMBULANCE_DISPATCHED",
    currentStage: "AMBULANCE_DISPATCHED",
    ellyId: "ELLY-PAT-002",
    requiredSpecialty: "Trauma",
    severity: "HIGH",
    status: "ACCEPTED",
    transport: { ambulanceLabel: "Unit 4" },
    updatedAt: "2099-06-11T00:03:00.000Z",
    waitingSince: "2099-06-11T00:01:00.000Z",
  },
];

const pastCase = {
  alertId: "alert-3",
  caseId: "case-3",
  caseStatus: "MATCHING_HOSPITAL",
  currentStage: "MATCHING_HOSPITAL",
  ellyId: "ELLY-PAT-003",
  requiredSpecialty: "Neurology",
  severity: "HIGH",
  status: "REJECTED",
  rejectionReason: "No specialist available",
  createdAt: "2099-06-10T23:50:00.000Z",
  lastEventAt: "2099-06-10T23:55:00.000Z",
  transport: { ambulanceId: "AMB-3" },
  updatedAt: "2099-06-10T23:55:00.000Z",
};

function renderEmergency(overrides = {}) {
  const realtime = {
    acknowledge: vi.fn().mockResolvedValue({}),
    activeCases,
    connectionState: "connected",
    error: "",
    loading: false,
    pendingAlertId: "",
    refresh: vi.fn(),
    requests: activeCases,
    resources: {
      ambulances: { available: 3, total: 4, occupancyPercent: 25 },
      erBeds: { available: 4, total: 12, occupancyPercent: 66 },
      icuBeds: { available: 1, total: 8, occupancyPercent: 88 },
      emergencyStaff: { available: 9, total: 12, occupancyPercent: 25 },
    },
    summary: {
      activeCases: 2,
      availableAmbulances: 3,
      avgResponseTimeMinutes: 8,
      criticalCases: 1,
      slaRiskCases: 1,
      trends: {},
    },
    ...overrides,
  };

  return render(<Emergency realtime={realtime} />);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Emergency dashboard", () => {
  it("renders compact command signals without average response", async () => {
    getEmergencyCaseTimeline.mockResolvedValue([]);

    renderEmergency();

    expect(screen.getByText("Active cases")).toBeInTheDocument();
    expect(screen.getByText("SLA risk")).toBeInTheDocument();
    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(screen.getAllByText("Ambulances").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Avg response/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open active emergency queue/i }),
    ).toHaveTextContent("1 need review");
  });

  it("opens the queue popover from the active case trigger", async () => {
    getEmergencyCaseTimeline.mockResolvedValue([]);
    const user = userEvent.setup();

    renderEmergency();
    await user.click(
      screen.getByRole("button", { name: /open active emergency queue/i }),
    );

    expect(screen.getByRole("heading", { name: /case queue/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /track emergency case case-1/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^accept$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^reject$/i })).toBeInTheDocument();
  });

  it("accepts a pending emergency request from the queue", async () => {
    getEmergencyCaseTimeline.mockResolvedValue([]);
    const acknowledge = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();

    renderEmergency({ acknowledge });
    await user.click(
      screen.getByRole("button", { name: /open active emergency queue/i }),
    );
    await user.click(screen.getByRole("button", { name: /^accept$/i }));

    expect(acknowledge).toHaveBeenCalledWith("alert-1", true, undefined);
  });

  it("rejects a pending emergency request from the queue with a reason", async () => {
    getEmergencyCaseTimeline.mockResolvedValue([]);
    const acknowledge = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();

    renderEmergency({ acknowledge });
    await user.click(
      screen.getByRole("button", { name: /open active emergency queue/i }),
    );
    await user.click(screen.getByRole("button", { name: /^reject$/i }));
    await user.clear(screen.getByLabelText(/rejection reason/i));
    await user.type(screen.getByLabelText(/rejection reason/i), "ICU unavailable");
    await user.click(screen.getByRole("button", { name: /confirm reject/i }));

    expect(acknowledge).toHaveBeenCalledWith("alert-1", false, "ICU unavailable");
  });

  it("moves a rejected request out of the active queue immediately", async () => {
    getEmergencyCaseTimeline.mockResolvedValue([]);
    const acknowledge = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();

    renderEmergency({ acknowledge });
    await user.click(
      screen.getByRole("button", { name: /open active emergency queue/i }),
    );
    await user.click(screen.getByRole("button", { name: /^reject$/i }));
    await user.clear(screen.getByLabelText(/rejection reason/i));
    await user.type(screen.getByLabelText(/rejection reason/i), "ICU unavailable");
    await user.click(screen.getByRole("button", { name: /confirm reject/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /track emergency case case-1/i }),
      ).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^past/i }));

    expect(
      screen.getByRole("button", { name: /track emergency case case-1/i }),
    ).toBeInTheDocument();
  });

  it("shows historical emergency cases from the past queue view", async () => {
    getEmergencyCaseTimeline.mockResolvedValue([]);
    const user = userEvent.setup();

    renderEmergency({ requests: [...activeCases, pastCase] });
    await user.click(
      screen.getByRole("button", { name: /open active emergency queue/i }),
    );

    expect(
      screen.queryByRole("button", { name: /track emergency case case-3/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^past/i }));

    expect(
      screen.getByRole("button", { name: /track emergency case case-3/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("ELLY-PAT-003")).toBeInTheDocument();
  });

  it("selects a queue row for live case tracking and closes the popover", async () => {
    getEmergencyCaseTimeline.mockResolvedValue([]);
    const user = userEvent.setup();

    renderEmergency();
    await user.click(
      screen.getByRole("button", { name: /open active emergency queue/i }),
    );
    await user.click(screen.getByRole("button", { name: /track emergency case case-2/i }));

    expect(await screen.findByText("Case case-2")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /case queue/i })).not.toBeInTheDocument();
    });
  });

  it("closes the queue popover with Escape", async () => {
    getEmergencyCaseTimeline.mockResolvedValue([]);
    const user = userEvent.setup();

    renderEmergency();
    await user.click(
      screen.getByRole("button", { name: /open active emergency queue/i }),
    );
    expect(screen.getByRole("heading", { name: /case queue/i })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /case queue/i })).not.toBeInTheDocument();
    });
  });
});
