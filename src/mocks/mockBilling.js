export { billingDatasets as mockBillingDatasets } from "../components/billing/billingMockData";

export const mockBilling = {
  overdueAccounts: 24,
  payments: [
    { id: "pay-001", invoiceId: "INV-2025-10459", amount: 2450, method: "CARD", status: "CONFIRMED" },
    { id: "pay-002", invoiceId: "INV-2025-10456", amount: 950, method: "CASH", status: "CONFIRMED" },
  ],
};
