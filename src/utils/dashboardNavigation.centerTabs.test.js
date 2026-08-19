import { describe, expect, it } from "vitest";
import { PERMISSIONS, ROLES } from "../constant/rbac";
import navData from "../tab-data";
import { isKnownDashboardFunction } from "../components/dashboard/dashboardFunctionRegistry";
import {
  resolveCenterTabNavigation,
  resolveSubsectionNavigation,
} from "./dashboardNavigation";

const allPermissions = Object.values(PERMISSIONS);

function collectTabTargets(data = navData) {
  const targets = [];

  Object.entries(data).forEach(([domain, section]) => {
    Object.entries(section.tabs || {}).forEach(([centerTab, functionId]) => {
      targets.push({ centerTab, domain, functionId, subsection: null });
    });

    Object.entries(section.subsections || {}).forEach(([subsection, config]) => {
      Object.entries(config.tabs || {}).forEach(([centerTab, functionId]) => {
        targets.push({ centerTab, domain, functionId, subsection });
      });
    });
  });

  return targets;
}

describe("dashboard center-tab navigation integrity", () => {
  it("registers every center-tab function destination", () => {
    const missing = collectTabTargets()
      .filter((target) => !isKnownDashboardFunction(target.functionId))
      .map((target) => target.functionId);

    expect(missing).toEqual([]);
  });

  it("resolves every configured tab without falling back to another target", () => {
    collectTabTargets().forEach((target) => {
      const resolved = resolveCenterTabNavigation({
        activeDomain: target.domain,
        activeSubsection: target.subsection,
        centerTab: target.centerTab,
        permissions: allPermissions,
        role: ROLES.HOSPITAL_ADMIN,
      });

      expect(resolved).toEqual(target);
    });
  });

  it("keeps Overview tabs mapped to Overview-specific destinations", () => {
    expect(navData.overview.tabs.planning).toBe("overview-planning");
    expect(navData.overview.tabs.resources).toBe("overview-resources");
  });

  it("keeps every visible Performance tab mapped to its configured destination", () => {
    const performanceTargets = collectTabTargets()
      .filter((target) => target.centerTab === "performance")
      .map(({ domain, subsection, functionId }) => ({
        domain,
        subsection,
        functionId,
      }));

    expect(performanceTargets).toEqual([
      { domain: "overview", subsection: null, functionId: "overview-performance" },
      { domain: "management", subsection: "staff", functionId: "staff-performance" },
      { domain: "management", subsection: "patient", functionId: "patient-performance" },
      { domain: "management", subsection: "room", functionId: "room-performance" },
      { domain: "management", subsection: "icu", functionId: "icu-monitoring" },
      { domain: "operations", subsection: "admission", functionId: "admission-performance" },
      { domain: "operations", subsection: "surgery", functionId: "surgery-performance" },
      { domain: "operations", subsection: "clinic-operations", functionId: "clinic-doctor-schedule" },
      { domain: "operations", subsection: "emergency-workflow", functionId: "emergency" },
      {
        domain: "operations",
        subsection: "appointment-booking",
        functionId: "appointment-booking-management",
      },
      { domain: "operations", subsection: "billing", functionId: "billing" },
      { domain: "operations", subsection: "follow-up-care", functionId: "doctor-follow-up-care" },
      { domain: "analytic", subsection: null, functionId: "intelligence-capacity" },
      { domain: "insight", subsection: null, functionId: "intelligence-recommendations" },
    ]);
  });

  it("defaults Surgery subsection navigation to Dashboard instead of Planning", () => {
    expect(
      resolveSubsectionNavigation(
        "operations",
        "surgery",
        allPermissions,
        ROLES.HOSPITAL_ADMIN,
      ),
    ).toMatchObject({
      centerTab: "dashboard",
      domain: "operations",
      functionId: "surgery-records",
      subsection: "surgery",
    });
  });
});
