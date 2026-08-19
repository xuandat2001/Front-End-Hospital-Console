// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import BillingPage from "./BillingPage";

vi.mock("../../components/Toast", () => ({
  toast: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BillingPage", () => {
  it("filters pending payments to pending and partial invoices", async () => {
    const user = userEvent.setup();
    render(<BillingPage />);

    await user.click(screen.getByRole("tab", { name: "Pending Payments" }));

    expect(screen.getByText("INV-2026-1249")).toBeInTheDocument();
    expect(screen.getByText("INV-2026-1247")).toBeInTheDocument();
    expect(screen.queryByText("INV-2026-1250")).not.toBeInTheDocument();
  });

  it("searches by patient, patient ID, and invoice ID", async () => {
    const user = userEvent.setup();
    render(<BillingPage />);

    await user.type(screen.getByPlaceholderText("Search invoices..."), "Jane");

    expect(screen.getByText("INV-2026-1249")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
  });

  it("creates a mock invoice and shows it in the table", async () => {
    const user = userEvent.setup();
    render(<BillingPage />);

    await user.click(screen.getByRole("button", { name: "New Invoice" }));
    await user.type(screen.getByLabelText("Patient"), "Alex Morgan");
    await user.type(screen.getByLabelText("Service / Description"), "Surgery deposit");
    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "3000");
    await user.click(screen.getByRole("button", { name: "Create Invoice" }));

    expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    expect(screen.getByText("INV-2026-1312")).toBeInTheDocument();
  });

  it("records payment and updates pending invoice status to partial", async () => {
    const user = userEvent.setup();
    render(<BillingPage />);

    await user.click(screen.getByLabelText("More actions for INV-2026-1249"));
    await user.click(screen.getByRole("menuitem", { name: "Record Partial Payment" }));
    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "1000");
    await user.click(screen.getByRole("button", { name: "Record Payment" }));
    await user.click(screen.getByRole("tab", { name: "Pending Payments" }));

    const row = screen.getByText("INV-2026-1249").closest("tr");
    expect(within(row).getByText("Partial")).toBeInTheDocument();
  });

  it("renders without crashing when invoice data is empty", () => {
    render(<BillingPage initialInvoices={[]} />);

    expect(screen.getByRole("heading", { name: "Billing" })).toBeInTheDocument();
    expect(screen.getByText("No invoices match the current view.")).toBeInTheDocument();
  });
});
