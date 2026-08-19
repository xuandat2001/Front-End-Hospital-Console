const BILLING_TABS = [
  { id: "all", label: "All Invoices" },
  { id: "pending", label: "Pending Payments" },
  { id: "paid", label: "Paid Invoices" },
  { id: "cancelled", label: "Cancelled Invoices" },
  { id: "refunds", label: "Refunds" },
];

export default function BillingTabs({ activeTab, onTabChange }) {
  return (
    <div className="billing-tabs" role="tablist" aria-label="Invoice filters">
      {BILLING_TABS.map((tab) => (
        <button
          aria-selected={activeTab === tab.id}
          className={activeTab === tab.id ? "is-active" : ""}
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          role="tab"
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
