export default function StaffSearchBar({ searchTerm, onSearchChange, placeholder = "Search by Staff ID or Name..." }) {
  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-purple-200 dark:border-purple-500 bg-white dark:bg-slate-800 px-4 py-3 text-purple-900 dark:text-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
    />
  );
}
