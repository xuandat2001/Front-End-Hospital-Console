import { AlertTriangle, Clock3 } from "lucide-react";
import { formatTime } from "../../../../utils/dateFormat";

export function formatNumber(value, fallback = "N/A") {
  if (!Number.isFinite(Number(value))) return fallback;
  return Number(value).toLocaleString();
}

export function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return "N/A";
  return `${Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 1)}%`;
}

export function formatDateInput(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function formatShortTime(value) {
  return formatTime(value) || "Pending";
}

export function statusTone(status) {
  const value = String(status || "stable").toLowerCase();
  if (["critical", "breached", "overloaded"].includes(value)) return "critical";
  if (["warning", "elevated"].includes(value)) return "warning";
  if (["stable", "available", "met", "normal"].includes(value)) return "stable";
  return "neutral";
}

export function WidgetShell({
  title,
  kicker,
  icon: Icon,
  loading,
  error,
  empty,
  emptyText = "No emergency data for this view.",
  children,
  className = "",
}) {
  return (
    <section className={`emergency-ops-panel ${className}`} aria-label={title}>
      <div className="emergency-ops-panel-header">
        <div>
          {kicker ? <p>{kicker}</p> : null}
          <h2>{title}</h2>
        </div>
        {Icon ? (
          <span className="emergency-ops-icon" aria-hidden="true">
            <Icon size={16} strokeWidth={1.9} />
          </span>
        ) : null}
      </div>

      {loading ? <WidgetSkeleton /> : null}
      {!loading && error ? <WidgetError message={error} /> : null}
      {!loading && !error && empty ? <WidgetEmpty message={emptyText} /> : null}
      {!loading && !error && !empty ? children : null}
    </section>
  );
}

export function WidgetSkeleton() {
  return (
    <div className="emergency-ops-skeleton" aria-label="Loading emergency widget">
      <span />
      <span />
      <span />
    </div>
  );
}

export function WidgetError({ message }) {
  return (
    <div className="emergency-ops-state is-error" role="alert">
      <AlertTriangle size={16} strokeWidth={1.9} />
      <p>{message}</p>
    </div>
  );
}

export function WidgetEmpty({ message }) {
  return (
    <div className="emergency-ops-state">
      <Clock3 size={16} strokeWidth={1.9} />
      <p>{message}</p>
    </div>
  );
}

export function StatusBadge({ status, children }) {
  return (
    <span className="emergency-ops-badge" data-tone={statusTone(status)}>
      {children || status || "Stable"}
    </span>
  );
}

export function ConfidenceBadge({ confidence }) {
  const value = Number(confidence);
  const tone = value >= 0.82 ? "stable" : value >= 0.7 ? "warning" : "critical";
  return (
    <span className="emergency-ops-badge" data-tone={tone}>
      {Number.isFinite(value) ? `${Math.round(value * 100)}% confidence` : "No confidence"}
    </span>
  );
}

export function MiniTrendChart({ data = [], series, height = 150, ariaLabel }) {
  const width = 640;
  const padding = { top: 16, right: 22, bottom: 26, left: 34 };
  const values = data.flatMap((bucket) =>
    series.map((item) => Number(bucket[item.key])).filter(Number.isFinite),
  );
  const max = Math.max(...values, 1);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  function pathFor(item) {
    const points = data
      .map((bucket, index) => {
        const value = Number(bucket[item.key]);
        if (!Number.isFinite(value)) return null;
        return {
          x: padding.left + (data.length <= 1 ? 0 : (index / (data.length - 1)) * innerWidth),
          y: padding.top + innerHeight - (value / max) * innerHeight,
        };
      })
      .filter(Boolean);
    return points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");
  }

  return (
    <div className="emergency-ops-chart-wrap">
      <svg
        aria-label={ariaLabel}
        className="emergency-ops-line-chart"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        {[0, 0.5, 1].map((step) => {
          const y = padding.top + innerHeight * step;
          return (
            <g key={step}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
              <text x={8} y={y + 4}>
                {Math.round(max * (1 - step))}
              </text>
            </g>
          );
        })}
        {series.map((item) => (
          <path
            d={pathFor(item)}
            fill="none"
            key={item.key}
            stroke={item.color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
        ))}
        {data.map((bucket, index) => {
          if (index % Math.ceil(Math.max(data.length, 1) / 6) !== 0) return null;
          const x = padding.left + (data.length <= 1 ? 0 : (index / (data.length - 1)) * innerWidth);
          return (
            <text key={bucket.key || index} textAnchor="middle" x={x} y={height - 8}>
              {bucket.label}
            </text>
          );
        })}
      </svg>
      <div className="emergency-ops-legend">
        {series.map((item) => (
          <span key={item.key}>
            <i style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function BarList({ rows = [], valueKey = "count", labelKey = "label", max }) {
  const maxValue =
    max || Math.max(...rows.map((row) => Number(row[valueKey])).filter(Number.isFinite), 1);
  return (
    <div className="emergency-ops-bars">
      {rows.map((row) => {
        const value = Number(row[valueKey]) || 0;
        return (
          <div className="emergency-ops-bar-row" key={row.key || row[labelKey]}>
            <div>
              <p>{row[labelKey]}</p>
              <strong>{formatNumber(value, "0")}</strong>
            </div>
            <span aria-label={`${row[labelKey]} ${value}`} role="img">
              <i style={{ width: `${Math.max(3, (value / maxValue) * 100)}%` }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
