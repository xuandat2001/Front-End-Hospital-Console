/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import StaffDepartmentManagement from "./StaffDepartmentManagement";

vi.mock("./StaffManagement", () => ({
  default: () => <section aria-label="staff panel">Staff panel content</section>,
}));

vi.mock("./DepartmentManagement", () => ({
  default: () => <section aria-label="department panel">Department panel content</section>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("StaffDepartmentManagement", () => {
  it("switches between staff and department admin panels", async () => {
    const user = userEvent.setup();
    render(<StaffDepartmentManagement />);

    expect(screen.getByLabelText("staff panel")).toBeInTheDocument();
    expect(screen.queryByLabelText("department panel")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Department Management" }));

    expect(screen.getByLabelText("department panel")).toBeInTheDocument();
    expect(screen.queryByLabelText("staff panel")).not.toBeInTheDocument();
  });
});
