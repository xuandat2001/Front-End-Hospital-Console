import { Download, Filter, Plus, Search } from "lucide-react";
import BillingFilters from "./BillingFilters";

export default function InvoiceToolbar({
  draftFilters,
  filtersOpen,
  onApplyFilters,
  onDraftFilterChange,
  onExport,
  onFiltersClose,
  onFiltersToggle,
  onNewInvoice,
  onResetFilters,
  onSearchChange,
  searchValue,
}) {
  return (
    <div className="billing-toolbar">
      <label className="billing-search">
        <Search size={17} strokeWidth={1.9} />
        <span className="sr-only">Search invoices</span>
        <input
          placeholder="Search invoices..."
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
      <div className="billing-toolbar-actions">
        <div className="billing-filter-anchor">
          <button className="billing-button billing-button--ghost" onClick={onFiltersToggle} type="button">
            <Filter size={16} />
            Filters
          </button>
          {filtersOpen && (
            <BillingFilters
              draftFilters={draftFilters}
              onApply={onApplyFilters}
              onChange={onDraftFilterChange}
              onClose={onFiltersClose}
              onReset={onResetFilters}
            />
          )}
        </div>
        <button className="billing-button billing-button--ghost" onClick={onExport} type="button">
          <Download size={16} />
          Export
        </button>
        <button className="billing-button billing-button--primary" onClick={onNewInvoice} type="button">
          <Plus size={16} />
          New Invoice
        </button>
      </div>
    </div>
  );
}
