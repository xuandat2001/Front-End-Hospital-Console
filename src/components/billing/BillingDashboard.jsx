import { useMemo, useState } from "react";
import { CalendarDays, Search, X } from "lucide-react";
import BillingKpiCard from "./BillingKpiCard";
import PaymentStatusCard from "./PaymentStatusCard";
import RecentInvoicesTable from "./RecentInvoicesTable";
import RevenueTrendCard from "./RevenueTrendCard";
import TopBillingCategories from "./TopBillingCategories";
import {
  billingDatasets,
  dateRangeOptions,
  invoiceStatusOptions,
} from "./billingMockData";
import "./BillingDashboard.css";

function BillingDashboard() {
  const [selectedDateRange, setSelectedDateRange] = useState("may2025");
  const [trendGranularity, setTrendGranularity] = useState("daily");
  const [categorySortMode, setCategorySortMode] = useState("revenue");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAllInvoices, setShowAllInvoices] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [isRangeLoading, setIsRangeLoading] = useState(false);

  const dataset = billingDatasets[selectedDateRange] || billingDatasets.may2025;
  const selectedDateRangeLabel =
    dateRangeOptions.find((option) => option.id === selectedDateRange)?.label || dataset.label;
  const hasActiveFilters = Boolean(searchQuery) || statusFilter !== "all";

  const filteredInvoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return dataset.invoices.filter((invoice) => {
      const matchesStatus =
        statusFilter === "all" || invoice.status.toLowerCase() === statusFilter;
      const matchesQuery =
        !query ||
        [invoice.id, invoice.patient, invoice.department, invoice.status]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesStatus && matchesQuery;
    });
  }, [dataset.invoices, searchQuery, statusFilter]);

  const selectedInvoice = useMemo(
    () => filteredInvoices.find((invoice) => invoice.id === selectedInvoiceId) || null,
    [filteredInvoices, selectedInvoiceId],
  );

  const handleDateRangeChange = (event) => {
    const nextRange = event.target.value;

    setSelectedDateRange(nextRange);
    setSelectedInvoiceId(null);
    setShowAllInvoices(false);
    setIsRangeLoading(true);
    window.setTimeout(() => setIsRangeLoading(false), 360);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearchQuery(searchDraft.trim());
    setSelectedInvoiceId(null);
  };

  const clearSearch = () => {
    setSearchDraft("");
    setSearchQuery("");
    setStatusFilter("all");
    setSelectedInvoiceId(null);
  };

  return (
    <div className="billing-dashboard-shell">
      <div className="billing-dashboard">
        <header className="billing-header">
          <div>
            <span className="billing-eyebrow">
              <span aria-hidden="true">[]</span>
              Billing
            </span>
            <h1>Billing &amp; Revenue Management</h1>
            <p>Track invoices, payments, claims, and revenue performance in real time.</p>
          </div>

          <form className="billing-header-actions" onSubmit={handleSearchSubmit}>
            <label htmlFor="billing-date-range">Date range</label>
            <div className="billing-select-wrap billing-date-control">
              <CalendarDays size={16} strokeWidth={1.9} />
              <span>{selectedDateRangeLabel}</span>
              <select
                aria-label="Select billing date range"
                disabled={isRangeLoading}
                id="billing-date-range"
                onChange={handleDateRangeChange}
                value={selectedDateRange}
              >
                {dateRangeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              className="billing-search-input"
              onChange={(event) => setSearchDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") clearSearch();
              }}
              placeholder="Search invoices..."
              value={searchDraft}
            />
            <button className="billing-search-button" disabled={isRangeLoading} type="submit">
              <Search size={15} strokeWidth={2} />
              Search
            </button>
            {hasActiveFilters && (
              <button className="billing-clear-button" onClick={clearSearch} type="button">
                <X size={14} strokeWidth={2} />
                Clear
              </button>
            )}
          </form>
        </header>

        {(hasActiveFilters || isRangeLoading) && (
          <div className="billing-feedback-strip" aria-live="polite">
            {isRangeLoading ? (
              <span>Refreshing billing metrics for {dataset.label}...</span>
            ) : (
              <span>
                Showing {filteredInvoices.length} invoice
                {filteredInvoices.length === 1 ? "" : "s"}
                {searchQuery ? ` matching "${searchQuery}"` : ""}.
              </span>
            )}
          </div>
        )}

        <section className="billing-kpi-grid" aria-label="Billing KPI summary">
          {dataset.kpis.map((item) => (
            <BillingKpiCard item={item} key={item.id} />
          ))}
        </section>

        <section className="billing-analytics-grid" aria-label="Billing analytics">
          <RevenueTrendCard
            granularity={trendGranularity}
            isLoading={isRangeLoading}
            onGranularityChange={setTrendGranularity}
            rangeLabel={dataset.label}
            trendData={dataset.trends[trendGranularity] || dataset.trends.daily}
          />
          <PaymentStatusCard paymentStatusMix={dataset.paymentStatusMix} />
        </section>

        <section className="billing-bottom-grid" aria-label="Billing details">
          <RecentInvoicesTable
            invoices={filteredInvoices}
            isLoading={isRangeLoading}
            onInvoiceSelect={setSelectedInvoiceId}
            onShowAllToggle={() => setShowAllInvoices((current) => !current)}
            onStatusFilterChange={(nextStatus) => {
              setStatusFilter(nextStatus);
              setSelectedInvoiceId(null);
            }}
            selectedInvoice={selectedInvoice}
            selectedInvoiceId={selectedInvoiceId}
            showAllInvoices={showAllInvoices}
            statusFilter={statusFilter}
            statusOptions={invoiceStatusOptions}
          />
          <TopBillingCategories
            categories={dataset.categories}
            onSortModeChange={setCategorySortMode}
            sortMode={categorySortMode}
          />
        </section>
      </div>
    </div>
  );
}

export default BillingDashboard;
