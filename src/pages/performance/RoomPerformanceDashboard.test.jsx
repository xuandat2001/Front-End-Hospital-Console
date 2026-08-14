/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RoomPerformanceDashboard from "./RoomPerformanceDashboard";
import { roomPerformanceService } from "../../services/performance/roomPerformanceApi";
import { roomService } from "../../services/core-modules/roomApi";

vi.mock("../../services/performance/roomPerformanceApi", () => ({
  roomPerformanceService: {
    getAllPerformances: vi.fn(),
  },
}));

vi.mock("../../services/core-modules/roomApi", () => ({
  roomService: {
    getAllRooms: vi.fn(),
  },
}));

vi.mock("../../components/graphs/MiniPieChart", () => ({
  default: () => <div data-testid="mini-pie-chart" />,
}));

vi.mock("../../components/graphs/BarChart", () => ({
  default: ({ data, labels }) => (
    <div data-testid="bar-chart">
      {labels.map((label, index) => (
        <span key={label}>{`${label}:${data[index]}`}</span>
      ))}
    </div>
  ),
}));

beforeEach(() => {
  roomPerformanceService.getAllPerformances.mockResolvedValue({
    success: true,
    data: [
      {
        _id: "perf-1",
        performanceId: "PERF-1",
        roomId: "ROOM-101",
        occupancyRate: 0,
        turnoverRate: 10,
        cleanlinessScore: 90,
        maintenanceScore: 95,
        averageLengthOfStay: 2,
        calculatedAt: "2026-08-13T00:00:00.000Z",
      },
    ],
  });
  roomService.getAllRooms.mockResolvedValue({
    success: true,
    data: [
      {
        _id: "room-mongo-1",
        ellyId: "ROOM-101",
        roomNumber: "101",
        roomType: "ICU",
        occupiedBeds: 3,
        capacity: 4,
      },
    ],
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RoomPerformanceDashboard", () => {
  it("uses live room occupancy when performance occupancy is empty", async () => {
    render(<RoomPerformanceDashboard />);

    await waitFor(() => expect(screen.getByText("Highest Occupancy Rooms")).toBeInTheDocument());

    expect(screen.getByText("101 (ICU)")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });
});
