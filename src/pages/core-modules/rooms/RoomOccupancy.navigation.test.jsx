// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import RoomOccupancy from "./RoomOccupancy";

vi.mock("../../../hooks/useRoomOccupancy", () => ({
  default: () => ({
    availableBeds: 1,
    byRoomType: {
      GENERAL_WARD: [
        {
          _id: "room-1",
          bedsAvailable: 1,
          capacity: 2,
          ellyId: "ROOM-1",
          occupancyRate: 50,
          occupiedBeds: 1,
          patients: [],
          roomNumber: "A101",
          status: "AVAILABLE",
        },
      ],
    },
    connectionState: "connected",
    error: "",
    loading: false,
    occupiedBeds: 1,
    refresh: vi.fn(),
    rooms: [
      {
        _id: "room-1",
        bedsAvailable: 1,
        capacity: 2,
        ellyId: "ROOM-1",
        occupancyRate: 50,
        occupiedBeds: 1,
        patients: [],
        roomNumber: "A101",
        roomType: "GENERAL_WARD",
        status: "AVAILABLE",
      },
    ],
    totalBeds: 2,
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RoomOccupancy navigation buttons", () => {
  it("sends View Admission to the registered admission workflow", async () => {
    const onNavigateToFunction = vi.fn();

    render(<RoomOccupancy onNavigateToFunction={onNavigateToFunction} />);

    await userEvent.click(screen.getByRole("button", { name: "View Admission" }));

    expect(onNavigateToFunction).toHaveBeenCalledWith({
      centerTab: "dashboard",
      domain: "operations",
      functionId: "admissions",
      subsection: "admission",
    });
  });

  it("sends View Surgery to the registered surgery workflow", async () => {
    const onNavigateToFunction = vi.fn();

    render(<RoomOccupancy onNavigateToFunction={onNavigateToFunction} />);

    await userEvent.click(screen.getByRole("button", { name: "View Surgery" }));

    expect(onNavigateToFunction).toHaveBeenCalledWith({
      centerTab: "dashboard",
      domain: "operations",
      functionId: "surgery-records",
      subsection: "surgery",
    });
  });
});
