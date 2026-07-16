import { Activity, Brain, ChevronDown, Grid2X2, HeartPulse, Ribbon } from "lucide-react";
import {
  categorySortOptions,
  formatCategoryValue,
} from "./billingMockData";

const categoryIcons = {
  activity: Activity,
  brain: Brain,
  grid: Grid2X2,
  heart: HeartPulse,
  ribbon: Ribbon,
};

function metricFor(category, sortMode) {
  if (sortMode === "invoiceCount") return category.invoiceCount;
  if (sortMode === "outstanding") return category.outstanding;
  return category.revenue;
}

function TopBillingCategories({ categories, onSortModeChange, sortMode }) {
  const sortedCategories = [...categories].sort(
    (left, right) => metricFor(right, sortMode) - metricFor(left, sortMode),
  );
  const topMetric = Math.max(...sortedCategories.map((category) => metricFor(category, sortMode)));
  const sortModeLabel =
    categorySortOptions.find((option) => option.id === sortMode)?.label || "By Revenue";

  return (
    <section className="billing-panel billing-categories-panel">
      <div className="billing-panel-heading">
        <span className="billing-panel-label">
          Top Billing Categories
          <i aria-hidden="true">i</i>
        </span>
        <span className="billing-select-wrap billing-select-control">
          <span>{sortModeLabel}</span>
          <select
            aria-label="Sort billing categories"
            onChange={(event) => onSortModeChange(event.target.value)}
            value={sortMode}
          >
            {categorySortOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown size={15} strokeWidth={2} />
        </span>
      </div>

      <div className="billing-category-list">
        {sortedCategories.map((category) => {
          const CategoryIcon = categoryIcons[category.icon] || Grid2X2;
          const metric = metricFor(category, sortMode);
          const percent = topMetric > 0 ? Math.max(6, (metric / topMetric) * 100) : 0;

          return (
            <div className="billing-category-row" key={category.label} data-tone={category.tone}>
              <span className="billing-category-icon">
                <CategoryIcon size={17} strokeWidth={1.85} />
              </span>
              <div>
                <p>
                  {category.label}
                  <strong>{formatCategoryValue(category, sortMode)}</strong>
                </p>
                <span className="billing-category-track">
                  <i style={{ width: `${percent}%` }} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default TopBillingCategories;
