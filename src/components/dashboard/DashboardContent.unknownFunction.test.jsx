// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PERMISSIONS, ROLES } from "../../constant/rbac";
import useSessionStore from "../../store/useSessionStore";
import DashboardContent from "./DashboardContent";

describe("DashboardContent unknown function fallback", () => {
  it("renders a visible diagnostic page for an unsupported activeFunction", () => {
    useSessionStore.setState({
      currentUser: { role: ROLES.HOSPITAL_ADMIN },
      permissions: Object.values(PERMISSIONS),
    });

    render(
      <DashboardContent
        activeModule="clinical-operations"
        activeDomain="overview"
        activeFunction="intelligence-analytics-typo"
        activeCenterTab="dashboard"
        activeSubsection={null}
      />,
    );

    expect(screen.getByText("Page unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("This prototype view has not been configured."),
    ).toBeInTheDocument();
    expect(screen.getByText("intelligence-analytics-typo")).toBeInTheDocument();
  });
});
