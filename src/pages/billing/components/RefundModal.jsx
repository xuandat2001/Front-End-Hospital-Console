import { useState } from "react";
import BillingModalShell from "./BillingModalShell";
import { formatCurrency } from "../billingFormatters";

const methods = ["Credit Card", "Insurance", "Cash", "Bank Transfer"];

export default function RefundModal({ invoice, onClose, onSubmit }) {
  const paid = Math.max(Number(invoice?.paidAmount || 0) - Number(invoice?.refundedAmount || 0), 0);
  const [form, setForm] = useState({
    amount: paid ? String(paid) : "",
    method: invoice?.paymentMethod || "Credit Card",
    reason: "Billing adjustment",
  });
  const [error, setError] = useState("");

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const submit = (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0 || amount > paid) {
      setError(`Refund amount must be between $1 and ${formatCurrency(paid)}.`);
      return;
    }
    onSubmit({ ...form, amount });
  };

  return (
    <BillingModalShell onClose={onClose} title="Issue Refund">
      <form className="billing-form" onSubmit={submit}>
        <p className="billing-modal-note">
          Refundable amount for {invoice.id}: <strong>{formatCurrency(paid)}</strong>
        </p>
        {error && <div className="billing-form-error" role="alert">{error}</div>}
        <label>
          Refund Amount
          <input min="1" type="number" value={form.amount} onChange={(event) => update("amount", event.target.value)} />
        </label>
        <label>
          Reason
          <input value={form.reason} onChange={(event) => update("reason", event.target.value)} />
        </label>
        <label>
          Refund Method
          <select value={form.method} onChange={(event) => update("method", event.target.value)}>
            {methods.map((method) => <option key={method} value={method}>{method}</option>)}
          </select>
        </label>
        <div className="billing-modal-actions">
          <button className="billing-button billing-button--ghost" onClick={onClose} type="button">Cancel</button>
          <button className="billing-button billing-button--primary" type="submit">Confirm Refund</button>
        </div>
      </form>
    </BillingModalShell>
  );
}
