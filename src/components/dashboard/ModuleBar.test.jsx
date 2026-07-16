/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
});
