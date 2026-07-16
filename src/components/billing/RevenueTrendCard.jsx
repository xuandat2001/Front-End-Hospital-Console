import { ChevronDown } from "lucide-react";
import { trendGranularityOptions } from "./billingMockData";

const chartWidth = 820;
const chartHeight = 230;
const padding = { top: 16, right: 24, bottom: 34, left: 54 };
const maxValue = 300;
const yLabels = [
  { label: "$300K", value: 300 },
  { label: "$225K", value: 225 },
  { label: "$150K", value: 150 },
  { label: "$75K", value: 75 },
  { label: "$0", value: 0 },
];

function pointFor(index, value, length) {
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const denominator = Math.max(length - 1, 1);
  const x = padding.left + (index / denominator) * plotWidth;
  const y = padding.top + (1 - value / maxValue) * plotHeight;
  return [x, y];
}

function RevenueTrendCard({
  granularity,
  isLoading,
  onGranularityChange,
  rangeLabel,
  trendData,
}) {
  const safeTrendData = trendData.length ? trendData : [{ label: "No data", value: 0 }];
  const granularityLabel =
    trendGranularityOptions.find((option) => option.id === granularity)?.label || "Daily";
  const points = safeTrendData.map((item, index) =>
    pointFor(index, item.value, safeTrendData.length),
  );
  const linePath = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const baseY = chartHeight - padding.bottom;
  const areaPath = `${linePath} L ${points.at(-1)[0].toFixed(1)} ${baseY} L ${points[0][0].toFixed(1)} ${baseY} Z`;
  const finalPoint = points.at(-1);
  const finalValue = safeTrendData.at(-1)?.value || 0;

  return (
    <section className="billing-panel billing-revenue-panel">
      <div className="billing-panel-heading">
        <span className="billing-panel-label">
          Revenue Trend
          <i aria-hidden="true">i</i>
        </span>
        <span className="billing-select-wrap billing-select-control">
          <span>{granularityLabel}</span>
          <select
            aria-label="Select revenue trend granularity"
            disabled={isLoading}
            onChange={(event) => onGranularityChange(event.target.value)}
            value={granularity}
          >
            {trendGranularityOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown size={15} strokeWidth={2} />
        </span>
      </div>

      <div
        className="billing-trend-chart"
        aria-busy={isLoading}
        aria-label={`Revenue trend for ${rangeLabel}`}
      >
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img">
          <defs>
            <linearGradient id="billingRevenueArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.54" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.04" />
            </linearGradient>
            <filter id="billingRevenueGlow" x="-20%" y="-40%" width="140%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {yLabels.map((tick) => {
            const [, y] = pointFor(0, tick.value, safeTrendData.length);
            return (
              <g key={tick.label}>
                <line
                  className="billing-chart-grid"
                  x1={padding.left}
                  x2={chartWidth - padding.right}
                  y1={y}
                  y2={y}
                />
                <text className="billing-chart-y-label" x={padding.left - 18} y={y + 4}>
                  {tick.label}
                </text>
              </g>
            );
          })}

          <path
            className="billing-chart-area"
            d={areaPath}
            fill="url(#billingRevenueArea)"
            key={`area-${rangeLabel}-${granularity}`}
          />
          <path
            className="billing-chart-line"
            d={linePath}
            filter="url(#billingRevenueGlow)"
            key={`line-${rangeLabel}-${granularity}`}
            pathLength="1"
          />

          {safeTrendData.map((item, index) => {
            const [x] = pointFor(index, 0, safeTrendData.length);
            return (
              <text className="billing-chart-x-label" key={item.label} x={x} y={chartHeight - 8}>
                {item.label}
              </text>
            );
          })}

          <circle className="billing-chart-endpoint" cx={finalPoint[0]} cy={finalPoint[1]} r="4" />
          <g className="billing-chart-callout">
            <rect x={finalPoint[0] + 8} y={finalPoint[1] - 18} width="70" height="27" rx="7" />
            <text x={finalPoint[0] + 43} y={finalPoint[1] - 1}>
              ${finalValue.toFixed(1)}K
            </text>
          </g>
        </svg>
        {isLoading && <span className="billing-chart-loading">Updating trend...</span>}
      </div>
    </section>
  );
}

export default RevenueTrendCard;
