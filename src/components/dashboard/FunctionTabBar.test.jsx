/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FunctionTabBar from "./FunctionTabBar";

afterEach(() => {
  cleanup();
});

describe("FunctionTabBar", () => {
  it("renders the shared center pill navigation and changes views", () => {
    const onCenterTabChange = vi.fn();

    render(
      <FunctionTabBar
        activeCenterTab="dashboard"
        activeFunction="command"
        onCenterTabChange={onCenterTabChange}
      />,
    );

    const navigation = screen.getByRole("navigation", {
      name: "Workspace views",
    });
    expect(navigation).toHaveClass("center-pill-nav", "dashboard-center-nav");
    expect(
      screen.getByRole("button", { name: "Dashboard" }),
    ).toHaveAttribute("aria-current", "page");

    fireEvent.click(screen.getByRole("button", { name: "Performance" }));

    expect(onCenterTabChange).toHaveBeenCalledWith("performance");
  });

  it("uses the emergency-specific resource label", () => {
    render(
      <FunctionTabBar
        activeCenterTab="resources"
        activeFunction="emergency"
        onCenterTabChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Resource" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.queryByRole("button", { name: "Resources" }),
    ).not.toBeInTheDocument();
  });
});
