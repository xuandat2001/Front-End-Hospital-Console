import InvoiceStatusBadge from "./InvoiceStatusBadge";
import BillingModalShell from "./BillingModalShell";
import { formatCurrency, formatDate } from "../billingFormatters";

export default function InvoiceDetailsModal({
  invoice,
  onClose,
  onIssueRefund,
  onRecordPayment,
}) {
  if (!invoice) return null;

  const subtotal = invoice.lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const tax = Math.round(subtotal * 0.04);
  const insuranceAdjustment = invoice.paymentMethod === "Insurance" ? Math.round(subtotal * 0.12) : 0;
  const balanceDue = Math.max(invoice.totalAmount - invoice.paidAmount, 0);
  const canRecordPayment = invoice.status === "Pending" || invoice.status === "Partial";
  const canRefund = invoice.paidAmount > 0 && invoice.status !== "Cancelled";

  return (
    <BillingModalShell onClose={onClose} title="Invoice Details">
      <div className="billing-details">
        <div className="billing-details-grid">
          <div>
            <span>Invoice ID</span>
            <strong>{invoice.id}</strong>
          </div>
          <div>
            <span>Status</span>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <div>
            <span>Patient</span>
            <strong>{invoice.patientName}</strong>
            <small>{invoice.patientId}</small>
          </div>
          <div>
            <span>Department</span>
            <strong>{invoice.department}</strong>
          </div>
          <div>
            <span>Date issued</span>
            <strong>{formatDate(invoice.issuedDate)}</strong>
          </div>
          <div>
            <span>Due date</span>
            <strong>{formatDate(invoice.dueDate)}</strong>
          </div>
        </div>

        <section>
          <h3>Line items</h3>
          <ul className="billing-line-items">
            {invoice.lineItems.map((item) => (
              <li key={`${invoice.id}-${item.label}`}>
                <span>{item.label}</span>
                <strong>{formatCurrency(item.amount)}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="billing-totals">
          <dl>
            <div><dt>Subtotal</dt><dd>{formatCurrency(subtotal)}</dd></div>
            <div><dt>Tax</dt><dd>{formatCurrency(tax)}</dd></div>
            <div><dt>Insurance Adjustment</dt><dd>-{formatCurrency(insuranceAdjustment)}</dd></div>
            <div><dt>Total</dt><dd>{formatCurrency(invoice.totalAmount)}</dd></div>
            <div><dt>Paid</dt><dd>{formatCurrency(invoice.paidAmount)}</dd></div>
            <div><dt>Balance Due</dt><dd>{formatCurrency(balanceDue)}</dd></div>
          </dl>
        </section>

        <section>
          <h3>Payment history</h3>
          {invoice.payments.length === 0 ? (
            <p className="billing-muted">No payments have been recorded.</p>
          ) : (
            <ul className="billing-history-list">
              {invoice.payments.map((payment) => (
                <li key={`${invoice.id}-${payment.reference}-${payment.amount}`}>
                  <span>{formatDate(payment.date)} - {payment.method}</span>
                  <strong>{formatCurrency(payment.amount)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        {invoice.refunds.length > 0 && (
          <section>
            <h3>Refund history</h3>
            <ul className="billing-history-list">
              {invoice.refunds.map((refund) => (
                <li key={`${invoice.id}-${refund.reason}-${refund.amount}`}>
                  <span>{formatDate(refund.date)} - {refund.method} - {refund.reason}</span>
                  <strong>{formatCurrency(refund.amount)}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="billing-modal-actions">
          <button className="billing-button billing-button--ghost" onClick={onClose} type="button">Close</button>
          {canRecordPayment && (
            <button className="billing-button billing-button--primary" onClick={() => onRecordPayment(invoice)} type="button">
              Record Payment
            </button>
          )}
          {canRefund && (
            <button className="billing-button billing-button--warning" onClick={() => onIssueRefund(invoice)} type="button">
              Issue Refund
            </button>
          )}
        </div>
      </div>
    </BillingModalShell>
  );
}
