/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import LeftRail from "./LeftRail";

vi.mock("../../store/useSessionStore", () => ({
  default: (selector) =>
    selector({
      workspace: {
        hospitalName: "Dummy External Hospital",
        ellyHospitalId: "ELLY-ORG-019EA2DD-FBD-TEST",
      },
      currentUser: {
        ellyId: "ELLY-STAFF-019EA2DD-FBD-TEST",
        fullName: "Avery Nguyen",
        role: "HOSPITAL_ADMIN",
      },
      can: () => true,
    }),
}));

function RailHarness({
  initialCollapsed = true,
  isOpen = false,
  onDomainChange = vi.fn(),
  onIdentityLogoClick = vi.fn(),
}) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  return (
    <LeftRail
      activeDomain="overview"
      activeSubsection={null}
      isCollapsed={isCollapsed}
      isOpen={isOpen}
      onCollapsedChange={setIsCollapsed}
      onDomainChange={onDomainChange}
      onIdentityLogoClick={onIdentityLogoClick}
      onOpenChange={vi.fn()}
      onPatientSearch={vi.fn()}
      onSettingsOpen={vi.fn()}
      onSubsectionSelect={vi.fn()}
    />
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("LeftRail", () => {
  it("keeps every primary icon action accessible while collapsed", async () => {
    const user = userEvent.setup();
    render(<RailHarness />);

    const rail = screen.getByRole("complementary", {
      name: "Primary navigation",
    });
    const expandTrigger = within(rail).getByRole("button", {
      name: "Expand navigation",
    });
    const overviewButton = within(rail).getByRole("button", {
      name: "Overview",
    });
    expect(rail).toHaveClass("is-collapsed");
    expect(expandTrigger).toHaveClass("dashboard-rail-toggle--standalone");
    expect(overviewButton).toHaveClass("dashboard-nav-overview-button");
    expect(overviewButton).toHaveAttribute("data-no-ripple", "true");
    const identityCopy = screen
      .getByText("ELLY-ORG-019EA2DD-FBD-TEST")
      .closest(".dashboard-logo-card__identity");
    expect(identityCopy).toHaveAttribute("aria-hidden", "true");
    expect(
      screen.getByRole("button", {
        name: "Open hospital profile (coming soon)",
      }),
    ).toBeEnabled();
    expect(
      within(rail).queryByRole("button", { name: /workspace/i }),
    ).not.toBeInTheDocument();

    for (const label of [
      "Core Modules",
      "Operations",
      "Clinical Ops",
      "Analytics",
      "Insights",
      "Settings",
    ]) {
      expect(within(rail).getByRole("button", { name: label })).toBeEnabled();
    }

    await user.click(expandTrigger);

    expect(rail).not.toHaveClass("is-collapsed");
    const collapseButton = within(rail).getByRole("button", {
      name: "Collapse navigation",
    });
    expect(collapseButton).toHaveAttribute("aria-expanded", "true");
    expect(collapseButton.parentElement).toHaveClass(
      "dashboard-nav-overview-row",
      "is-active",
    );
    expect(
      within(collapseButton.parentElement).getAllByRole("button"),
    ).toHaveLength(2);

    await user.click(collapseButton);

    expect(rail).toHaveClass("is-collapsed");
    expect(
      within(rail).getByRole("button", { name: "Expand navigation" }),
    ).toBeInTheDocument();
  });

  it("shows the ELLY ID and signed-in user beside a clickable logo", async () => {
    const user = userEvent.setup();
    const onIdentityLogoClick = vi.fn();
    render(
      <RailHarness
        initialCollapsed={false}
        onIdentityLogoClick={onIdentityLogoClick}
      />,
    );

    expect(screen.queryByText("Dummy External Hospital")).not.toBeInTheDocument();
    expect(screen.getByText("ELLY-ORG-019EA2DD-FBD-TEST")).toBeVisible();
    expect(screen.getByText("Hospital Admin · Avery Nguyen")).toBeVisible();

    await user.click(
      screen.getByRole("button", {
        name: "Open hospital profile (coming soon)",
      }),
    );
    expect(onIdentityLogoClick).toHaveBeenCalledOnce();
  });

  it("keeps Overview navigation separate from the collapse control", async () => {
    const user = userEvent.setup();
    const onDomainChange = vi.fn();
    render(
      <RailHarness
        initialCollapsed={false}
        onDomainChange={onDomainChange}
      />,
    );

    const rail = screen.getByRole("complementary", {
      name: "Primary navigation",
    });

    await user.click(within(rail).getByRole("button", { name: "Overview" }));
    expect(onDomainChange).toHaveBeenCalledWith("overview");
    expect(rail).not.toHaveClass("is-collapsed");

    await user.click(
      within(rail).getByRole("button", { name: "Collapse navigation" }),
    );
    expect(rail).toHaveClass("is-collapsed");

    await user.click(within(rail).getByRole("button", { name: "Overview" }));
    expect(onDomainChange).toHaveBeenCalledTimes(2);
    expect(rail).toHaveClass("is-collapsed");
  });

  it("renders expanded labels and controls immediately", () => {
    render(<RailHarness />);

    const rail = screen.getByRole("complementary", {
      name: "Primary navigation",
    });

    fireEvent.click(
      within(rail).getByRole("button", { name: "Expand navigation" }),
    );

    expect(rail).not.toHaveClass("is-collapsed");
    expect(rail).not.toHaveClass("is-content-collapsed");
    const collapseButton = within(rail).getByRole("button", {
      name: "Collapse navigation",
    });
    expect(
      within(collapseButton.parentElement).getByRole("button", {
        name: "Overview",
      }),
    ).toBeInTheDocument();
    expect(
      within(collapseButton.parentElement).getAllByRole("button"),
    ).toHaveLength(2);
    expect(
      within(rail).getByRole("textbox", { name: "Find patient by EllyID" }),
    ).toBeInTheDocument();
  });

  it("expands and focuses the full patient search from its compact icon", async () => {
    const user = userEvent.setup();
    render(<RailHarness />);

    await user.click(
      screen.getByRole("button", { name: "Find patient by EllyID" }),
    );

    expect(
      screen.getByRole("textbox", { name: "Find patient by EllyID" }),
    ).toHaveFocus();
  });

  it("expands before revealing a parent section's subsections", async () => {
    const user = userEvent.setup();
    render(<RailHarness />);

    await user.click(screen.getByRole("button", { name: "Core Modules" }));

    expect(
      screen.getByRole("button", { name: "Core Modules" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("button", { name: "Staff & Department" }),
    ).toBeVisible();
  });

  it("keeps the mobile drawer fully expanded", () => {
    const { container } = render(<RailHarness isOpen />);
    const mobilePanel = container.querySelector(".dashboard-mobile-panel");
    const ids = Array.from(container.querySelectorAll("[id]"), (element) =>
      element.getAttribute("id"),
    );

    expect(mobilePanel).toBeInTheDocument();
    expect(
      within(mobilePanel).getByRole("button", { name: "Close navigation" }),
    ).toBeInTheDocument();
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      within(mobilePanel).getByRole("button", { name: "Core Modules" }),
    ).toHaveAttribute(
      "aria-controls",
      "dashboard-mobile-nav-subsections-management",
    );
    expect(
      within(mobilePanel).getByRole("textbox", {
        name: "Find patient by EllyID",
      }),
    ).toBeInTheDocument();
    expect(
      within(mobilePanel).getByRole("button", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(
      within(mobilePanel).queryByText("Dummy External Hospital"),
    ).not.toBeInTheDocument();
    expect(
      within(mobilePanel).getByText("ELLY-ORG-019EA2DD-FBD-TEST"),
    ).toBeVisible();
    expect(
      within(mobilePanel).getByText("Hospital Admin · Avery Nguyen"),
    ).toBeVisible();
  });
});
