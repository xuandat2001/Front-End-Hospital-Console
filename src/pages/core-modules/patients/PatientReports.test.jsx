/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PatientReports from "./PatientReports";

vi.mock("../../../services/intelligence/intelligenceApi", () => ({
  intelligenceService: {
    getPatientReports: vi.fn().mockRejectedValue(new Error("offline")),
    downloadPatientReportPdf: vi.fn(),
  },
}));

describe("PatientReports dialogs", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
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
});
