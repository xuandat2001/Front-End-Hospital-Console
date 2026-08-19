// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS, ROLES } from "../../constant/rbac";
import useSessionStore from "../../store/useSessionStore";
import DashboardContent from "./DashboardContent";
import { EXPLICIT_DASHBOARD_FUNCTION_IDS } from "./dashboardFunctionRegistry";

const realtimeStub = {
  activeCases: [],
  connectionState: "connected",
  error: "",
  hospitalIdentity: {},
  loading: false,
  notifications: [],
  requests: [],
  unreadCount: 0,
};

function renderFunction(functionId) {
  return render(
    <DashboardContent
      activeModule="clinical-operations"
      activeDomain="overview"
      activeFunction={functionId}
      activeCenterTab="dashboard"
      activeSubsection={null}
      emergencyRealtime={realtimeStub}
      registrationRealtime={realtimeStub}
    />,
  );
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  useSessionStore.setState({
    currentUser: { role: ROLES.HOSPITAL_ADMIN },
    permissions: Object.values(PERMISSIONS),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DashboardContent registered page rendering", () => {
  it.each(EXPLICIT_DASHBOARD_FUNCTION_IDS)(
    "does not throw while rendering %s",
    async (functionId) => {
      renderFunction(functionId);

      await waitFor(() => {
        expect(console.error).not.toHaveBeenCalledWith(
          expect.stringContaining("[Prototype] Render fallback:"),
          expect.anything(),
          expect.anything(),
        );
      });
    },
  );
});
