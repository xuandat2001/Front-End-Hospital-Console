/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppointmentTable from "./AppointmentTable";

afterEach(cleanup);

describe("AppointmentTable actions", () => {
  it("centers the actions heading and View control in their column", () => {
    render(
      <AppointmentTable
        loading={false}
        filteredAppointments={[{ _id: "appointment-1", patient: { fullName: "Jane" } }]}
        paginatedAppointments={[{ _id: "appointment-1", patient: { fullName: "Jane" } }]}
        pagination={{
          safeCurrentPage: 1,
          itemsPerPage: 10,
          setItemsPerPage: vi.fn(),
          setCurrentPage: vi.fn(),
          totalPages: 1,
          paginationPages: [1],
        }}
        actions={{ view: vi.fn() }}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Actions" })).toHaveClass("text-center");
    expect(screen.getByRole("button", { name: "View appointment" }).parentElement).toHaveClass("justify-center");
  });
});
