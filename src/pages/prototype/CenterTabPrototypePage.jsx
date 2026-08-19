import { useMemo, useState } from "react";

function normalizeRows(rows) {
  return Array.isArray(rows) ? rows : [];
}

export default function CenterTabPrototypePage({
  actions = [],
  eyebrow = "Prototype workspace",
  metrics = [],
  rows = [],
  sections = [],
  subtitle,
  title,
}) {
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const visibleRows = useMemo(() => {
    const normalizedRows = normalizeRows(rows);
    const search = query.trim().toLowerCase();
    if (!search) return normalizedRows;

    return normalizedRows.filter((row) =>
      [row.name, row.owner, row.status, row.detail]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [query, rows]);

  const handleAction = (label) => {
    setNotice(`${label} prepared for this prototype view.`);
  };

  return (
    <div className="min-h-full p-4 pb-7 sm:p-6">
      <header className="dashboard-card mb-4 rounded-2xl border p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
          {eyebrow}
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {subtitle && (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(actions.length ? actions : ["Export", "Refresh"]).map((label) => (
              <button
                className="rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-100 hover:bg-violet-500/20"
                key={label}
                onClick={() => handleAction(label)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
            {notice}
          </div>
        )}
      </header>

      {metrics.length > 0 && (
        <section className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article
              className="dashboard-card rounded-2xl border p-4"
              key={metric.label}
            >
              <p className="text-xs font-semibold text-slate-400">{metric.label}</p>
              <strong className="mt-2 block text-2xl font-bold text-white">
                {metric.value}
              </strong>
              <span className="mt-1 block text-xs text-slate-400">
                {metric.caption}
              </span>
            </article>
          ))}
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="dashboard-card rounded-2xl border p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Work queue</h2>
              <p className="text-sm text-slate-400">
                Mock rows are local frontend state for prototype navigation.
              </p>
            </div>
            <label className="w-full max-w-xs">
              <span className="sr-only">Search work queue</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search this view..."
                type="search"
                value={query}
              />
            </label>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Detail</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-400" colSpan={4}>
                      No rows match this prototype filter.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => (
                    <tr className="border-t border-white/10" key={row.name}>
                      <td className="px-4 py-3 font-semibold text-white">{row.name}</td>
                      <td className="px-4 py-3 text-slate-300">{row.owner}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-lg border border-violet-400/25 bg-violet-500/10 px-2 py-1 text-xs font-bold text-violet-100">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{row.detail}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="grid gap-4">
          {sections.map((section) => (
            <section
              className="dashboard-card rounded-2xl border p-5"
              key={section.title}
            >
              <h2 className="text-base font-bold text-white">{section.title}</h2>
              <ul className="mt-3 grid gap-2 text-sm text-slate-300">
                {(section.items || []).map((item) => (
                  <li
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                    key={item}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </aside>
      </div>
    </div>
  );
}
