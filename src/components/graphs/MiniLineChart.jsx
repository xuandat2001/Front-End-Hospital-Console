import { useId } from "react";

function MiniLineChart({
  data = [20, 35, 30, 45, 40, 60, 75],
  variant = "blue",
}) {
  const colors = {
    blue: "var(--accent)",
    purple: "var(--primary)",
    pink: "var(--secondary)",
    cyan: "var(--accent)",
    green: "var(--success)",
    emerald: "var(--success)",
  };

  const color = colors[variant] || colors.blue;

  const width = 220;
  const height = 92;
  const padding = 10;

  const max = Math.max(...data);
  const min = Math.min(...data);

  const points = data.map((value, index) => {
    const x =
      padding +
      (index * (width - padding * 2)) /
        (data.length - 1);

    const y =
      height -
      padding -
      ((value - min) / (max - min || 1)) *
        (height - padding * 2);

    return `${x},${y}`;
  });

  const linePath =
    "M " +
    points
      .map((point) => point.replace(",", " "))
      .join(" L ");

  const areaPath = `
    ${linePath}
    L ${width - padding} ${height}
    L ${padding} ${height}
    Z
  `;

  const gradientId = `gradient-${useId().replace(/:/g, "")}-${variant}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mini-line-chart h-full w-full"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stopColor={color}
            stopOpacity="0.6"
          />
          <stop
            offset="100%"
            stopColor={color}
            stopOpacity="0"
          />
        </linearGradient>
      </defs>

      <path
        className="chart-area-fill"
        d={areaPath}
        fill={`url(#${gradientId})`}
      />

      <path
        className="chart-line-path"
        d={linePath}
        fill="none"
        pathLength="1"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default MiniLineChart;
