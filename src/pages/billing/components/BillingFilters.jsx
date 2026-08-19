const statuses = ["All", "Paid", "Pending", "Partial", "Cancelled", "Refunded"];
const methods = ["All", "Credit Card", "Insurance", "Cash", "Bank Transfer"];

export default function BillingFilters({
  draftFilters,
  onApply,
  onChange,
  onClose,
  onReset,
}) {
  return (
    <div className="billing-filter-popover" role="dialog" aria-label="Invoice filters">
      <div className="billing-filter-heading">
        <strong>Filters</strong>
        <button aria-label="Close filters" onClick={onClose} type="button">
          x
        </button>
      </div>
      <label>
        Status
        <select
          value={draftFilters.status}
          onChange={(event) => onChange("status", event.target.value)}
        >
          {statuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </label>
      <label>
        Date range
        <select
          value={draftFilters.dateRange}
          onChange={(event) => onChange("dateRange", event.target.value)}
        >
          <option value="All">All dates</option>
          <option value="Last 7 days">Last 7 days</option>
          <option value="Due soon">Due soon</option>
        </select>
      </label>
      <div className="billing-filter-row">
        <label>
          Min amount
          <input
            min="0"
            placeholder="0"
            type="number"
            value={draftFilters.minAmount}
            onChange={(event) => onChange("minAmount", event.target.value)}
          />
        </label>
        <label>
          Max amount
          <input
            min="0"
            placeholder="10000"
            type="number"
            value={draftFilters.maxAmount}
            onChange={(event) => onChange("maxAmount", event.target.value)}
          />
        </label>
      </div>
      <label>
        Payment method
        <select
          value={draftFilters.paymentMethod}
          onChange={(event) => onChange("paymentMethod", event.target.value)}
        >
          {methods.map((method) => (
            <option key={method} value={method}>{method}</option>
          ))}
        </select>
      </label>
      <div className="billing-filter-actions">
        <button className="billing-button billing-button--ghost" onClick={onReset} type="button">
          Reset
        </button>
        <button className="billing-button billing-button--primary" onClick={onApply} type="button">
          Apply
        </button>
      </div>
    </div>
  );
}
