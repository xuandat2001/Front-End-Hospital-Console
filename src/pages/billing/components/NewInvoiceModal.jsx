import { useState } from "react";
import BillingModalShell from "./BillingModalShell";

const initialForm = {
  amount: "",
  department: "Cardiology",
  dueDate: "2026-06-01",
  notes: "",
  patient: "",
  paymentMethod: "Credit Card",
  serviceDescription: "",
};

const departments = ["Cardiology", "Emergency", "ICU", "Laboratory", "Neurology", "Orthopedics", "Radiology", "Surgery"];
const methods = ["Credit Card", "Insurance", "Cash", "Bank Transfer"];

export default function NewInvoiceModal({ onClose, onCreate }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const submit = (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.patient.trim() || !form.serviceDescription.trim() || !form.department || !amount || !form.dueDate) {
      setError("Patient, service, department, amount, and due date are required.");
      return;
    }
    onCreate({ ...form, amount });
  };

  return (
    <BillingModalShell onClose={onClose} title="New Invoice">
      <form className="billing-form" onSubmit={submit}>
        {error && <div className="billing-form-error" role="alert">{error}</div>}
        <label>
          Patient
          <input value={form.patient} onChange={(event) => update("patient", event.target.value)} placeholder="Patient name or ID" />
        </label>
        <label>
          Service / Description
          <input value={form.serviceDescription} onChange={(event) => update("serviceDescription", event.target.value)} placeholder="Consultation, diagnostic test..." />
        </label>
        <div className="billing-form-grid">
          <label>
            Department
            <select value={form.department} onChange={(event) => update("department", event.target.value)}>
              {departments.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
          </label>
          <label>
            Amount
            <input min="1" type="number" value={form.amount} onChange={(event) => update("amount", event.target.value)} />
          </label>
        </div>
        <div className="billing-form-grid">
          <label>
            Due Date
            <input type="date" value={form.dueDate} onChange={(event) => update("dueDate", event.target.value)} />
          </label>
          <label>
            Payment Method
            <select value={form.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)}>
              {methods.map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </label>
        </div>
        <label>
          Notes
          <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} rows={3} />
        </label>
        <div className="billing-modal-actions">
          <button className="billing-button billing-button--ghost" onClick={onClose} type="button">Cancel</button>
          <button className="billing-button billing-button--primary" type="submit">Create Invoice</button>
        </div>
      </form>
    </BillingModalShell>
  );
}
