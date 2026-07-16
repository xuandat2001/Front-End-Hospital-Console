function AccessDenied() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Access denied
        </h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          You do not have permission to access this area.
        </p>
      </div>
    </div>
  );
}

export default AccessDenied;