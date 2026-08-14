/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cwd } from "node:process";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import useIcuRealtime from "../../../hooks/useIcuRealtime";
import IcuMonitoring from "./IcuMonitoring";

const appStyles = readFileSync(
  resolve(cwd(), "src/App.css"),
  "utf8",
);

vi.mock("../../../hooks/useIcuRealtime", () => ({
  default: vi.fn(),
}));

function renderIcuMonitoring(overrides = {}) {
  const refresh = vi.fn();
  useIcuRealtime.mockReturnValue({
    patients: [],
    overview: {
      availableBeds: 0,
      deviceWarnings: [],
      pendingSignoffs: 0,
      severityCounts: {},
      signoffs: [],
      totalPatients: 0,
      urgentAttentionCount: 0,
    },
    loading: false,
    error: "",
    connectionState: "connected",
    refresh,
    ...overrides,
  });

  const rendered = render(<IcuMonitoring />);
  return { ...rendered, refresh };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("IcuMonitoring", () => {
  it("uses custom filter menus for severity and device status", async () => {
    const user = userEvent.setup();
    const { container } = renderIcuMonitoring();

    expect(container.querySelector("select")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Severity: All severity" }));
    const severityMenu = screen.getByRole("listbox", { name: "Severity" });
    expect(severityMenu).toHaveClass("global-content-dropdown");
    expect(within(severityMenu).getAllByText("All severity")).toHaveLength(1);
    await user.click(within(severityMenu).getByRole("option", { name: "Critical" }));
    expect(screen.getByRole("button", { name: "Severity: Critical" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Device: All devices" }));
    const deviceMenu = screen.getByRole("listbox", { name: "Device" });
    expect(within(deviceMenu).getAllByText("All devices")).toHaveLength(1);
    await user.click(within(deviceMenu).getByRole("option", { name: "Delayed" }));
    expect(screen.getByRole("button", { name: "Device: Delayed" })).toBeInTheDocument();
  });

  it("accepts a browser pointer click without relying on pointerdown", async () => {
    const user = userEvent.setup();
    renderIcuMonitoring();

    await user.click(screen.getByRole("button", { name: "Category: All categories" }));
    const categoryMenu = screen.getByRole("listbox", { name: "Category" });
    const highRiskOption = within(categoryMenu).getByRole("option", {
      name: "High risk",
    });

    fireEvent.click(highRiskOption, { detail: 1 });

    expect(
      screen.getByRole("button", { name: "Category: High risk" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("listbox", { name: "Category" })).not.toBeInTheDocument();
  });

  it("keeps the dropdown command bar above the ICU content stage", () => {
    const commandBarRule = appStyles.match(
      /\.icu-monitoring\.is-vitals-view\s*>\s*\.icu-command-bar\s*\{([^}]*)\}/,
    )?.[1];
    const viewStageRule = appStyles.match(
      /\.icu-monitoring\.is-vitals-view\s*>\s*\.icu-view-stage\s*\{([^}]*)\}/,
    )?.[1];
    const commandBarZIndex = Number(commandBarRule?.match(/z-index:\s*(\d+)/)?.[1]);
    const viewStageZIndex = Number(viewStageRule?.match(/z-index:\s*(\d+)/)?.[1]);

    expect(commandBarZIndex).toBeGreaterThan(viewStageZIndex);
  });

  it("keeps the refresh button flat after activation", async () => {
    const user = userEvent.setup();
    const { refresh } = renderIcuMonitoring();
    const refreshButton = screen.getByRole("button", { name: "Refresh" });

    expect(refreshButton).toHaveAttribute("data-no-ripple", "true");

    await user.click(refreshButton);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refreshButton).not.toHaveFocus();
  });
});
