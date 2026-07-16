import { useMemo, useState } from "react";
import { ChevronDown, FileText, MoreVertical } from "lucide-react";

function RecentInvoicesTable({
  invoices,
  isLoading,
  onInvoiceSelect,
  onShowAllToggle,
  onStatusFilterChange,
  selectedInvoice,
  selectedInvoiceId,
  showAllInvoices,
  statusFilter,
  statusOptions,
}) {
  const [amountSort, setAmountSort] = useState("none");
  const sortedInvoices = useMemo(() => {
    if (amountSort === "none") return invoices;

    return [...invoices].sort((left, right) => {
      const direction = amountSort === "desc" ? -1 : 1;
      return (left.amount - right.amount) * direction;
    });
  }, [amountSort, invoices]);
  const visibleInvoices = showAllInvoices ? sortedInvoices : sortedInvoices.slice(0, 5);
  const hasMoreInvoices = sortedInvoices.length > 5;
  const statusFilterLabel =
    statusOptions.find((option) => option.id === statusFilter)?.label || "All statuses";

  return (
    <section className="billing-panel billing-invoices-panel">
      <div className="billing-panel-heading">
        <span className="billing-panel-label">
          Recent Invoices
          <i aria-hidden="true">i</i>
        </span>
        <div className="billing-table-tools">
          <span className="billing-select-wrap billing-status-filter">
            <span>{statusFilterLabel}</span>
            <select
              aria-label="Filter invoices by status"
              disabled={isLoading}
              onChange={(event) => onStatusFilterChange(event.target.value)}
              value={statusFilter}
            >
              {statusOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown size={15} strokeWidth={2} />
          </span>
          <button
            className="billing-table-action"
            disabled={!hasMoreInvoices || isLoading}
            onClick={onShowAllToggle}
            type="button"
          >
            {showAllInvoices ? "Show less" : "View all"}
          </button>
        </div>
      </div>

      <div className="billing-table" role="table" aria-busy={isLoading} aria-label="Recent invoices">
        <div className="billing-table-row billing-table-head" role="row">
          <span>Invoice ID</span>
          <span>Patient</span>
          <span>Department</span>
          <button
            className="billing-amount-sort"
            onClick={() =>
              setAmountSort((current) => {
                if (current === "none") return "desc";
                return current === "desc" ? "asc" : "desc";
              })
            }
            type="button"
          >
            Amount {amountSort === "none" ? "" : amountSort === "desc" ? "Desc" : "Asc"}
          </button>
          <span>Status</span>
          <span>Issue Date</span>
          <span>Due Date</span>
          <span aria-label="Actions" />
        </div>

        {isLoading && (
          <div className="billing-table-state" role="status">
            Updating invoice list...
          </div>
        )}

        {!isLoading &&
          visibleInvoices.map((invoice) => {
            const isSelected = selectedInvoiceId === invoice.id;

            return (
              <div className="billing-invoice-row-group" key={invoice.id}>
                <button
                  aria-expanded={isSelected}
                  className="billing-table-row billing-table-row-button"
                  data-selected={isSelected}
                  onClick={() => onInvoiceSelect(isSelected ? null : invoice.id)}
                  role="row"
                  type="button"
                >
                  <span className="billing-invoice-id">
                    <FileText size={13} strokeWidth={1.8} />
                    {invoice.id}
                  </span>
                  <span>{invoice.patient}</span>
                  <span>{invoice.department}</span>
                  <span>{invoice.amountLabel}</span>
                  <span>
                    <em data-status={invoice.status.toLowerCase()}>{invoice.status}</em>
                  </span>
                  <span>{invoice.issueDate}</span>
                  <span>{invoice.dueDate}</span>
                  <span className="billing-row-menu" aria-label={`Actions for ${invoice.id}`}>
                    <MoreVertical size={15} strokeWidth={2} />
                  </span>
                </button>

                {isSelected && selectedInvoice && (
                  <div className="billing-invoice-details">
                    <div>
                      <span>Invoice</span>
                      <strong>{selectedInvoice.id}</strong>
                    </div>
                    <div>
                      <span>Patient</span>
                      <strong>{selectedInvoice.patient}</strong>
                    </div>
                    <div>
                      <span>Department</span>
                      <strong>{selectedInvoice.department}</strong>
                    </div>
                    <div>
                      <span>Amount</span>
                      <strong>{selectedInvoice.amountLabel}</strong>
                    </div>
                    <div>
                      <span>Payment</span>
                      <strong>{selectedInvoice.paymentStatus}</strong>
                    </div>
                    <div className="billing-line-items">
                      <span>Line items</span>
                      <p>{selectedInvoice.lineItems.join(" / ")}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

        {!isLoading && visibleInvoices.length === 0 && (
          <div className="billing-table-state">
            <strong>No invoices found</strong>
            <span>Try a different search term or status filter.</span>
          </div>
        )}
      </div>
    </section>
  );
}

export default RecentInvoicesTable;
