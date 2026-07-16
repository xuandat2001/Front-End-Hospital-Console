import MiniLineChart from "../../../components/graphs/MiniLineChart";

export default function AppointmentKpiCard({
  title,
  value,
  description,
  detail,
  icon,
  trend,
  variant = "blue",
}) {
  return (
    <div className="appointment-card p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl dark:bg-slate-800">
          {icon}
        </div>
        <div>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">
            {title}
          </p>
          {description ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-4xl font-bold text-slate-950 dark:text-white">
            {value}
          </p>
          {detail ? (
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {detail}
            </p>
          ) : null}
        </div>
        <div className="h-12 w-28">
          <MiniLineChart data={trend} variant={variant} />
        </div>
      </div>
    </div>
  );
}

