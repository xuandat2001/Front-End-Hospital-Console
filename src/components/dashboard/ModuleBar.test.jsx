/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ModuleBar from "./ModuleBar";

vi.mock("../../store/useSessionStore", () => ({
  default: (selector) =>
    selector({
      workspace: {
        hospitalName: "Dummy External Hospital",
        ellyHospitalId: "ELLY-ORG-019EA2DD-FBD-TEST",
      },
    }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ModuleBar", () => {
  it("shows the active facility and workspace above the center navigation", () => {
    render(
      <ModuleBar
        activeModule="clinical-operations"
        onModuleChange={vi.fn()}
        onNavigationOpen={vi.fn()}
      />,
    );

    expect(
      screen.getByLabelText("Facility: Dummy External Hospital"),
    ).toHaveTextContent("Dummy External Hospital");
    expect(
      screen.getByRole("button", { name: "Workspace: Clinical Operations" }),
    ).toBeInTheDocument();
  });

  it("only offers the supported clinical workspaces", async () => {
    const user = userEvent.setup();
    const onModuleChange = vi.fn();
    render(
      <ModuleBar
        activeModule="clinical-operations"
        onModuleChange={onModuleChange}
        onNavigationOpen={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Workspace: Clinical Operations" }),
    );
    const options = screen.getAllByRole("option");
    expect(screen.getByRole("listbox", { name: "Hospital workspaces" })).not.toHaveClass(
      "global-content-dropdown",
    );
    expect(options).toHaveLength(3);
    expect(
      options.map((option) => option.querySelector("strong")?.textContent),
    ).toEqual([
      "Clinical Operations",
      "Laboratory",
      "Radiology",
    ]);
    expect(
      screen.queryByRole("option", { name: "Supply Chain" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: "Radiology" }));

    expect(onModuleChange).toHaveBeenCalledWith("radiology");
  });

  it("places the ELLY ID search beside the workspace control", async () => {
    const user = userEvent.setup();
    const onPatientSearch = vi.fn();

    render(
      <ModuleBar
        activeModule="clinical-operations"
        onModuleChange={vi.fn()}
        onNavigationOpen={vi.fn()}
        onPatientSearch={onPatientSearch}
      />,
    );

    const controls = document.querySelector(".dashboard-module-controls");
    const workspaceControl = screen.getByRole("button", {
      name: "Workspace: Clinical Operations",
    });
    const search = screen.getByRole("search");
    const input = within(search).getByRole("textbox", {
      name: "Find patient by EllyID",
    });

    expect(controls).toContainElement(workspaceControl);
    expect(controls).toContainElement(search);
    expect(
      within(search).queryByRole("button", {
        name: "Focus patient search",
      }),
    ).not.toBeInTheDocument();

    await user.type(input, "  ELLY-PATIENT-2048  {Enter}");

    expect(onPatientSearch).toHaveBeenCalledWith("ELLY-PATIENT-2048");
  });
});
