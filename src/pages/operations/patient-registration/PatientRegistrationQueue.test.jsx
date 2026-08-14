/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import useRegistrationQueue from "../../../hooks/useRegistrationQueue";
import PatientRegistrationQueue from "./PatientRegistrationQueue";

vi.mock("../../../hooks/useRegistrationQueue", () => ({
  default: vi.fn(),
}));

vi.mock("../../../hooks/useRegistrationStore", () => ({
  default: (selector) =>
    selector({
      clearFocusRegistration: vi.fn(),
      focusRegistrationEventId: null,
    }),
}));

vi.mock("../../../services/core-modules/patientApi", () => ({
  patientService: {
    getPatientByEllyId: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("PatientRegistrationQueue", () => {
  it("derives wait-time metrics when the backend summary is unavailable", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T08:00:00.000Z"));

    useRegistrationQueue.mockReturnValue({
      queue: [
        {
          eventId: "registration-1",
          ellyId: "ELLY-PATIENT-1",
          fullName: "Demo Patient",
          priority: "CRITICAL",
          registeredAt: "2026-07-31T07:00:00.000Z",
          status: "PENDING",
        },
      ],
      summary: null,
      loading: false,
      error: "",
      actionState: {},
      refresh: vi.fn(),
      remove: vi.fn(),
      readd: vi.fn(),
    });

    render(<PatientRegistrationQueue />);

    expect(screen.getByText("60 min")).toBeInTheDocument();
    expect(screen.getByText("1 waiting")).toBeInTheDocument();
    expect(screen.getByText("Demo Patient")).toBeInTheDocument();
  });

  it("portals the full roster into the readable Console popup layer", () => {
    const queue = Array.from({ length: 9 }, (_, index) => ({
      eventId: `registration-${index}`,
      ellyId: `ELLY-PATIENT-${index}`,
      fullName: `Patient ${index}`,
      priority: "STANDARD",
      registeredAt: "2026-07-31T07:00:00.000Z",
      status: "PENDING",
    }));

    useRegistrationQueue.mockReturnValue({
      queue,
      summary: null,
      loading: false,
      error: "",
      actionState: {},
      refresh: vi.fn(),
      remove: vi.fn(),
      readd: vi.fn(),
    });

    render(<PatientRegistrationQueue />);
    fireEvent.click(screen.getByRole("button", { name: /View \d+ more registrations/ }));

    const dialog = screen.getByRole("dialog", { name: "Full Registration Roster" });
    const surface = dialog.querySelector(".registration-roster-popup");
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog).toHaveClass("console-tinted-popup-layer");
    expect(surface).toHaveClass("console-tinted-popup");
    expect(surface).toHaveAttribute("data-tone", "registration-roster-popup");
  });
});
