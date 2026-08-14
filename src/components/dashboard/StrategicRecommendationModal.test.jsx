/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import StrategicRecommendationModal from "./StrategicRecommendationModal";

const RECOMMENDATIONS = {
  capacity: {
    key: "capacity-planning",
    title: "Capacity planning",
    detail: "Forecast beds, staff, and demand needs",
    tone: "positive",
  },
  pressure: {
    key: "department-pressure",
    title: "Department pressure",
    detail: "Identify overloaded units and care bottlenecks",
    tone: "neutral",
  },
  executive: {
    key: "executive-summary",
    title: "Executive summary",
    detail: "High-level operational highlights for leadership",
    tone: "warning",
  },
};

function renderModal(recommendation, result) {
  return render(
    <StrategicRecommendationModal
      error=""
      loading={false}
      onClose={vi.fn()}
      onRefresh={vi.fn()}
      recommendation={recommendation}
      result={{
        confidence: 0.8,
        generatedAt: "2026-07-28T03:45:00.000Z",
        requiresHumanReview: false,
        severity: "INFO",
        ...result,
      }}
    />,
  );
}

function expectBefore(first, second) {
  expect(
    first.compareDocumentPosition(second) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
}

afterEach(() => {
  cleanup();
});

describe("StrategicRecommendationModal", () => {
  it("renders capacity planning data before the AI insight", () => {
    renderModal(RECOMMENDATIONS.capacity, {
      answer: "Capacity AI explanation.",
      data: {
        planningWindow: {
          preset: "next_7_days",
          from: "2026-07-28T00:00:00.000Z",
          to: "2026-08-04T00:00:00.000Z",
        },
        baselineRange: {
          preset: "last_30_days",
          from: "2026-06-28T00:00:00.000Z",
          to: "2026-07-27T00:00:00.000Z",
        },
        metrics: {
          summary: {
            totalDepartments: 14,
            departmentsWithActivity: 12,
            departmentsWithBedCapacityData: 3,
          },
          topCapacityRiskDepartments: [],
        },
        dataSource: {
          sourceRecordCounts: {
            appointments: 44,
            surgeries: 8,
            staff: 25,
            emergencyCases: 0,
            rooms: 6,
            icuStays: 1,
            admissions: 6,
          },
        },
      },
      findings: [],
      recommendations: [],
    });

    expect(screen.getByText("Planning window")).toBeInTheDocument();
    expect(screen.getByText("Capacity overview")).toBeInTheDocument();
    expect(screen.getByText("Data coverage")).toBeInTheDocument();
    expect(screen.getByText("No triggered findings")).toBeInTheDocument();

    expectBefore(
      screen.getByText("Capacity overview"),
      screen.getByText("AI insight"),
    );
  });

  it("renders department pressure findings before the AI insight", () => {
    renderModal(RECOMMENDATIONS.pressure, {
      answer: "Department pressure AI explanation.",
      data: {
        dateRange: {
          preset: "last_30_days",
          from: "2026-06-28T00:00:00.000Z",
          to: "2026-07-28T00:00:00.000Z",
        },
        metrics: {
          topPressureDepartments: [
            {
              departmentId: "cardiology",
              departmentName: "Cardiology",
              severity: "HIGH",
              triggeredRuleCount: 3,
            },
            {
              departmentId: "neurology",
              departmentName: "Neurology",
              severity: "MEDIUM",
              triggeredRuleCount: 2,
            },
          ],
        },
      },
      findings: [
        {
          finding: "Low appointment completion in Cardiology",
        },
      ],
      recommendations: [
        {
          action: "Review completion workflows in Cardiology",
        },
      ],
    });

    expect(screen.getByText("Top affected departments")).toBeInTheDocument();
    expect(screen.getByText("Cardiology")).toBeInTheDocument();
    expect(
      screen.getByText("Low appointment completion in Cardiology"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Review completion workflows in Cardiology"),
    ).toBeInTheDocument();

    expectBefore(
      screen.getByText("Recommendations"),
      screen.getByText("AI insight"),
    );
  });

  it("renders the executive module summary and actions before the AI insight", () => {
    renderModal(RECOMMENDATIONS.executive, {
      answer: "Executive AI explanation.",
      data: {
        modules: [
          {
            key: "appointmentPerformance",
            name: "Appointment Performance",
            severity: "HIGH",
            dataAvailable: true,
          },
          {
            key: "departmentPressure",
            name: "Department Pressure",
            severity: "MEDIUM",
            dataAvailable: true,
          },
          {
            key: "capacityPlanning",
            name: "Capacity Planning",
            severity: "INFO",
            dataAvailable: true,
          },
        ],
      },
      findings: [
        {
          finding: "Highest operational intelligence severity is HIGH",
        },
      ],
      recommendations: [
        {
          action: "Review highest-severity operational modules",
        },
      ],
    });

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Executive summary",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Appointment Performance")).toBeInTheDocument();
    expect(
      screen.getByText("Highest operational intelligence severity is HIGH"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Review highest-severity operational modules"),
    ).toBeInTheDocument();

    expectBefore(
      screen.getByText("Leadership actions"),
      screen.getByText("AI insight"),
    );

    const dialog = screen.getByRole("dialog", { name: "Executive summary" });
    expect(dialog).toHaveClass("console-tinted-popup");
    expect(dialog).toHaveAttribute("data-tone", "strategic-popup");
    expect(dialog.parentElement).toHaveClass("console-tinted-popup-layer");
    expect(dialog.parentElement?.parentElement).toBe(document.body);
  });
});

