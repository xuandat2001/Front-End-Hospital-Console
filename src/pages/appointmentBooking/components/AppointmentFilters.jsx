export default function AppointmentFilters({
  filters,
  onFilterChange,
  onClearFilters,
  departmentFilterOptions,
  doctorFilterOptions,
}) {
  return (
    <div className="appointment-card mb-4 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="xl:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Search
          </label>
          <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <input
              value={filters.keyword}
              onChange={(event) =>
                onFilterChange("keyword", event.target.value)
              }
              placeholder="Search by Patient ELLY ID, name, doctor..."
              className="w-full bg-transparent px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
            <button
              type="button"
              className="border-l border-slate-200 px-4 text-slate-500 dark:border-slate-700"
            >
              🔍
            </button>
          </div>
        </div>
        <Select
          label="Department"
          value={filters.departmentId}
          onChange={(value) => onFilterChange("departmentId", value)}
          options={departmentFilterOptions}
        />
        <Select
          label="Doctor"
          value={filters.doctorId}
          onChange={(value) => onFilterChange("doctorId", value)}
          options={doctorFilterOptions}
        />
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(event) => onFilterChange("status", event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All</option>
            <option value="BOOKED">BOOKED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELED">CANCELED</option>
            <option value="NO_SHOW">NO_SHOW</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Date
          </label>
          <input
            type="date"
            value={filters.date}
            onChange={(event) => onFilterChange("date", event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}

