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
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  handleTryAgain = () => {
    this.setState({ error: null });
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="h-full overflow-y-auto p-4 sm:p-5">
        <section className="dashboard-card m-6 max-w-3xl p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Prototype error
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            This page encountered an error.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            The rest of the hospital console is still available. Use Return to
            Dashboard to discard the failed page state.
          </p>

          {import.meta.env.DEV && (
            <dl className="mt-4 grid gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              <div>
                <dt className="font-bold">Page</dt>
                <dd>{this.props.pageId || "unknown"}</dd>
              </div>
              <div>
                <dt className="font-bold">Error</dt>
                <dd>{this.state.error?.message || "Unknown render error"}</dd>
              </div>
            </dl>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
              onClick={this.handleReset}
              type="button"
            >
              Return to Dashboard
            </button>
            <button
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              onClick={this.handleTryAgain}
              type="button"
            >
              Try Again
            </button>
          </div>
        </section>
      </div>
    );
  }
}

export default PrototypeErrorBoundary;
