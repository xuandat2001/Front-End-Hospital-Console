import { Eye, MoreVertical } from "lucide-react";
import InvoiceStatusBadge from "./InvoiceStatusBadge";
import { formatCurrency, formatDate } from "../billingFormatters";

const sortableColumns = [
  { key: "id", label: "Invoice ID" },
  { key: "patientName", label: "Patient" },
  { key: "issuedDate", label: "Date" },
  { key: "totalAmount", label: "Amount" },
  { key: "status", label: "Status" },
  { key: "dueDate", label: "Due Date" },
];

function getDueLabel(invoice) {
  if (invoice.status === "Paid" || invoice.status === "Cancelled" || invoice.status === "Refunded") {
    return formatDate(invoice.dueDate);
  }

  const due = new Date(`${invoice.dueDate}T00:00:00`);
  const base = new Date("2026-05-20T00:00:00");
  const days = Math.max(0, Math.ceil((due - base) / 86_400_000));
  return `${formatDate(invoice.dueDate)} (${days} days)`;
}

export default function InvoiceTable({
  actionMenuId,
  invoices = [],
  onCancel,
  onDuplicate,
  onIssueRefund,
  onMarkPaid,
  onRecordPayment,
  onSort,
  onToggleActionMenu,
  onView,
  sortConfig,
}) {
  return (
    <div className="billing-table-wrap">
      <table className="billing-table">
        <thead>
          <tr>
            {sortableColumns.map((column) => (
              <th key={column.key} scope="col">
                <button onClick={() => onSort(column.key)} type="button">
                  {column.label}
                  <span aria-hidden="true">
                    {sortConfig.key === column.key ? (sortConfig.direction === "asc" ? " up" : " down") : ""}
                  </span>
                </button>
              </th>
            ))}
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.length === 0 ? (
            <tr>
              <td className="billing-empty-row" colSpan={7}>
                No invoices match the current view.
              </td>
            </tr>
          ) : (
            invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>
                  <button className="billing-link-button" onClick={() => onView(invoice)} type="button">
                    {invoice.id}
                  </button>
                </td>
                <td>
                  <strong>{invoice.patientName}</strong>
                  <span>{invoice.patientId}</span>
                </td>
                <td>
                  <strong>{formatDate(invoice.issuedDate)}</strong>
                  <span>{invoice.issuedTime}</span>
                </td>
                <td>{formatCurrency(invoice.totalAmount)}</td>
                <td><InvoiceStatusBadge status={invoice.status} /></td>
                <td className={invoice.status === "Pending" || invoice.status === "Partial" ? "is-due" : ""}>
                  {getDueLabel(invoice)}
                </td>
                <td>
                  <div className="billing-row-actions">
                    <button aria-label={`View ${invoice.id}`} onClick={() => onView(invoice)} type="button">
                      <Eye size={15} />
                    </button>
                    <div className="billing-more-anchor">
                      <button
                        aria-expanded={actionMenuId === invoice.id}
                        aria-label={`More actions for ${invoice.id}`}
                        onClick={() => onToggleActionMenu(invoice.id)}
                        type="button"
                      >
                        <MoreVertical size={15} />
                      </button>
                      {actionMenuId === invoice.id && (
                        <div className="billing-row-menu" role="menu">
                          <button disabled={invoice.status === "Paid"} onClick={() => onMarkPaid(invoice)} role="menuitem" type="button">
                            Mark as Paid
                          </button>
                          <button onClick={() => onRecordPayment(invoice)} role="menuitem" type="button">
                            Record Partial Payment
                          </button>
                          <button disabled={invoice.paidAmount <= 0} onClick={() => onIssueRefund(invoice)} role="menuitem" type="button">
                            Issue Refund
                          </button>
                          <button disabled={invoice.status === "Cancelled"} onClick={() => onCancel(invoice)} role="menuitem" type="button">
                            Cancel Invoice
                          </button>
                          <button onClick={() => onDuplicate(invoice)} role="menuitem" type="button">
                            Duplicate Invoice
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
