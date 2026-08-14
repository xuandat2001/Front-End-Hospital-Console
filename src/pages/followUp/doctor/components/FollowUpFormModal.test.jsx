/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import FollowUpFormModal from "./FollowUpFormModal";

afterEach(cleanup);

it("creates a follow-up with only editable fields", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<FollowUpFormModal open appointment={{ _id: "appointment-1", patient: { id: "patient-1", name: "Jane", ellyId: "ELLY-USR-1" }, appointmentDateTime: "2026-08-11T09:00:00.000Z" }} onClose={vi.fn()} onSubmit={onSubmit} />);
  await user.selectOptions(screen.getByLabelText("Follow-up type"), "MEDICATION_REVIEW");
  await user.selectOptions(screen.getByLabelText("Priority"), "HIGH");
  await user.type(screen.getByLabelText("Due date and time"), "2026-08-25T10:30");
  await user.type(screen.getByLabelText("Instructions"), "Review medication response");
  await user.click(screen.getByRole("button", { name: "Create Follow-up" }));
  expect(onSubmit).toHaveBeenCalledOnce();
  const payload = onSubmit.mock.calls[0][0];
  expect(payload).toMatchObject({ type: "MEDICATION_REVIEW", priority: "HIGH", instructions: "Review medication response" });
  expect(payload.dueAt).toBeTruthy();
  expect(payload).not.toHaveProperty("doctorId");
  expect(payload).not.toHaveProperty("hospitalId");
  expect(payload).not.toHaveProperty("patientId");
});
