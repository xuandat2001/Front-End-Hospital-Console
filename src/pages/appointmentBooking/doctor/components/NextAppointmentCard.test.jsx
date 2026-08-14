/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import NextAppointmentCard from "./NextAppointmentCard";

const appointment = {
  _id: "appointment-1",
  appointmentDateTime: "2026-08-10T09:00:00.000Z",
  durationMinutes: 30,
  consultationType: "IN_PERSON",
  reason: "Follow-up",
  patient: { name: "Jane", ellyId: "ELLY-PAT-1" },
  department: { name: "Neurology" },
};

afterEach(cleanup);

function renderCard(status) {
  const handlers = {
    onStart: vi.fn(),
    onComplete: vi.fn(),
    onCreateFollowUp: vi.fn(),
    onNoShow: vi.fn(),
    onCancel: vi.fn(),
    onView: vi.fn(),
  };
  render(
    <NextAppointmentCard
      appointment={{ ...appointment, status }}
      loading={false}
      updating={false}
      {...handlers}
    />,
  );
  return handlers;
}

describe("NextAppointmentCard visit lifecycle", () => {
  it("offers Start Visit, no-show, and cancel for a booked visit", async () => {
    const user = userEvent.setup();
    const handlers = renderCard("BOOKED");

    expect(screen.queryByRole("button", { name: /complete visit/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /start visit/i }));
    expect(handlers.onStart).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: /no-show/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("offers follow-up creation beside Complete Visit for an active visit", async () => {
    const user = userEvent.setup();
    const handlers = renderCard("IN_PROGRESS");

    expect(screen.getByText("IN PROGRESS")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /no-show/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
    const createFollowUp = screen.getByRole("button", { name: /create follow-up/i });
    const completeVisit = screen.getByRole("button", { name: /complete visit/i });
    expect(createFollowUp.parentElement?.firstElementChild).toBe(createFollowUp);
    expect(createFollowUp.nextElementSibling).toBe(completeVisit);
    await user.click(createFollowUp);
    expect(handlers.onCreateFollowUp).toHaveBeenCalledOnce();
    await user.click(completeVisit);
    expect(handlers.onComplete).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: /view details/i })).toBeInTheDocument();
  });
});
