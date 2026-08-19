import { useState } from "react";
import BillingModalShell from "./BillingModalShell";
import { formatCurrency } from "../billingFormatters";

const methods = ["Credit Card", "Insurance", "Cash", "Bank Transfer"];

export default function PaymentModal({ invoice, onClose, onSubmit }) {
  const balance = Math.max(Number(invoice?.totalAmount || 0) - Number(invoice?.paidAmount || 0), 0);
  const [form, setForm] = useState({
    amount: balance ? String(balance) : "",
    method: invoice?.paymentMethod || "Credit Card",
    paymentDate: "2026-05-22",
    reference: "",
  });
  const [error, setError] = useState("");

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const submit = (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setError("Enter a payment amount.");
      return;
    }
    onSubmit({ ...form, amount: Math.min(amount, balance || amount) });
  };

  return (
    <BillingModalShell onClose={onClose} title="Record Payment">
      <form className="billing-form" onSubmit={submit}>
        <p className="billing-modal-note">
          Balance due for {invoice.id}: <strong>{formatCurrency(balance)}</strong>
        </p>
        {error && <div className="billing-form-error" role="alert">{error}</div>}
        <label>
          Amount
          <input min="1" type="number" value={form.amount} onChange={(event) => update("amount", event.target.value)} />
        </label>
        <label>
          Payment Method
          <select value={form.method} onChange={(event) => update("method", event.target.value)}>
            {methods.map((method) => <option key={method} value={method}>{method}</option>)}
          </select>
        </label>
        <div className="billing-form-grid">
          <label>
            Reference
            <input value={form.reference} onChange={(event) => update("reference", event.target.value)} />
          </label>
          <label>
            Payment Date
            <input type="date" value={form.paymentDate} onChange={(event) => update("paymentDate", event.target.value)} />
          </label>
        </div>
        <div className="billing-modal-actions">
          <button className="billing-button billing-button--ghost" onClick={onClose} type="button">Cancel</button>
          <button className="billing-button billing-button--primary" type="submit">Record Payment</button>
        </div>
      </form>
    </BillingModalShell>
  );
}
