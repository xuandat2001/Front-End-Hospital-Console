import { CreditCard, FileText, ReceiptText, WalletCards } from "lucide-react";

const icons = {
  revenue: WalletCards,
  invoices: FileText,
  paid: CreditCard,
  outstanding: ReceiptText,
};

export default function BillingSummaryCards({ summary = [] }) {
  return (
    <div className="billing-summary-grid">
      {summary.map((item) => {
        const Icon = icons[item.id] || ReceiptText;
        return (
          <article className={`billing-kpi-card billing-kpi-card--${item.tone}`} key={item.id}>
            <div className="billing-kpi-icon">
              <Icon size={23} strokeWidth={1.9} />
            </div>
            <div>
              <p>{item.label}</p>
              <strong>{item.value}</strong>
              <span className={`billing-kpi-meta is-${item.trend}`}>
                {item.trend === "positive" ? "+ " : ""}
                {item.meta}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
