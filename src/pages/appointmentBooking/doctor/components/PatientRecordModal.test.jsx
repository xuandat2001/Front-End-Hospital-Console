/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const recordView = vi.fn(({ ellyId }) => <div>Record for {ellyId}</div>);
vi.mock("../../../core-modules/patients/record/PatientRecordView", () => ({
  default: recordView,
}));

const { default: PatientRecordModal } = await import("./PatientRecordModal");

afterEach(cleanup);

it("renders the existing patient record inside a closable popup", () => {
  const onClose = vi.fn();
  const workspace = { id: "hospital-1" };
  render(
    <PatientRecordModal
      patient={{ name: "Jane", ellyId: "ELLY-USR-01" }}
      workspace={workspace}
      onClose={onClose}
    />,
  );

  expect(screen.getByRole("dialog", { name: "Jane" })).toBeInTheDocument();
  expect(screen.getByText("Record for ELLY-USR-01")).toBeInTheDocument();
  expect(recordView).toHaveBeenCalledWith(
    expect.objectContaining({
      ellyId: "ELLY-USR-01",
      workspace,
      initialTab: "overview",
      allowUnregistered: true,
    }),
    undefined,
  );
  fireEvent.click(screen.getByRole("button", { name: "Close patient record" }));
  expect(onClose).toHaveBeenCalledOnce();
});
