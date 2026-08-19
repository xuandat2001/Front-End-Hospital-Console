// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PrototypeErrorBoundary from "./PrototypeErrorBoundary";

function ThrowingPage() {
  throw new Error("Test page failed");
}

function HealthyPage() {
  return <div>Healthy dashboard</div>;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PrototypeErrorBoundary recovery", () => {
  it("calls onReset when Return to Dashboard is clicked", async () => {
    const onReset = vi.fn();

    render(
      <PrototypeErrorBoundary
        pageId="broken-page"
        resetKey="broken-page"
        onReset={onReset}
      >
        <ThrowingPage />
      </PrototypeErrorBoundary>,
    );

    expect(screen.getByText("This page encountered an error.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Return to Dashboard" }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("clears a stored error when the navigation reset key changes", () => {
    const { rerender } = render(
      <PrototypeErrorBoundary pageId="broken-page" resetKey="broken-page">
        <ThrowingPage />
      </PrototypeErrorBoundary>,
    );

    expect(screen.getByText("This page encountered an error.")).toBeInTheDocument();

    rerender(
      <PrototypeErrorBoundary pageId="command" resetKey="command">
        <HealthyPage />
      </PrototypeErrorBoundary>,
    );

    expect(screen.getByText("Healthy dashboard")).toBeInTheDocument();
  });

  it("keeps Try Again scoped to the current page", async () => {
    render(
      <PrototypeErrorBoundary pageId="broken-page" resetKey="broken-page">
        <ThrowingPage />
      </PrototypeErrorBoundary>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Try Again" }));

    expect(screen.getByText("This page encountered an error.")).toBeInTheDocument();
  });
});
