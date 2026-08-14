/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import CancelFollowUpModal from "./CancelFollowUpModal";
import CompleteFollowUpModal from "./CompleteFollowUpModal";
import FollowUpDetailModal from "./FollowUpDetailModal";

const task = { followUpEllyId: "ELLY-FUP-1", patientName: "Jane", type: "PHONE_CHECK", status: "PENDING", displayStatus: "PENDING", dueAt: "2026-08-25T10:00:00.000Z" };
afterEach(cleanup);

it("complete modal sends completion notes", async () => {
  const user = userEvent.setup();
  const onConfirm = vi.fn();
  render(<CompleteFollowUpModal task={task} onBack={vi.fn()} onConfirm={onConfirm} />);
  await user.type(screen.getByLabelText("Completion notes"), "Patient stable");
  await user.click(screen.getByRole("button", { name: "Complete" }));
  expect(onConfirm).toHaveBeenCalledWith({ completionNotes: "Patient stable" });
});

it("requires a reason before canceling", async () => {
  const user = userEvent.setup();
  const onConfirm = vi.fn();
  render(<CancelFollowUpModal task={task} onBack={vi.fn()} onConfirm={onConfirm} />);
  await user.click(screen.getByRole("button", { name: "Cancel Follow-up" }));
  expect(screen.getByRole("alert")).toHaveTextContent("required");
  expect(onConfirm).not.toHaveBeenCalled();
});

it("hides mutation actions for final statuses", () => {
  render(<FollowUpDetailModal task={{ ...task, status: "COMPLETED", displayStatus: "COMPLETED" }} onClose={vi.fn()} />);
  expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Complete" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
});
