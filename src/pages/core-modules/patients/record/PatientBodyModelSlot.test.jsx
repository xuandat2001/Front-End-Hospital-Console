/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import PatientBodyModelSlot from "./PatientBodyModelSlot";

const viewerControls = vi.hoisted(() => ({
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  fullscreen: vi.fn(),
}));

vi.mock("./PatientBodyModelViewer", async () => {
  const React = await import("react");
  const {
    getBodyModelManifest,
    resolveBodyModelVariant,
  } = await import("./patientBodyModelConfig");
  return {
    default: React.forwardRef(function MockPatientBodyModelViewer(props, ref) {
      React.useImperativeHandle(ref, () => viewerControls);
      const resolution = resolveBodyModelVariant(props.patientGender);
      const manifest = getBodyModelManifest(resolution.variant);
      return (
        <div
          aria-label="Loaded 3D body model"
          data-model-url={manifest.url}
          data-patient-gender={props.patientGender}
        />
      );
    }),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PatientBodyModelSlot controls", () => {
  it("keeps the model viewport as the complete placeholder surface", () => {
    render(
      <PatientBodyModelSlot
        activeSystem="overview"
        onSystemChange={() => {}}
        patientGender="female"
        patientName="Test Patient"
      />,
    );

    const surface = screen.getByTestId("patient-body-model-surface");
    const canvasLayer = screen.getByTestId("patient-body-model-canvas-layer");

    expect(canvasLayer.parentElement).toBe(surface);
    expect(canvasLayer).toHaveClass("absolute", "inset-0");
    expect(screen.queryByText("Clinical focus")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fullscreen" })).toBeInTheDocument();
    expect(canvasLayer).toContainElement(
      screen.getByRole("button", { name: "Fullscreen" }),
    );
  });

  it("keeps zoom and fullscreen controls connected to the 3D viewer", async () => {
    const user = userEvent.setup();
    render(
      <PatientBodyModelSlot
        activeSystem="overview"
        onSystemChange={() => {}}
        patientGender="female"
        patientName="Test Patient"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Zoom in" }));
    await user.click(screen.getByRole("button", { name: "Zoom out" }));
    await user.click(screen.getByRole("button", { name: "Fullscreen" }));

    expect(viewerControls.zoomIn).toHaveBeenCalledOnce();
    expect(viewerControls.zoomOut).toHaveBeenCalledOnce();
    expect(viewerControls.fullscreen).toHaveBeenCalledOnce();
  });

  it("changes the selected model URL when patient gender changes", () => {
    const { rerender } = render(
      <PatientBodyModelSlot
        activeSystem="overview"
        onSystemChange={() => {}}
        patientGender="female"
        patientName="Test Patient"
      />,
    );

    expect(screen.getByLabelText("Loaded 3D body model")).toHaveAttribute(
      "data-model-url",
      "/models/FemaleBodyHumanAnatomy.glb",
    );

    rerender(
      <PatientBodyModelSlot
        activeSystem="overview"
        onSystemChange={() => {}}
        patientGender="male"
        patientName="Another Patient"
      />,
    );

    expect(screen.getByLabelText("Loaded 3D body model")).toHaveAttribute(
      "data-model-url",
      "/models/MaleBodyHumanAnatomy.glb",
    );
  });

});
