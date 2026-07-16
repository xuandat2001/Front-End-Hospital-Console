function donutStroke(status, index, paymentStatusMix) {
  const previous = paymentStatusMix
    .slice(0, index)
    .reduce((sum, item) => sum + item.percent, 0);

  return {
    stroke: status.color,
    strokeDasharray: `${status.percent} ${100 - status.percent}`,
    strokeDashoffset: `${25 - previous}`,
  };
}

function PaymentStatusCard({ paymentStatusMix }) {
  const totalInvoices = paymentStatusMix.reduce((sum, status) => sum + status.value, 0);

  return (
    <section className="billing-panel billing-status-panel">
      <div className="billing-panel-heading">
        <span className="billing-panel-label">
          Payment Status Mix
          <i aria-hidden="true">i</i>
        </span>
      </div>

      <div className="billing-status-content">
        <div className="billing-donut" aria-label="Payment status mix">
          <svg viewBox="0 0 120 120">
            <circle className="billing-donut-track" cx="60" cy="60" r="42" />
            {paymentStatusMix.map((status, index) => (
              <circle
                className="billing-donut-segment"
                cx="60"
                cy="60"
                key={status.label}
                r="42"
                style={donutStroke(status, index, paymentStatusMix)}
              />
            ))}
          </svg>
          <span>
            <strong>{totalInvoices.toLocaleString("en-US")}</strong>
            <small>Total Invoices</small>
          </span>
        </div>

        <div className="billing-status-legend">
          {paymentStatusMix.map((status) => (
            <div key={status.label}>
              <span>
                <i style={{ backgroundColor: status.color }} />
                {status.label}
              </span>
              <strong>
                {status.value} ({status.percent}%)
              </strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PaymentStatusCard;
