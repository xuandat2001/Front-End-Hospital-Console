/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import RoomManagement from "./RoomManagement";

vi.mock("../../../services/core-modules/roomApi", () => ({
  roomService: {
    getAllRooms: vi.fn().mockResolvedValue({ data: [{
      _id: "room-1",
      ellyId: "ELLY-ROOM-001",
      roomNumber: "101",
      roomType: "GENERAL_WARD",
      capacity: 8,
      occupiedBeds: 2,
      status: "AVAILABLE",
    }] }),
    createRoom: vi.fn(),
    updateRoom: vi.fn(),
    deleteRoom: vi.fn(),
  },
}));

vi.mock("../../../services/core-modules/hospitalApi", () => ({
  hospitalService: {
    getAllHospitals: vi.fn().mockResolvedValue({ data: [] }),
    getAllDepartmentsList: vi.fn().mockResolvedValue([]),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RoomManagement dialogs", () => {
  it.each([
    ["Create Room", "+ Add Room"],
    ["Edit Room", "Edit"],
  ])("portals the tinted %s form", async (dialogName, openerName) => {
    const user = userEvent.setup();
    render(<RoomManagement />);

    const opener = await screen.findByRole("button", { name: openerName });
    await user.click(opener);

    const dialog = screen.getByRole("dialog", { name: dialogName });
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog).toHaveClass("z-[12000]", "console-tinted-popup-layer");
    expect(dialog.firstElementChild).toHaveClass("console-tinted-popup");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: dialogName })).not.toBeInTheDocument());
  });
});
