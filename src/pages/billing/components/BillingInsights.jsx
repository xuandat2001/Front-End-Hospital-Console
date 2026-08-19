import { claimsSummary, paymentMethodBreakdown, revenueSeries } from "../../../data/billingMockData";

function Sparkline({ data = [] }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const points = data.map((value, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * 100;
    const y = 48 - ((value - min) / Math.max(max - min, 1)) * 40;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg className="billing-sparkline" preserveAspectRatio="none" viewBox="0 0 100 56" aria-label="Revenue trend">
      <polyline points={points} />
    </svg>
  );
}

function PaymentRing() {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const segments = paymentMethodBreakdown.reduce((items, item) => {
    const previousOffset = items.reduce((sum, segment) => sum + segment.dash, 0);
    return [
      ...items,
      {
        ...item,
        dash: (item.value / 100) * circumference,
        offset: previousOffset,
      },
    ];
  }, []);

  return (
    <div className="billing-payment-methods">
      <svg viewBox="0 0 88 88" aria-label="Payment methods breakdown">
        <circle className="billing-ring-track" cx="44" cy="44" r={radius} />
        {segments.map((item) => (
          <circle
            className="billing-ring-segment"
            cx="44"
            cy="44"
            key={item.label}
            r={radius}
            stroke={item.color}
            strokeDasharray={`${item.dash} ${circumference - item.dash}`}
            strokeDashoffset={-item.offset}
          />
        ))}
      </svg>
      <div className="billing-method-list">
        {paymentMethodBreakdown.map((item) => (
          <div key={item.label}>
            <span style={{ "--method-color": item.color }} />
            <p>{item.label}</p>
            <strong>{item.value}%</strong>
            <small>{item.amount}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BillingInsights() {
  return (
    <aside className="billing-insights" aria-label="Billing analytics">
      <article className="billing-insight-card">
        <p>Revenue Overview</p>
        <strong>$248,750.00</strong>
        <span className="billing-positive">+12.5% from last month</span>
        <Sparkline data={revenueSeries} />
      </article>
      <article className="billing-insight-card">
        <p>Payment Methods</p>
        <PaymentRing />
      </article>
      <article className="billing-insight-card">
        <p>Pending Claims</p>
        <strong>{claimsSummary.pendingClaims} Total Claims</strong>
        <dl className="billing-claims-grid">
          <div>
            <dt>Total Amount</dt>
            <dd>{claimsSummary.totalAmount}</dd>
          </div>
          <div>
            <dt>Average Processing Time</dt>
            <dd>{claimsSummary.averageProcessingTime}</dd>
          </div>
          <div>
            <dt>Approved Rate</dt>
            <dd>{claimsSummary.approvedRate}</dd>
          </div>
        </dl>
      </article>
    </aside>
  );
}
