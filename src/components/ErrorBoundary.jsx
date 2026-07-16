import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Prototype section crashed:", error, info);
  }

  componentDidUpdate(prevProps) {
    if (
      this.state.hasError &&
      this.props.resetKeys?.some((key, index) => key !== prevProps.resetKeys?.[index])
    ) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return this.props.fallback ? (
      this.props.fallback({ error: this.state.error, reset: this.handleReset })
    ) : (
      <div className="h-full overflow-y-auto p-6">
        <div className="dashboard-card mx-auto max-w-2xl p-6 text-center dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
            Prototype preview
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            Something went wrong in this prototype section.
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            This section is isolated so the rest of the console remains available.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Back to Overview
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
