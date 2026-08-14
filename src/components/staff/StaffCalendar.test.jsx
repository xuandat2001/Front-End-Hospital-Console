/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import StaffCalendar from "./StaffCalendar";
import { formatLocalDate, getMonday } from "./staffScheduleDate";

const DAY_NAMES = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

afterEach(() => {
  cleanup();
});

describe("StaffCalendar", () => {
  it("allows deleting a shift from a day popup", async () => {
    const user = userEvent.setup();
    const onShiftDelete = vi.fn();
    const today = new Date();
    const todayDate = today.getDate();
    const shift = {
      day: DAY_NAMES[today.getDay()],
      weekStart: formatLocalDate(getMonday(today)),
      startTime: "08:00",
      endTime: "16:00",
    };
    const person = {
      _id: "staff-1",
      ellyId: "ELLY-STAFF-1",
      fullName: "Dr Amelia Stone",
      departmentId: "CARD",
      schedule: [shift],
    };

    render(
      <StaffCalendar
        staff={[person]}
        departments={[{ ellyDepartmentId: "CARD", name: "Cardiology" }]}
        onShiftDelete={onShiftDelete}
      />,
    );

    await user.click(screen.getByText(String(todayDate)));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onShiftDelete).toHaveBeenCalledWith(person, shift, expect.any(Date));
  });
});
