/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import EmergencyPerformanceTab from "./EmergencyPerformanceTab";
import { clearEmergencyWidgetCache } from "./emergencyWidgetLoader";
import {
  getPerformanceDelayBottlenecks,
  getPerformanceOutcomes,
  getPerformanceResponseTimeTrend,
  getPerformanceSeverityBreakdown,
  getPerformanceSlaCompliance,
} from "../../../../services/performance/emergencyPerformanceApi";

vi.mock("../../../../services/performance/emergencyPerformanceApi", () => ({
  getPerformanceResponseTimeTrend: vi.fn(),
  getPerformanceSlaCompliance: vi.fn(),
  getPerformanceSeverityBreakdown: vi.fn(),
  getPerformanceOutcomes: vi.fn(),
  getPerformanceDelayBottlenecks: vi.fn(),
}));

const trendData = {
  buckets: [
    {
      key: "2026-06-23T00:00:00.000Z",
      label: "Jun 23",
      sosToDispatchMinutes: 6,
      sosToArrivalMinutes: 18,
      sosToTreatmentStartMinutes: 26,
      caseCount: 3,
    },
  ],
};

const slaData = {
  totalCases: 10,
  metCases: 8,
  breachedCases: 2,
  metPercentage: 80,
  breachedPercentage: 20,
};

const severityData = {
  total: 10,
  groups: [
    { key: "CRITICAL", label: "Critical", count: 1, percentage: 10 },
    { key: "HIGH", label: "High", count: 2, percentage: 20 },
    { key: "MODERATE", label: "Medium", count: 3, percentage: 30 },
    { key: "LOW", label: "Low", count: 4, percentage: 40 },
  ],
};

const outcomeData = {
  total: 6,
  groups: [
    { key: "TREATED_AND_DISCHARGED", label: "Treated and discharged", count: 1, percentage: 16.7 },
    { key: "ADMITTED", label: "Admitted", count: 1, percentage: 16.7 },
    { key: "ICU_ESCALATED", label: "ICU escalated", count: 1, percentage: 16.7 },
    { key: "OR_ESCALATED", label: "OR escalated", count: 1, percentage: 16.7 },
    { key: "TRANSFERRED", label: "Transferred", count: 1, percentage: 16.7 },
    { key: "CANCELLED_FALSE_ALARM", label: "Cancelled / false alarm", count: 1, percentage: 16.7 },
  ],
};

const bottleneckData = {
  rows: [
    {
      stage: "assessment",
      label: "Assessment delay",
      averageDelayMinutes: 4,
      maxDelayMinutes: 5,
      sampleCount: 2,
    },
    {
      stage: "arrival",
      label: "Arrival delay",
      averageDelayMinutes: 12,
      maxDelayMinutes: 18,
      sampleCount: 3,
    },
  ],
};

function mockSuccessfulApis() {
  getPerformanceResponseTimeTrend.mockResolvedValue(trendData);
  getPerformanceSlaCompliance.mockResolvedValue(slaData);
  getPerformanceSeverityBreakdown.mockResolvedValue(severityData);
  getPerformanceOutcomes.mockResolvedValue(outcomeData);
  getPerformanceDelayBottlenecks.mockResolvedValue(bottleneckData);
}

afterEach(() => {
  cleanup();
  clearEmergencyWidgetCache();
  vi.clearAllMocks();
});

describe("EmergencyPerformanceTab", () => {
  it("loads all widgets with the default 7d range", async () => {
    mockSuccessfulApis();
    render(<EmergencyPerformanceTab />);

    await waitFor(() => {
      expect(getPerformanceResponseTimeTrend).toHaveBeenCalledWith(
        "7d",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(getPerformanceSlaCompliance).toHaveBeenCalledWith(
        "7d",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(getPerformanceSeverityBreakdown).toHaveBeenCalledWith(
        "7d",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(getPerformanceOutcomes).toHaveBeenCalledWith(
        "7d",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(getPerformanceDelayBottlenecks).toHaveBeenCalledWith(
        "7d",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });

  it("refetches all widgets when the range changes to 24h and 30d", async () => {
    mockSuccessfulApis();
    const user = userEvent.setup();
    render(<EmergencyPerformanceTab />);

    await screen.findByText("80%");
    await user.click(screen.getByRole("button", { name: "24h" }));
    await waitFor(() =>
      expect(getPerformanceResponseTimeTrend).toHaveBeenCalledWith(
        "24h",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      ),
    );

    await user.click(screen.getByRole("button", { name: "30d" }));
    await waitFor(() => {
      expect(getPerformanceResponseTimeTrend).toHaveBeenCalledWith(
        "30d",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(getPerformanceSlaCompliance).toHaveBeenCalledWith(
        "30d",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(getPerformanceSeverityBreakdown).toHaveBeenCalledWith(
        "30d",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(getPerformanceOutcomes).toHaveBeenCalledWith(
        "30d",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(getPerformanceDelayBottlenecks).toHaveBeenCalledWith(
        "30d",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });

  it("renders trend, SLA, severity, outcome, and sorted bottleneck data", async () => {
    mockSuccessfulApis();
    render(<EmergencyPerformanceTab />);

    expect(await screen.findByLabelText("SOS to dispatch: 6 min")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getAllByText("20%").length).toBeGreaterThan(0);
    expect(screen.getByText("Breached cases")).toBeInTheDocument();

    for (const label of ["Critical", "High", "Medium", "Low"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }

    for (const label of [
      "Treated and discharged",
      "Admitted",
      "ICU escalated",
      "OR escalated",
      "Transferred",
      "Cancelled / false alarm",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    expect(within(rows[1]).getByText("Arrival delay")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Assessment delay")).toBeInTheDocument();
  });

  it("renders empty states for widgets without data", async () => {
    getPerformanceResponseTimeTrend.mockResolvedValue({ buckets: [] });
    getPerformanceSlaCompliance.mockResolvedValue({ totalCases: 0 });
    getPerformanceSeverityBreakdown.mockResolvedValue({ total: 0, groups: [] });
    getPerformanceOutcomes.mockResolvedValue({ total: 0, groups: [] });
    getPerformanceDelayBottlenecks.mockResolvedValue({ rows: [] });

    render(<EmergencyPerformanceTab />);

    await waitFor(() => {
      expect(screen.getAllByText("No performance data for this range.")).toHaveLength(5);
    });
  });

  it("renders widget-level error states without blocking other widgets", async () => {
    getPerformanceResponseTimeTrend.mockRejectedValue(new Error("Trend failed"));
    getPerformanceSlaCompliance.mockResolvedValue(slaData);
    getPerformanceSeverityBreakdown.mockResolvedValue(severityData);
    getPerformanceOutcomes.mockResolvedValue(outcomeData);
    getPerformanceDelayBottlenecks.mockResolvedValue(bottleneckData);

    render(<EmergencyPerformanceTab />);

    expect(await screen.findByText("Trend failed")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
  });
});
