/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import EmergencyPlanningTab from "./EmergencyPlanningTab";
import EmergencyReportsTab from "./EmergencyReportsTab";
import EmergencyResourceTab from "./EmergencyResourceTab";
import { clearEmergencyWidgetCache } from "./emergencyWidgetLoader";
import {
  getDailyEmergencySummary,
  getDelayRootCauseReport,
  getEmergencyAmbulances,
  getEmergencyBeds,
  getEmergencyCaseAudit,
  getEmergencyEquipment,
  getEmergencyResourceBottlenecks,
  getEmergencyStaff,
  getPlanningAmbulanceDemand,
  getPlanningCapacityForecast,
  getPlanningRecommendations,
  getPlanningStaffingGap,
  getPlanningVolumeForecast,
  getSlaComplianceReport,
} from "../../../../services/emergency/emergencyCommandApi";

vi.mock("../../../../services/emergency/emergencyCommandApi", () => ({
  getPlanningVolumeForecast: vi.fn(),
  getPlanningCapacityForecast: vi.fn(),
  getPlanningStaffingGap: vi.fn(),
  getPlanningAmbulanceDemand: vi.fn(),
  getPlanningRecommendations: vi.fn(),
  getEmergencyAmbulances: vi.fn(),
  getEmergencyBeds: vi.fn(),
  getEmergencyStaff: vi.fn(),
  getEmergencyEquipment: vi.fn(),
  getEmergencyResourceBottlenecks: vi.fn(),
  getDailyEmergencySummary: vi.fn(),
  getEmergencyCaseAudit: vi.fn(),
  getSlaComplianceReport: vi.fn(),
  getDelayRootCauseReport: vi.fn(),
  exportDailySummary: vi.fn(),
  exportSlaReport: vi.fn(),
  exportCaseAudit: vi.fn(),
  exportDelayRootCauses: vi.fn(),
}));

function mockPlanningApis() {
  getPlanningVolumeForecast.mockResolvedValue({
    confidence: 0.91,
    buckets: [{ key: "h1", label: "01:00", expectedCases: 4 }],
  });
  getPlanningCapacityForecast.mockResolvedValue({
    confidence: 0.88,
    riskWindow: null,
    buckets: [{ key: "h1", label: "01:00", erOccupancyPercentage: 68, icuOccupancyPercentage: 72 }],
  });
  getPlanningStaffingGap.mockResolvedValue({
    confidence: 0.82,
    currentStatus: "stable",
    availableDoctors: 5,
    requiredDoctors: 4,
    doctorShortage: 0,
    availableNurses: 9,
    requiredNurses: 8,
    nurseShortage: 0,
  });
  getPlanningAmbulanceDemand.mockResolvedValue({
    confidence: 0.84,
    buckets: [{ key: "h1", label: "01:00", expectedDemand: 2, availableCapacity: 3, status: "stable" }],
  });
  getPlanningRecommendations.mockResolvedValue({
    recommendations: [
      {
        recommendationId: "rec-1",
        severity: "warning",
        confidence: 0.81,
        message: "Stage one overflow team",
        reason: "Volume is rising",
        source: "forecast",
      },
    ],
  });
}

