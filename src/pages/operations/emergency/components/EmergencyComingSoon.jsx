const COPY = {
  performance: ["Performance", "Response-time trends, SLA outcomes, and escalation performance will appear here."],
  planning: ["Planning", "Demand forecasts, staffing scenarios, and emergency readiness plans will appear here."],
  resources: ["Resource", "Detailed ambulance, bed, equipment, and emergency staffing management will appear here."],
  reports: ["Reports", "Executive emergency summaries, exports, and compliance reports will appear here."],
};

export default function EmergencyComingSoon({ tab }) {
  const [title, description] = COPY[tab] || COPY.performance;
  return (
    <div className="grid h-full place-items-center px-5 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-soft)]">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] text-sm font-black text-teal-700 dark:text-teal-300">E</span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">Emergency command center</p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--text)]">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--text-muted)]">{description}</p>
        <span className="mt-6 inline-flex rounded-full border border-[var(--line)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-bold text-[var(--text-muted)]">Coming soon</span>
      </section>
    </div>
  );
}
