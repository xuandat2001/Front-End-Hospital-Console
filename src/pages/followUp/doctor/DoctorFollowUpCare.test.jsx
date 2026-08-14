/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dashboardHook = vi.fn();
vi.mock("./hooks/useDoctorFollowUpDashboard", () => ({ default: dashboardHook }));

const { default: DoctorFollowUpCare } = await import("./DoctorFollowUpCare");

afterEach(cleanup);
beforeEach(() => {
  dashboardHook.mockReset();
  dashboardHook.mockReturnValue({
    tasks: [{ followUpEllyId: "ELLY-FUP-1", patientName: "Jane", patientEllyId: "ELLY-USR-1", type: "REVIEW_RESULT", priority: "HIGH", dueAt: "2026-08-10T09:00:00.000Z", status: "PENDING", overdue: true, displayStatus: "OVERDUE" }],
    summary: { dueToday: 3, upcoming: 7, overdue: 2, completedThisMonth: 11, nextFollowUp: null },
    loading: false,
    error: "",
    updatingId: "",
    refresh: vi.fn(), update: vi.fn(), complete: vi.fn(), cancel: vi.fn(),
    weekRows: [],
  });
});

describe("DoctorFollowUpCare", () => {
  it("renders API summary values, queue records, and derived overdue state", () => {
    render(<DoctorFollowUpCare activeTab="dashboard" />);
    expect(screen.getByRole("heading", { name: "Follow-up Care" })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
    expect(screen.getByText("Jane")).toBeInTheDocument();
    expect(screen.getAllByText("OVERDUE").length).toBeGreaterThan(0);
  });

  it("keeps non-dashboard center tabs as placeholders", () => {
    render(<DoctorFollowUpCare activeTab="performance" />);
    expect(screen.getByRole("heading", { name: "Performance" })).toBeInTheDocument();
    expect(dashboardHook).not.toHaveBeenCalled();
  });
});
