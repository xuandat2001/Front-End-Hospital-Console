function BarChart({ data = [], labels = [], compact }) {
  const max = Math.max(...data, 1);
  const yLabels = ["", "75%", "50%", "25%", "0%"];

  return (
    <div>
      <div className={`relative ml-8 flex h-40 items-end border-b border-l border-slate-200 dark:border-slate-700 ${compact ? "gap-1" : "gap-3"} pt-3`}>
        {[0, 25, 50, 75, 100].map((pct) => (
          <span
            key={pct}
            className="absolute left-0 w-14 -translate-x-full text-right text-[10px] text-slate-400"
            style={{ bottom: `${pct}%` }}
          >
            {yLabels[yLabels.length - 1 - Math.round(pct / 25)]}
          </span>
        ))}
        {data.map((value, index) => (
          <div
            key={index}
            aria-label={`${labels[index] || `Item ${index + 1}`}: ${value}`}
            className="chart-bar group relative flex w-full flex-col items-center"
            role="img"
            style={{ height: `${(value / max) * 100}%` }}
          >
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
              {value}
            </span>
            <div className="h-full w-full rounded-t-xl bg-gradient-to-t from-[var(--primary)] to-[var(--secondary)] shadow-sm dark:from-[var(--primary)] dark:to-[var(--accent)]" />
          </div>
        ))}
      </div>
      <div className="ml-8 mt-1 flex gap-3">
        {labels.map((label, index) => (
          <span
            key={index}
            className="w-full text-center text-[10px] font-medium text-slate-500 dark:text-slate-400"
          >
            {label.split(":")[0]}
          </span>
        ))}
      </div>
    </div>
  );
}

export default BarChart;
