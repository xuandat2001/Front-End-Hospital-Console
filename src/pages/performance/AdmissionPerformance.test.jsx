/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdmissionPerformance from "./AdmissionPerformance";
import { admissionPerformanceService } from "../../services/performance/admissionPerformanceApi";

vi.mock("../../services/performance/admissionPerformanceApi", () => ({
  admissionPerformanceService: {
    getAll: vi.fn(),
    getStats: vi.fn(),
  },
}));

vi.mock("../../components/graphs/MiniPieChart", () => ({
  default: () => <div data-testid="mini-pie-chart" />,
}));

vi.mock("../../components/graphs/BarChart", () => ({
  default: () => <div data-testid="bar-chart" />,
}));

beforeEach(() => {
  admissionPerformanceService.getStats.mockResolvedValue({
    success: true,
    data: {
      summary: {
        total: 0,
        avgProcessingTime: 0,
        avgBedAssignmentTime: 0,
        avgWaitTime: 0,
        avgLengthOfStay: 0,
        avgSatisfaction: 0,
        readmissions: 0,
      },
      byAdmissionType: [],
    },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AdmissionPerformance", () => {
  it("does not call records.forEach on the object-shaped mock fallback response", async () => {
    admissionPerformanceService.getAll.mockResolvedValue({
      success: true,
      data: { ok: true, mock: true, path: "/intelligence/admission-performance" },
    });

    render(<AdmissionPerformance />);

    await waitFor(() =>
      expect(screen.getByText("No admission performance records found.")).toBeInTheDocument(),
    );
  });

  it("renders records extracted from a paginated records object", async () => {
    admissionPerformanceService.getAll.mockResolvedValue({
      success: true,
      data: {
        records: [
          {
            _id: "adm-perf-1",
            performanceId: "ADM-PERF-1",
            admissionId: "ADM-1",
            patientId: "ELLY-PAT-1",
            patientName: "Avery Johnson",
            admissionType: "SCHEDULED",
            dischargeOutcome: "RECOVERED",
            admissionProcessingTime: 20,
            bedAssignmentTime: 10,
            waitTime: 5,
            lengthOfStay: 2,
            patientSatisfaction: 4.5,
          },
        ],
      },
    });

    render(<AdmissionPerformance />);

    await waitFor(() => expect(screen.getByText("1 completed admissions recorded")).toBeInTheDocument());
    expect(screen.getByText("Admission Type Distribution")).toBeInTheDocument();
  });
});
