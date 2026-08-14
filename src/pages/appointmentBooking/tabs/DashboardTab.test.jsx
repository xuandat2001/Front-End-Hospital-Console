/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashboardTab from "./DashboardTab";

vi.mock("../components/AppointmentStatusOverview", () => ({
  default: ({ typeSummarySlot, aiSummarySlot }) => (
    <div>{typeSummarySlot}{aiSummarySlot}</div>
  ),
}));

vi.mock("../components/AppointmentFilters", () => ({
  default: () => <div>Appointment filters</div>,
}));

vi.mock("../components/AppointmentTable", () => ({
  default: () => <div>Appointment table</div>,
}));

afterEach(cleanup);

describe("Appointment Booking List dialog", () => {
  it("portals above the dashboard and closes from its enlarged action", async () => {
    const user = userEvent.setup();
    render(
      <DashboardTab
        appointments={[]}
        dashboardData={{
          typeRows: [],
          aiInsights: [],
          departmentRows: [],
          doctorRows: [],
        }}
        filters={{ keyword: "", status: "" }}
        onFilterChange={vi.fn()}
        onClearFilters={vi.fn()}
        departmentFilterOptions={[]}
        doctorFilterOptions={[]}
        loading={false}
        filteredAppointments={[]}
        paginatedAppointments={[]}
        pagination={{}}
        actions={{}}
        onRefresh={vi.fn()}
        onAddBooking={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "All Bookings" }));

    const dialog = screen.getByRole("dialog", { name: "Appointment Booking List" });
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog).toHaveClass("z-[12000]");
    expect(dialog).toHaveClass("console-tinted-popup-layer");
    expect(dialog).toHaveClass("console-tinted-popup-layer--panel-size");
    expect(dialog.firstElementChild).toHaveClass("appointment-booking-list-popup");
    expect(dialog.firstElementChild).toHaveAttribute("data-tone", "dense-popup");

    const closeButton = within(dialog).getByRole("button", { name: "Close" });
    expect(closeButton).toHaveClass("min-h-10", "min-w-16");
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Appointment Booking List" })).not.toBeInTheDocument();
    });
  });
});
