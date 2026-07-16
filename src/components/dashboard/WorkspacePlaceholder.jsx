import { workspacePages } from "../../data";

function WorkspacePlaceholder({ activeFunction }) {
  const pageInfo = workspacePages[activeFunction] || workspacePages.command;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-5">
      <div className="dashboard-card bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
          Workspace page
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
          {pageInfo.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600 dark:text-slate-300">
          {pageInfo.description}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {pageInfo.items.map((item) => (
          <section
            key={item}
            className="dashboard-card p-4 dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {item}
              </h2>
              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                Frontend
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="h-3 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-3 w-4/5 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default WorkspacePlaceholder;
