const STATUS_LABELS = {
  Paid: "Paid",
  Pending: "Pending",
  Partial: "Partial",
  Cancelled: "Cancelled",
  Refunded: "Refunded",
};

export default function InvoiceStatusBadge({ status }) {
  const normalized = STATUS_LABELS[status] || "Pending";
  return (
    <span className={`billing-status-badge billing-status-badge--${normalized.toLowerCase()}`}>
      {normalized}
    </span>
  );
}
