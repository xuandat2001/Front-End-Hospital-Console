import { Component } from "react";

class PrototypeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[Prototype] Render fallback:", error, info);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="dashboard-shell">
        <section className="dashboard-card m-6 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Prototype placeholder
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            This demo panel is not wired yet.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            The frontend prototype is running in mock mode. This fallback prevents
            sparse demo data from breaking the dashboard while keeping the
            original component tree available for future wiring.
          </p>
          <button
            className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
            onClick={() => this.setState({ error: null })}
            type="button"
          >
            Try again
          </button>
        </section>
      </main>
    );
  }
}

export default PrototypeErrorBoundary;
