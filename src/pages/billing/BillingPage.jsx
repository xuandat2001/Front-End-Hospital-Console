import { useMemo, useState } from "react";
import { toast } from "../../components/Toast";
import { billingSummary, mockInvoices } from "../../data/billingMockData";
import BillingInsights from "./components/BillingInsights";
import BillingSummaryCards from "./components/BillingSummaryCards";
import BillingTabs from "./components/BillingTabs";
import InvoiceDetailsModal from "./components/InvoiceDetailsModal";
import InvoiceTable from "./components/InvoiceTable";
import InvoiceToolbar from "./components/InvoiceToolbar";
import NewInvoiceModal from "./components/NewInvoiceModal";
import PaymentModal from "./components/PaymentModal";
import RefundModal from "./components/RefundModal";
import "./billing.css";

const DEFAULT_FILTERS = {
  dateRange: "All",
  maxAmount: "",
  minAmount: "",
  paymentMethod: "All",
  status: "All",
};

function normalizeInvoice(invoice) {
  return {
    lineItems: [],
    notes: "",
    payments: [],
    refunds: [],
    refundedAmount: 0,
    ...invoice,
  };
}

function tabMatches(invoice, activeTab) {
  if (activeTab === "pending") return invoice.status === "Pending" || invoice.status === "Partial";
  if (activeTab === "paid") return invoice.status === "Paid";
  if (activeTab === "cancelled") return invoice.status === "Cancelled";
  if (activeTab === "refunds") return invoice.status === "Refunded";
  return true;
}

function filterMatches(invoice, filters) {
  if (filters.status !== "All" && invoice.status !== filters.status) return false;
  if (filters.paymentMethod !== "All" && invoice.paymentMethod !== filters.paymentMethod) return false;
  if (filters.minAmount && Number(invoice.totalAmount) < Number(filters.minAmount)) return false;
  if (filters.maxAmount && Number(invoice.totalAmount) > Number(filters.maxAmount)) return false;
  if (filters.dateRange === "Last 7 days" && invoice.issuedDate < "2026-05-14") return false;
  if (filters.dateRange === "Due soon" && invoice.dueDate > "2026-05-24") return false;
  return true;
}

