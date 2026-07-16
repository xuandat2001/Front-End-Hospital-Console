import {
  AlertCircle,
  CreditCard,
  ReceiptText,
  TrendingUp,
} from "lucide-react";

const iconMap = {
  alert: AlertCircle,
  card: CreditCard,
  receipt: ReceiptText,
  trend: TrendingUp,
};

function BillingKpiCard({ item }) {
  const CardIcon = iconMap[item.icon] || TrendingUp;

  return (
    <section className="billing-kpi-card" data-tone={item.tone}>
      <div>
        <span className="billing-panel-label">
          {item.label}
          <i aria-hidden="true">i</i>
        </span>
        <strong>{item.value}</strong>
        <p>{item.detail}</p>
      </div>
      <span className="billing-kpi-icon" aria-hidden="true">
        <CardIcon size={34} strokeWidth={1.85} />
      </span>
    </section>
  );
}

export default BillingKpiCard;
