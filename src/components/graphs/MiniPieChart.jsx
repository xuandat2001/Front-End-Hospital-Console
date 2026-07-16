function MiniPieChart({
  slices = [],
  centerLabel = "",
  showLegend = true,
  compact = false,
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const labels = String(centerLabel).split("\n");
  const segments = slices.reduce(
    (result, slice, index) => {
      const percentage = (slice.value / total) * 100;
      const previousOffset = result.length
        ? result[result.length - 1].endOffset
        : 0;

      return [
        ...result,
        {
          ...slice,
          endOffset: previousOffset + percentage,
          index,
          percentage,
          segmentOffset: previousOffset,
        },
      ];
    },
    [],
  );

  return (
    <div
      className={
        compact
          ? "flex w-full items-center gap-2"
          : "flex flex-col items-center gap-3"
      }
    >
      <div
        className={`mini-donut shrink-0 ${compact ? "mini-donut-compact" : ""}`}
        role="img"
        aria-label={labels.join(" ")}
      >
        <svg viewBox="0 0 120 120">
          <circle className="mini-donut-track" cx="60" cy="60" r="48" />
          {segments.map((segment) => {
            return (
              <circle
                className="mini-donut-segment"
                cx="60"
                cy="60"
                key={`${segment.label}-${segment.index}`}
                pathLength="100"
                r="48"
                stroke={segment.color}
                strokeDasharray={`${segment.percentage} ${100 - segment.percentage}`}
                strokeDashoffset={-segment.segmentOffset}
                style={{
                  "--dash": segment.percentage,
                  animationDelay: `${segment.index * 120}ms`,
                }}
              />
            );
          })}
        </svg>
        <span>
          <strong>{labels[0]}</strong>
          {labels[1] && <small>{labels[1]}</small>}
        </span>
      </div>
      {showLegend && (
        <div
          className={
            compact
              ? "flex min-w-0 flex-1 flex-col gap-0.5"
              : "flex flex-col gap-1.5"
          }
        >
          {segments.map((segment) => (
            <div
              key={segment.label}
              className={
                compact
                  ? "flex min-w-0 items-center gap-1 text-[10px] leading-tight"
                  : "flex items-center gap-2 text-xs"
              }
            >
              <span
                className={
                  compact
                    ? "h-1.5 w-1.5 shrink-0 rounded-full"
                    : "h-2.5 w-2.5 rounded-full"
                }
                style={{ backgroundColor: segment.color }}
              />
              <span
                className={
                  compact
                    ? "min-w-0 truncate font-medium text-slate-600 dark:text-slate-400"
                    : "font-medium text-slate-600 dark:text-slate-400"
                }
              >
                {segment.label}
              </span>
              <span className="shrink-0 text-slate-500">
                {segment.value} ({Math.round(segment.percentage)}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MiniPieChart;