function searchMatches(invoice, searchValue) {
  const query = searchValue.trim().toLowerCase();
  if (!query) return true;
  return [invoice.id, invoice.patientName, invoice.patientId]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function sortInvoices(invoices, sortConfig) {
  const direction = sortConfig.direction === "asc" ? 1 : -1;
  return [...invoices].sort((left, right) => {
    const leftValue = left[sortConfig.key];
    const rightValue = right[sortConfig.key];
    if (sortConfig.key === "totalAmount") {
      return (Number(leftValue) - Number(rightValue)) * direction;
    }
    return String(leftValue).localeCompare(String(rightValue)) * direction;
  });
}

function buildInvoiceFromForm(form, index) {
  const amount = Number(form.amount);
  const patientName = form.patient.trim();
  const safeName = patientName || "New Patient";
  return normalizeInvoice({
    department: form.department,
    dueDate: form.dueDate,
    id: `INV-2026-${1300 + index}`,
    issuedDate: "2026-05-21",
    issuedTime: "09:00 AM",
    lineItems: [{ label: form.serviceDescription.trim(), amount }],
    notes: form.notes.trim(),
    paidAmount: 0,
    patientId: `P${1300 + index}`,
    patientName: safeName,
    paymentMethod: form.paymentMethod,
    status: "Pending",
    totalAmount: amount,
  });
}

export default function BillingPage({ initialInvoices = mockInvoices }) {
  const [invoices, setInvoices] = useState(() => (initialInvoices || []).map(normalizeInvoice));
  const [activeTab, setActiveTab] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ direction: "desc", key: "issuedDate" });
  const [page, setPage] = useState(1);
  const [actionMenuId, setActionMenuId] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState("");
  const [refundInvoiceId, setRefundInvoiceId] = useState("");

  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId) || null;
  const paymentInvoice = invoices.find((invoice) => invoice.id === paymentInvoiceId) || null;
  const refundInvoice = invoices.find((invoice) => invoice.id === refundInvoiceId) || null;

  const filteredInvoices = useMemo(() => {
    const matching = invoices.filter(
      (invoice) =>
        tabMatches(invoice, activeTab) &&
        filterMatches(invoice, filters) &&
        searchMatches(invoice, searchValue),
    );
    return sortInvoices(matching, sortConfig);
  }, [activeTab, filters, invoices, searchValue, sortConfig]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedInvoices = filteredInvoices.slice((safePage - 1) * pageSize, safePage * pageSize);

  const changeTab = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const changeSort = (key) => {
    setSortConfig((current) => ({
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
      key,
    }));
  };

  const updateInvoice = (invoiceId, updater) => {
    setInvoices((current) =>
      current.map((invoice) => (invoice.id === invoiceId ? normalizeInvoice(updater(invoice)) : invoice)),
    );
  };

  const openPayment = (invoice) => {
    setActionMenuId("");
    setSelectedInvoiceId("");
    setPaymentInvoiceId(invoice.id);
  };

  const openRefund = (invoice) => {
    setActionMenuId("");
    setSelectedInvoiceId("");
    setRefundInvoiceId(invoice.id);
  };

  const markPaid = (invoice) => {
    updateInvoice(invoice.id, (current) => ({
      ...current,
      paidAmount: current.totalAmount,
      payments: [
        ...current.payments,
        { amount: current.totalAmount - current.paidAmount, date: "2026-05-22", method: current.paymentMethod, reference: "PROTO-PAID" },
      ],
      status: "Paid",
    }));
    setActionMenuId("");
    toast("Invoice marked as paid.", "success");
  };

  const cancelInvoice = (invoice) => {
    updateInvoice(invoice.id, (current) => ({ ...current, status: "Cancelled" }));
    setActionMenuId("");
    toast("Invoice cancelled.", "success");
  };

  const duplicateInvoice = (invoice) => {
    setInvoices((current) => [
      normalizeInvoice({
        ...invoice,
        id: `INV-2026-${1300 + current.length}`,
        issuedDate: "2026-05-21",
        issuedTime: "09:15 AM",
        paidAmount: 0,
        payments: [],
        refunds: [],
        status: "Pending",
      }),
      ...current,
    ]);
    setActionMenuId("");
    toast("Invoice duplicated.", "success");
  };

  const createInvoice = (form) => {
    setInvoices((current) => [buildInvoiceFromForm(form, current.length), ...current]);
    setActiveTab("all");
    setSearchValue(form.patient.trim());
    setPage(1);
    setNewInvoiceOpen(false);
    toast("Invoice created successfully.", "success");
  };

  const recordPayment = (payment) => {
    updateInvoice(paymentInvoice.id, (invoice) => {
      const paidAmount = Math.min(invoice.totalAmount, Number(invoice.paidAmount || 0) + payment.amount);
      return {
        ...invoice,
        paidAmount,
        paymentMethod: payment.method,
        payments: [
          ...invoice.payments,
          {
            amount: payment.amount,
            date: payment.paymentDate,
            method: payment.method,
            reference: payment.reference || "PROTO-PAYMENT",
          },
        ],
        status: paidAmount >= invoice.totalAmount ? "Paid" : "Partial",
      };
    });
    setPaymentInvoiceId("");
    toast("Payment recorded.", "success");
  };

  const issueRefund = (refund) => {
    updateInvoice(refundInvoice.id, (invoice) => ({
      ...invoice,
      refundedAmount: Number(invoice.refundedAmount || 0) + refund.amount,
      refunds: [
        ...invoice.refunds,
        {
          amount: refund.amount,
          date: "2026-05-22",
          method: refund.method,
          reason: refund.reason,
        },
      ],
      status: "Refunded",
    }));
    setRefundInvoiceId("");
    toast("Refund issued.", "success");
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setFiltersOpen(false);
    setPage(1);
  };

  const resetFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setFiltersOpen(false);
    setPage(1);
  };

  const first = filteredInvoices.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const last = Math.min(safePage * pageSize, filteredInvoices.length);

  return (
    <div className="billing-page">
      <header className="billing-header">
        <div>
          <h1>Billing</h1>
          <p>Manage patient billing, invoices, payments and claims</p>
        </div>
      </header>

      <BillingSummaryCards summary={billingSummary} />

      <div className="billing-main-grid">
        <section className="billing-invoice-panel">
          <div className="billing-tab-row">
            <BillingTabs activeTab={activeTab} onTabChange={changeTab} />
            <InvoiceToolbar
              draftFilters={draftFilters}
              filtersOpen={filtersOpen}
              onApplyFilters={applyFilters}
              onDraftFilterChange={(field, value) => setDraftFilters((current) => ({ ...current, [field]: value }))}
              onExport={() => toast("Invoice export prepared.", "success")}
              onFiltersClose={() => setFiltersOpen(false)}
              onFiltersToggle={() => setFiltersOpen((open) => !open)}
              onNewInvoice={() => setNewInvoiceOpen(true)}
              onResetFilters={resetFilters}
              onSearchChange={(value) => {
                setSearchValue(value);
                setPage(1);
              }}
              searchValue={searchValue}
            />
          </div>

          <InvoiceTable
            actionMenuId={actionMenuId}
            invoices={paginatedInvoices}
            onCancel={cancelInvoice}
            onDuplicate={duplicateInvoice}
            onIssueRefund={openRefund}
            onMarkPaid={markPaid}
            onRecordPayment={openPayment}
            onSort={changeSort}
            onToggleActionMenu={(invoiceId) => setActionMenuId((current) => (current === invoiceId ? "" : invoiceId))}
            onView={(invoice) => setSelectedInvoiceId(invoice.id)}
            sortConfig={sortConfig}
          />

          <footer className="billing-pagination">
            <span>Showing {first} to {last} of {filteredInvoices.length} results</span>
            <div>
              <button disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">
                Previous
              </button>
              {[...Array(totalPages)].slice(0, 4).map((_, index) => {
                const pageNumber = index + 1;
                return (
                  <button
                    className={safePage === pageNumber ? "is-active" : ""}
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    type="button"
                  >
                    {pageNumber}
                  </button>
                );
              })}
              <button disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} type="button">
                Next
              </button>
            </div>
          </footer>
        </section>
        <BillingInsights />
      </div>

      {newInvoiceOpen && <NewInvoiceModal onClose={() => setNewInvoiceOpen(false)} onCreate={createInvoice} />}
      {selectedInvoice && (
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoiceId("")}
          onIssueRefund={openRefund}
          onRecordPayment={openPayment}
        />
      )}
      {paymentInvoice && <PaymentModal invoice={paymentInvoice} onClose={() => setPaymentInvoiceId("")} onSubmit={recordPayment} />}
      {refundInvoice && <RefundModal invoice={refundInvoice} onClose={() => setRefundInvoiceId("")} onSubmit={issueRefund} />}
    </div>
  );
}
