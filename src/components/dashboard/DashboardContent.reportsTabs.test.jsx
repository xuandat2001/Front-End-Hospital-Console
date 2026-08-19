// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS, ROLES } from "../../constant/rbac";
import navData from "../../tab-data";
import useSessionStore from "../../store/useSessionStore";
import DashboardContent from "./DashboardContent";

const realtimeStub = {
  acknowledge: vi.fn(),
  activeCases: [],
  connectionState: "connected",
  error: "",
  hospitalIdentity: {},
  loading: false,
  notifications: [],
  pendingAlertId: "",
  refresh: vi.fn(),
  requests: [],
  resources: {},
  summary: {},
  unreadCount: 0,
};

function collectReportTargets() {
  const targets = [];

  Object.entries(navData).forEach(([domain, section]) => {
    if (section.tabs?.reports) {
      targets.push({
        label: section.label,
        domain,
        subsection: null,
        functionId: section.tabs.reports,
      });
    }

    Object.entries(section.subsections || {}).forEach(([subsection, config]) => {
      if (config.tabs?.reports) {
        targets.push({
          label: `${section.label} / ${config.label}`,
          domain,
          subsection,
          functionId: config.tabs.reports,
        });
      }
    });
  });

  return targets;
}

function renderReportsTarget(target) {
  return render(
    <DashboardContent
      activeCenterTab="reports"
      activeDomain={target.domain}
      activeFunction={target.functionId}
      activeModule="clinical-operations"
      activeSubsection={target.subsection}
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

describe("DashboardContent Reports tabs", () => {
  it.each(collectReportTargets())(
    "renders Reports content for $label",
    async (target) => {
      const { container } = renderReportsTarget(target);

      await waitFor(() => {
        expect(container.textContent?.trim().length).toBeGreaterThan(0);
      });

      expect(container).not.toHaveTextContent("Page unavailable");
      expect(container).not.toHaveTextContent("This prototype view has not been configured.");
      expect(container).not.toHaveTextContent("Access denied");
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining("[Prototype] Render fallback:"),
        expect.anything(),
        expect.anything(),
      );
    },
  );
});
