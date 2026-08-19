/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PatientReports from "./PatientReports";
import { intelligenceService } from "../../../services/intelligence/intelligenceApi";

vi.mock("../../../services/intelligence/intelligenceApi", () => ({
  intelligenceService: {
    getPatientReports: vi.fn().mockRejectedValue(new Error("offline")),
    downloadPatientReportPdf: vi.fn(),
  },
}));

describe("PatientReports dialogs", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    intelligenceService.getPatientReports.mockRejectedValue(new Error("offline"));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("portals the census dialog above the dashboard and closes from its enlarged action", async () => {
    const user = userEvent.setup();
    render(<PatientReports />);

    await user.click(await screen.findByRole("button", { name: "Historical Census Reports" }));

    const dialog = screen.getByRole("dialog", { name: "Historical Daily Census Reports List" });
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog).toHaveClass("z-[12000]");
    expect(dialog).toHaveClass("console-tinted-popup-layer");

    const closeButton = within(dialog).getByRole("button", { name: "Close" });
    expect(closeButton).toHaveClass("min-h-10", "min-w-16");
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Historical Daily Census Reports List" })).not.toBeInTheDocument();
    });
  });

  it("portals and closes the recent incident dialog", async () => {
    const user = userEvent.setup();
    render(<PatientReports />);

    await user.click(await screen.findByRole("button", { name: "Recent Incident Logs" }));

    const dialog = screen.getByRole("dialog", { name: "Recent Incident Logs" });
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog).toHaveClass("console-tinted-popup-layer");
    await user.click(within(dialog).getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Recent Incident Logs" })).not.toBeInTheDocument();
    });
  });

  it("renders the legacy top-level reports mock shape without reading census.reports from undefined", async () => {
    intelligenceService.getPatientReports.mockResolvedValue({
      success: true,
      data: {
        totals: { total: 3, active: 3, inactive: 0 },
        dailyCensus: [{ label: "Mon", total: 39 }],
        demographics: [{ label: "18-39", total: 1 }],
        incidents: [{ id: "inc-001", title: "Delayed discharge", severity: "Medium" }],
        compliance: { score: 91, status: "Ready" },
        reports: [
          {
            id: "legacy-report-1",
            dateTime: "8/18 15:00",
            reportName: "Legacy_Census_Report.pdf",
            type: "ADT snapshot",
            status: "Completed",
            censusCount: 39,
          },
        ],
      },
    });

    render(<PatientReports />);

    expect(await screen.findByText("Patient Reports")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Historical Census Reports" }));

    expect(screen.getByText("Legacy_Census_Report.pdf")).toBeInTheDocument();
  });

  it("renders an empty reports state when nested report config is missing", async () => {
    intelligenceService.getPatientReports.mockResolvedValue({
      success: true,
      data: {},
    });

    render(<PatientReports />);

    expect(await screen.findByText("Patient Reports")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Historical Census Reports" }));

    expect(screen.getByText("No census reports in window")).toBeInTheDocument();
  });
});