function mockResourceApis() {
  getEmergencyAmbulances.mockResolvedValue([
    { ambulanceId: "AMB-1", status: "Available", currentZone: "Bay A" },
  ]);
  getEmergencyBeds.mockResolvedValue({
    erBeds: { available: 4, occupied: 8, total: 12, occupancyPercentage: 66, status: "stable" },
    icuBeds: { available: 1, occupied: 7, total: 8, occupancyPercentage: 88, status: "warning" },
    traumaBeds: { available: 2, occupied: 2, total: 4, occupancyPercentage: 50, status: "stable" },
    isolationBeds: { available: 1, occupied: 1, total: 2, occupancyPercentage: 50, status: "stable" },
  });
  getEmergencyStaff.mockResolvedValue([
    {
      staffId: "staff-1",
      name: "Dr. Linh",
      role: "DOCTOR",
      specialization: "Emergency Medicine",
      status: "Available",
      workloadLevel: "normal",
      shiftEndTime: "2026-06-26T10:00:00.000Z",
    },
  ]);
  getEmergencyEquipment.mockResolvedValue([
    { type: "Ventilators", available: 3, inUse: 2, maintenance: 0, offline: 0, status: "stable" },
  ]);
  getEmergencyResourceBottlenecks.mockResolvedValue([
    {
      bottleneckId: "bot-1",
      severity: "critical",
      affectedResourceType: "ICU beds",
      impact: "One bed left",
      suggestedAction: "Prepare transfer route",
    },
  ]);
}

function mockReportApis() {
  getDailyEmergencySummary.mockResolvedValue({
    totalEmergencyCases: 12,
    criticalCases: 2,
    delayedCases: 1,
    escalations: 1,
    averageResponseTimeMinutes: 6.4,
    slaCompliancePercentage: 91.7,
  });
  getSlaComplianceReport.mockResolvedValue({
    rows: [
      {
        caseId: "case-1",
        ellyId: "ELLY-2026-0001",
        severity: "CRITICAL",
        responseTimeMinutes: 4,
        slaResult: "MET",
      },
    ],
  });
  getDelayRootCauseReport.mockResolvedValue({
    rows: [{ reason: "Ambulance unavailable", count: 2 }],
  });
  getEmergencyCaseAudit.mockResolvedValue({
    case: {
      caseId: "case-1",
      ellyId: "ELLY-2026-0001",
      severity: "CRITICAL",
      status: "ACTIVE",
    },
    events: [
      {
        traceId: "evt-1",
        timestamp: "2026-06-26T09:00:00.000Z",
        action: "CASE_CREATED",
        actor: "SYSTEM",
        resource: "Emergency case",
        type: "operational",
      },
    ],
  });
}

afterEach(() => {
  cleanup();
  clearEmergencyWidgetCache();
  vi.clearAllMocks();
});

