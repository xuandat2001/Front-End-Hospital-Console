function PrototypePlaceholder({ title = "Demo data coming soon", message }) {
  return (
    <section className="dashboard-card m-4 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Prototype placeholder
      </p>
      <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
        {title}
      </h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        {message ||
          "This module is available in the copied UI and can be connected to richer mock data as the prototype expands."}
      </p>
    </section>
  );
}

export default PrototypePlaceholder;
