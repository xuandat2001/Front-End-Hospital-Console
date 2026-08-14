/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AssignDepartmentModal from "./AssignDepartmentModal";
import StaffSchedulePanel from "./StaffSchedulePanel";

afterEach(cleanup);

function expectReadablePortal(name) {
  const dialog = screen.getByRole("dialog", { name });
  const surface = dialog.querySelector(".staff-resource-popup");

  expect(dialog).toHaveClass("console-tinted-popup-layer");
  expect(dialog.parentElement).toBe(document.body);
  expect(surface).toHaveClass("console-tinted-popup");
  expect(surface).toHaveAttribute("data-tone", "staff-resource-popup");
}

describe("Staff resource popups", () => {
  it("portals the department assignment dialog above the dashboard", () => {
    render(
      <AssignDepartmentModal
        member={{ ellyId: "ELLY-STAFF-1", fullName: "Avery Tran" }}
        departments={[{ _id: "dept-1", name: "Cardiology" }]}
        onAssigned={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expectReadablePortal("Assign Department");
  });

  it("portals the schedule dialog above the dashboard", () => {
    render(
      <StaffSchedulePanel
        member={{ ellyId: "ELLY-STAFF-1", fullName: "Avery Tran", schedule: [] }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expectReadablePortal("Schedule");
  });
});