describe("Emergency command tabs", () => {
  it("loads planning forecast widgets", async () => {
    mockPlanningApis();
    render(<EmergencyPlanningTab />);

    expect(await screen.findByText("Emergency planning")).toBeInTheDocument();
    expect(await screen.findByText("Stage one overflow team")).toBeInTheDocument();

    await waitFor(() => {
      expect(getPlanningVolumeForecast).toHaveBeenCalledWith(
        24,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(getPlanningCapacityForecast).toHaveBeenCalledWith(
        24,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(getPlanningStaffingGap).toHaveBeenCalledWith(
        12,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(getPlanningAmbulanceDemand).toHaveBeenCalledWith(
        12,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(getPlanningRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });

  it("uses cached planning data when revisiting within the cache window", async () => {
    mockPlanningApis();
    render(<EmergencyPlanningTab />);

    expect(await screen.findByText("Stage one overflow team")).toBeInTheDocument();
    cleanup();

    render(<EmergencyPlanningTab />);
    expect(await screen.findByText("Stage one overflow team")).toBeInTheDocument();

    expect(getPlanningVolumeForecast).toHaveBeenCalledTimes(1);
    expect(getPlanningCapacityForecast).toHaveBeenCalledTimes(1);
    expect(getPlanningStaffingGap).toHaveBeenCalledTimes(1);
    expect(getPlanningAmbulanceDemand).toHaveBeenCalledTimes(1);
    expect(getPlanningRecommendations).toHaveBeenCalledTimes(1);
  });

  it("bypasses cached planning data on manual refresh", async () => {
    mockPlanningApis();
    const user = userEvent.setup();
    render(<EmergencyPlanningTab />);

    expect(await screen.findByText("Stage one overflow team")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /refresh forecasts/i }));

    await waitFor(() => {
      expect(getPlanningVolumeForecast).toHaveBeenCalledTimes(2);
      expect(getPlanningRecommendations).toHaveBeenCalledTimes(2);
    });
  });

  it("loads resource readiness widgets", async () => {
    mockResourceApis();
    render(<EmergencyResourceTab realtime={{ activeCases: [], summary: {} }} />);

    expect(await screen.findByText("Emergency resources")).toBeInTheDocument();
    expect(await screen.findByText("AMB-1")).toBeInTheDocument();
    expect(screen.getByText("Dr. Linh")).toBeInTheDocument();
    expect(screen.getByText("Prepare transfer route")).toBeInTheDocument();

    await waitFor(() => {
      expect(getEmergencyAmbulances).toHaveBeenCalled();
      expect(getEmergencyBeds).toHaveBeenCalled();
      expect(getEmergencyStaff).toHaveBeenCalled();
      expect(getEmergencyEquipment).toHaveBeenCalled();
      expect(getEmergencyResourceBottlenecks).toHaveBeenCalled();
    });
  });

  it("aborts in-flight resource requests when the tab unmounts", async () => {
    let capturedSignal;
    const pendingRequest = new Promise(() => {});
    const captureSignal = (options) => {
      capturedSignal = options.signal;
      return pendingRequest;
    };
    getEmergencyAmbulances.mockImplementation(captureSignal);
    getEmergencyBeds.mockImplementation(() => pendingRequest);
    getEmergencyStaff.mockImplementation(() => pendingRequest);
    getEmergencyEquipment.mockImplementation(() => pendingRequest);
    getEmergencyResourceBottlenecks.mockImplementation(() => pendingRequest);

    const { unmount } = render(
      <EmergencyResourceTab realtime={{ activeCases: [], summary: {} }} />,
    );

    await waitFor(() => expect(capturedSignal).toBeInstanceOf(AbortSignal));
    unmount();

    expect(capturedSignal.aborted).toBe(true);
  });

  it("keeps widget-level planning errors independent after batched loading", async () => {
    getPlanningVolumeForecast.mockRejectedValue(new Error("Volume failed"));
    getPlanningCapacityForecast.mockResolvedValue({
      confidence: 0.88,
      riskWindow: null,
      buckets: [{ key: "h1", label: "01:00", erOccupancyPercentage: 68, icuOccupancyPercentage: 72 }],
    });
    getPlanningStaffingGap.mockResolvedValue({
      confidence: 0.82,
      currentStatus: "stable",
      availableDoctors: 5,
      requiredDoctors: 4,
      availableNurses: 9,
      requiredNurses: 8,
    });
    getPlanningAmbulanceDemand.mockResolvedValue({
      confidence: 0.84,
      buckets: [{ key: "h1", label: "01:00", expectedDemand: 2, availableCapacity: 3, status: "stable" }],
    });
    getPlanningRecommendations.mockResolvedValue({
      recommendations: [
        {
          recommendationId: "rec-1",
          severity: "warning",
          confidence: 0.81,
          message: "Stage one overflow team",
          reason: "Volume is rising",
          source: "forecast",
        },
      ],
    });

    render(<EmergencyPlanningTab />);

    expect(await screen.findByText("Volume failed")).toBeInTheDocument();
    expect(screen.getByText("Stage one overflow team")).toBeInTheDocument();
  });

  it("loads reports and searches an audit trail", async () => {
    mockReportApis();
    const user = userEvent.setup();
    render(<EmergencyReportsTab />);

    expect(await screen.findByText("Emergency reports")).toBeInTheDocument();
    expect(await screen.findByText("ELLY-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("Ambulance unavailable")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Case audit search"), "case-1");
    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(await screen.findByText("CASE_CREATED")).toBeInTheDocument();
    expect(getEmergencyCaseAudit).toHaveBeenCalledWith({ caseId: "case-1" });
  });
});
