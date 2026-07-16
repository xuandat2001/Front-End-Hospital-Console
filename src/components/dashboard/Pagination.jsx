import Icon from "./Icon";

function Pagination({
  currentPage,
  label = "results",
  onPageChange,
  pageSize,
  totalItems,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const start = totalItems ? (safePage - 1) * pageSize + 1 : 0;
  const end = Math.min(safePage * pageSize, totalItems);

  if (totalItems <= pageSize) return null;

  return (
    <nav className="compact-pagination" aria-label={`${label} pagination`}>
      <p>
        {start}-{end} of {totalItems} {label}
      </p>
      <div>
        <button
          aria-label={`Previous ${label} page`}
          disabled={safePage === 1}
          onClick={() => onPageChange(safePage - 1)}
          type="button"
        >
          <Icon name="chevronDown" size={15} />
        </button>
        <span>
          {safePage} / {totalPages}
        </span>
        <button
          aria-label={`Next ${label} page`}
          disabled={safePage === totalPages}
          onClick={() => onPageChange(safePage + 1)}
          type="button"
        >
          <Icon name="chevronDown" size={15} />
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
