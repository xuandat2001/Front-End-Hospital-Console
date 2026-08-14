import { describe, expect, it, vi } from "vitest";
import {
  buildDashboardBreadcrumbs,
  navigateDashboardBreadcrumb,
} from "./dashboardBreadcrumbs";

describe("dashboardBreadcrumbs", () => {
  it("uses the real Hospital Console navigation hierarchy", () => {
    const items = buildDashboardBreadcrumbs({
      activeCenterTab: "dashboard",
      activeDomain: "management",
      activeFunction: "patient-dashboard",
      activeSubsection: "patient",
    });

    expect(items.map((item) => item.label)).toEqual([
      "Console",
      "Core Modules",
      "Patient",
      "Patient Dashboard",
    ]);
    expect(items[0]).toMatchObject({
      href: "#/dashboard/",
      target: { domainId: "overview", type: "domain" },
    });
    expect(items.slice(1).every((item) => !item.href && !item.target)).toBe(
      true,
    );
    expect(items.at(-1)).toEqual({ label: "Patient Dashboard" });
  });

  it("uses center-navigation labels for non-dashboard views", () => {
    const items = buildDashboardBreadcrumbs({
      activeCenterTab: "reports",
      activeDomain: "management",
      activeFunction: "room-reports",
      activeSubsection: "room",
    });

    expect(items.map((item) => item.label)).toEqual([
      "Console",
      "Core Modules",
      "Rooms and Beds",
      "Reports",
    ]);
  });

  it("labels the root overview as Console", () => {
    expect(
      buildDashboardBreadcrumbs({
        activeCenterTab: "dashboard",
        activeDomain: "overview",
        activeFunction: "command",
      }),
    ).toEqual([{ label: "Console" }]);
  });

  it("routes the only linked breadcrumb back to the Console overview", () => {
    const onDomainChange = vi.fn();
    const onSubsectionSelect = vi.fn();
    const item = {
      label: "Console",
      target: {
        domainId: "overview",
        type: "domain",
      },
    };

    navigateDashboardBreadcrumb(item, {
      onDomainChange,
      onSubsectionSelect,
    });

    expect(onDomainChange).toHaveBeenCalledWith("overview");
    expect(onSubsectionSelect).not.toHaveBeenCalled();
  });
});
