/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import LeftRail from "./LeftRail";

const { copyTextMock, logoutMock } = vi.hoisted(() => ({
  copyTextMock: vi.fn(),
  logoutMock: vi.fn(),
}));

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
      permissions: [
        "overview:read",
        "staff:read",
        "patient:read",
        "room:read",
        "emergency:read",
        "appointment:read",
        "admission:read",
        "surgery:read",
        "intelligence:read",
      ],
      can: () => true,
      logout: logoutMock,
    }),
}));

function renderRail(overrides = {}) {
  return render(
    <LeftRail
      activeDomain="overview"
      activeSubsection={null}
      isOpen={false}
      onDomainChange={vi.fn()}
      onOpenChange={vi.fn()}
      onPatientSearch={vi.fn()}
      onSettingsOpen={vi.fn()}
      onSubsectionSelect={vi.fn()}
      {...overrides}
    />,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LeftRail", () => {
  it("reveals account actions when the dropdown chevron is clicked", async () => {
    const user = userEvent.setup();
    renderRail();

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(document.querySelector(".profile-dropdown__bend")).not.toBeInTheDocument();

    const container = document.querySelector(
      ".dashboard-profile-card .profile-dropdown",
    );
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
      bottom: 92,
      height: 60,
      left: 24,
      right: 244,
      top: 32,
      width: 220,
      x: 24,
      y: 32,
      toJSON: () => {},
    });

    const chevronTrigger = screen.getByRole("button", {
      name: "Open account menu",
    });
    const avatar = document.querySelector("img.profile-dropdown__avatar");
    expect(avatar).toBeInTheDocument();
    expect(avatar?.parentElement).toHaveClass("profile-dropdown__profile");

    await user.click(chevronTrigger);

    const menu = screen.getByRole("menu", { name: "Account actions" });
    expect(menu).toHaveClass("profile-dropdown__menu");
    expect(menu).not.toHaveClass("global-content-dropdown");
    expect(menu).toHaveStyle({ top: "98px", width: "220px" });
    expect(menu).not.toHaveClass("opens-right");
    expect(within(menu).getByRole("menuitem", { name: "Copy ID" })).toBeEnabled();
    expect(within(menu).getByRole("menuitem", { name: "Sign out" })).toBeEnabled();
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(2);
    expect(menu).not.toHaveTextContent("Avery Nguyen");
    expect(menu).not.toHaveTextContent("Hospital Admin");
    expect(within(menu).queryByText("Laboratory")).not.toBeInTheDocument();
    expect(within(menu).queryByText("Radiology")).not.toBeInTheDocument();
    expect(chevronTrigger).toHaveAttribute("aria-expanded", "true");
    expect(
      chevronTrigger.querySelector(".profile-dropdown__chevron"),
    ).toHaveClass("is-open");
    expect(screen.getByRole("button", { name: "Open profile" })).toHaveTextContent(
      "Avery Nguyen",
    );
    expect(screen.getByRole("button", { name: "Open profile" })).toHaveTextContent(
      "ELLY-STAFF-019EA2DD-FBD-TEST",
    );
    expect(screen.getByRole("button", { name: "Open profile" })).not.toHaveTextContent(
      "Dummy External Hospital",
    );
    expect(
      screen.getByRole("button", { name: "Open profile" }).querySelector("img"),
    ).toBe(
      screen.getByRole("button", { name: "Open profile" }).firstElementChild,
    );
  });

  it("navigates to the profile page when the identity card is clicked", async () => {
    const user = userEvent.setup();
    const onProfileClick = vi.fn();
    renderRail({ onProfileClick });

    await user.click(screen.getByRole("button", { name: "Open profile" }));

    expect(onProfileClick).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("logs out from the identity account menu", async () => {
    const user = userEvent.setup();
    logoutMock.mockResolvedValueOnce(undefined);
    renderRail();

    await user.click(screen.getByRole("button", { name: "Open account menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));

    expect(logoutMock).toHaveBeenCalledOnce();
  });

  it("copies the ELLY ID from the identity account menu", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: copyTextMock.mockResolvedValueOnce(undefined) },
    });
    renderRail();

    await user.click(screen.getByRole("button", { name: "Open account menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Copy ID" }));

    expect(copyTextMock).toHaveBeenCalledWith("ELLY-STAFF-019EA2DD-FBD-TEST");
  });

  it("closes the account menu with Escape and restores focus", async () => {
    const user = userEvent.setup();
    renderRail();

    const trigger = screen.getByRole("button", { name: "Open account menu" });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("keeps the fixed profile control outside the collapsing navigation", async () => {
    const user = userEvent.setup();
    renderRail();

    const rail = screen.getByRole("complementary", {
      name: "Primary navigation",
    });
    const accessStack = document.querySelector(".dashboard-access-stack");
    const profileTrigger = screen.getByRole("button", {
      name: "Open account menu",
    });

    expect(accessStack).toContainElement(profileTrigger);
    expect(rail).not.toContainElement(profileTrigger);
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
    expect(screen.queryByText("Console")).not.toBeInTheDocument();
    expect(document.querySelector(".dashboard-logo-card")).not.toBeInTheDocument();

    await user.click(
      within(rail).getByRole("button", { name: "Collapse navigation" }),
    );

    expect(rail).toHaveClass("is-collapsed", "is-content-collapsed");
    expect(rail.parentElement).toHaveClass("dashboard-left-column", "is-collapsed");
    expect(screen.getByRole("button", { name: "Open account menu" })).toBe(
      profileTrigger,
    );
    expect(rail).toHaveClass("is-collapsed");
  });

  it("opens subsection controls as a flyout while collapsed", async () => {
    const user = userEvent.setup();
    const onSubsectionSelect = vi.fn();
    renderRail({ onSubsectionSelect });

    const rail = screen.getByRole("complementary", {
      name: "Primary navigation",
    });
    await user.click(
      within(rail).getByRole("button", { name: "Collapse navigation" }),
    );
    await user.click(
      within(rail).getByRole("button", { name: "Core Modules" }),
    );

    const group = within(rail).getByRole("group", {
      name: "Core Modules sections",
    });
    expect(group).toHaveClass("is-floating", "global-content-dropdown");

    await user.click(
      within(group).getByRole("button", { name: "Staff & Department" }),
    );

    expect(onSubsectionSelect).toHaveBeenCalledWith("management", "staff");
    expect(
      within(rail).queryByRole("group", { name: "Core Modules sections" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the labeled clinical navigation controls visible", () => {
    renderRail();

    const navigation = screen.getByRole("navigation", {
      name: "Dashboard sections",
    });
    expect(within(navigation).getByRole("button", { name: "Overview" })).toBeEnabled();
    expect(within(navigation).getByRole("button", { name: "Core Modules" })).toBeEnabled();
    expect(
      within(navigation).getByRole("button", { name: "Core Modules" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the completed core modules wired beneath the collapsible rail group", async () => {
    const user = userEvent.setup();
    renderRail();

    await user.click(screen.getByRole("button", { name: "Core Modules" }));

    const group = screen.getByRole("group", { name: "Core Modules sections" });
    expect(within(group).getByRole("button", { name: "Staff & Department" })).toBeEnabled();
    expect(within(group).getByRole("button", { name: "Patient" })).toBeEnabled();
    expect(within(group).getByRole("button", { name: "Rooms and Beds" })).toBeEnabled();
    expect(within(group).getByRole("button", { name: "ICU" })).toBeEnabled();
    expect(within(group).getAllByRole("button")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Analytics" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Insights" })).toBeEnabled();
  });

  it("reveals configured subsection groups inline and independently", async () => {
    const user = userEvent.setup();
    renderRail();

    await user.click(screen.getByRole("button", { name: "Core Modules" }));
    expect(
      screen.getByRole("group", { name: "Core Modules sections" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Operations" }));

    expect(
      screen.getByRole("group", { name: "Core Modules sections" }),
    ).toBeInTheDocument();
    const group = screen.getByRole("group", { name: "Operations sections" });
    expect(
      within(group).getByRole("button", { name: "Admissions" }),
    ).toBeEnabled();
    expect(
      within(group).getByRole("button", { name: "Surgery" }),
    ).toBeEnabled();
    expect(
      within(group).getByRole("button", { name: "Emergency Workflow" }),
    ).toBeEnabled();
    expect(
      within(group).getByRole("button", { name: "Appointment Booking" }),
    ).toBeEnabled();
    expect(within(group).getAllByRole("button")).toHaveLength(4);
  });

  it("uses the same account action in the mobile navigation drawer", async () => {
    const user = userEvent.setup();
    const { container } = renderRail({ isOpen: true });
    const mobilePanel = container.querySelector(".dashboard-mobile-panel");

    expect(mobilePanel).toBeInTheDocument();
    await user.click(
      within(mobilePanel).getByRole("button", { name: "Open account menu" }),
    );

    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeEnabled();
    expect(
      within(mobilePanel).getByRole("button", { name: "Close navigation" }),
    ).toBeEnabled();
    expect(within(mobilePanel).getByRole("search")).toBeInTheDocument();
    expect(
      within(mobilePanel).queryByRole("button", { name: "Collapse navigation" }),
    ).not.toBeInTheDocument();
  });
});
