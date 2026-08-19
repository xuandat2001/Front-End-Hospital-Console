import { describe, expect, it } from "vitest";
import { PAGE_PERMISSIONS } from "../../constant/pagePermissions";
import { workspacePages } from "../../data";
import {
  collectNavigationFunctionIds,
  isKnownDashboardFunction,
} from "./dashboardFunctionRegistry";

describe("dashboardFunctionRegistry", () => {
  it("registers every function reachable from configured navigation", () => {
    const navFunctionIds = collectNavigationFunctionIds();
    const missing = [...navFunctionIds].filter(
      (functionId) => !isKnownDashboardFunction(functionId),
    );

    expect(missing).toEqual([]);
  });

  it("keeps reachable clinic placeholders labelled and permissioned", () => {
    [
      "clinic-doctor-schedule",
      "clinic-doctor-messages",
      "clinic-doctor-reports",
    ].forEach((functionId) => {
      expect(workspacePages[functionId]).toBeTruthy();
      expect(PAGE_PERMISSIONS[functionId]).toBeTruthy();
    });
  });

  it("does not treat typo-like function IDs as known pages", () => {
    expect(isKnownDashboardFunction("intelligence-analytics-typo")).toBe(false);
    expect(isKnownDashboardFunction("patient-dashboard-missing")).toBe(false);
  });
});
