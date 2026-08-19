// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS, ROLES } from "./constant/rbac";

const AUTH_STORAGE_KEY = "ellyAuthSession";

function buildValidSession(overrides = {}) {
  return {
    accessToken: "test-token",
    refreshToken: "refresh-token",
    role: ROLES.HOSPITAL_ADMIN,
    currentUser: {
      ellyId: "ELLY-USER-HOSP-ADMIN-001",
      fullName: "Hospital Admin",
      role: ROLES.HOSPITAL_ADMIN,
    },
    activeWorkspace: {
      workspaceId: "hospital-1",
      workspaceEllyId: "ELLY-HOSP-001",
      workspaceName: "Demo Hospital",
      workspaceType: "HOSPITAL",
      role: ROLES.HOSPITAL_ADMIN,
    },
    permissions: Object.values(PERMISSIONS),
    consoleType: "HOSPITAL",
    ...overrides,
  };
}

async function renderStartupApp() {
  vi.doMock("./hooks/useEmergencyRealtime", () => ({
    default: () => ({
      activeCases: [],
      connectionState: "connected",
      error: "",
      hospitalIdentity: {},
      loading: false,
      notifications: [],
      requests: [],
      unreadCount: 0,
    }),
  }));
  vi.doMock("./hooks/useRegistrationRealtime", () => ({
    default: () => ({
      clearAllNotifications: vi.fn(),
      connectionState: "connected",
      dismissNotification: vi.fn(),
      error: "",
      hospitalIdentity: {},
      loading: false,
      notifications: [],
      unreadCount: 0,
    }),
  }));
  vi.doMock("./components/dashboard/DashboardContent", () => ({
    default: ({ activeFunction, onNavigateToFunction }) => (
      <div>
        <div data-testid="dashboard-content">{activeFunction}</div>
        <button
          type="button"
          onClick={() =>
            onNavigateToFunction({
              centerTab: "dashboard",
              domain: "management",
              functionId: "beds",
              subsection: "room",
            })
          }
        >
          Go to beds
        </button>
      </div>
    ),
  }));
  vi.doMock("./components/dashboard/LeftRail", () => ({
    default: () => <nav data-testid="left-rail" />,
  }));
  vi.doMock("./components/dashboard/RightRail", () => ({
    default: () => <aside data-testid="right-rail" />,
  }));
  vi.doMock("./components/document/DocumentModal", () => ({
    default: () => null,
  }));
  vi.doMock("./components/document/DocumentModeOverlay", () => ({
    default: ({ children }) => <>{children}</>,
  }));
  vi.doMock("./components/dashboard/LenisScrollLayer", () => ({
    default: () => null,
  }));
  vi.doMock("./components/Toast", () => ({
    default: () => null,
  }));

  const { default: App } = await import("./App");
  return render(<App />);
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState({}, "", "/");
  window.matchMedia = vi.fn().mockReturnValue({
    addEventListener: vi.fn(),
    matches: false,
    removeEventListener: vi.fn(),
  });
  vi.resetModules();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
  vi.resetModules();
});

describe.sequential("App startup storage recovery", () => {
  it("renders the hospital access page with clean storage", async () => {
    await renderStartupApp();

    expect(
      screen.getByRole("heading", { name: "Welcome to ELLY Console" }),
    ).toBeInTheDocument();
  }, 10000);

  it("renders dashboard chrome for a complete persisted session", async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(buildValidSession()));

    await renderStartupApp();

    expect(screen.getByTestId("left-rail")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-content")).toHaveTextContent("command");
    expect(screen.getByTestId("right-rail")).toBeInTheDocument();
  });

  it("recovers from an invalid stored activeFunction", async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(buildValidSession()));
    localStorage.setItem("activeDomain", "overview");
    localStorage.setItem("activeCenterTab", "dashboard");
    localStorage.setItem("activeFunction", "THIS_FUNCTION_DOES_NOT_EXIST");

    await renderStartupApp();

    expect(screen.getByTestId("dashboard-content")).toHaveTextContent("command");
  });

  it("restores a complete valid persisted navigation tuple", async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(buildValidSession()));
    localStorage.setItem("activeDomain", "management");
    localStorage.setItem("activeSubsection", "room");
    localStorage.setItem("activeCenterTab", "dashboard");
    localStorage.setItem("activeFunction", "beds");

    await renderStartupApp();

    expect(screen.getByTestId("dashboard-content")).toHaveTextContent("beds");
  });

  it("rejects a persisted function when its saved domain/subsection is stale", async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(buildValidSession()));
    localStorage.setItem("activeDomain", "management");
    localStorage.setItem("activeSubsection", "admission");
    localStorage.setItem("activeCenterTab", "dashboard");
    localStorage.setItem("activeFunction", "admissions");

    await renderStartupApp();

    expect(screen.getByTestId("dashboard-content")).toHaveTextContent("command");
  });

  it("restores dashboard navigation from browser history state", async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(buildValidSession()));

    await renderStartupApp();
    await userEvent.click(screen.getByRole("button", { name: "Go to beds" }));

    expect(screen.getByTestId("dashboard-content")).toHaveTextContent("beds");

    act(() => {
      window.dispatchEvent(
        new PopStateEvent("popstate", {
          state: {
            dashboardNavigation: {
              centerTab: "dashboard",
              domain: "overview",
              functionId: "command",
              subsection: null,
            },
          },
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-content")).toHaveTextContent("command");
    });
  });

  it("rejects an incomplete persisted session and returns to access", async () => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        accessToken: "test-token",
        activeWorkspace: {
          workspaceId: "hospital-1",
          workspaceType: "HOSPITAL",
          workspaceName: "Demo Hospital",
        },
        currentUser: null,
      }),
    );

    await renderStartupApp();

    expect(
      screen.getByRole("heading", { name: "Welcome to ELLY Console" }),
    ).toBeInTheDocument();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});
