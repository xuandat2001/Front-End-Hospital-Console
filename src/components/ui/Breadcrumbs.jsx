import { useEffect, useId, useRef, useState } from "react";
import Icon from "../dashboard/Icon";

function Breadcrumbs({
  className = "",
  items = [],
  maxVisibleItems = 4,
  onNavigate,
}) {
  const [openMenu, setOpenMenu] = useState(null);
  const navRef = useRef(null);
  const menuButtonRefs = useRef({});
  const baseMenuId = `breadcrumbs-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const lastIndex = items.length - 1;
  const visibleLimit = Math.max(2, maxVisibleItems);
  const shouldCollapseDesktop = items.length > visibleLimit;
  const desktopTailStart = shouldCollapseDesktop
    ? Math.max(1, items.length - (visibleLimit - 1))
    : 1;
  const desktopHiddenItems = items.slice(1, desktopTailStart);
  const desktopTailItems = items.slice(desktopTailStart);
  const mobileHiddenItems = items.slice(1, -1);

  useEffect(() => {
    if (!openMenu) return undefined;

    const closeOnOutsidePress = (event) => {
      if (!navRef.current?.contains(event.target)) {
        setOpenMenu(null);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      const activeMenu = openMenu;
      setOpenMenu(null);
      menuButtonRefs.current[activeMenu]?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openMenu]);

  if (!items.length) return null;

  const activateItem = (event, item) => {
    if (onNavigate) {
      event.preventDefault();
      onNavigate(item);
    }
    setOpenMenu(null);
  };

  const renderSeparator = () => (
    <Icon
      className="breadcrumbs__separator"
      name="chevronRight"
      size={15}
    />
  );

  const renderItem = (item, index, extraClassName = "") => {
    const isCurrent = index === lastIndex;

    return (
      <li
        className={`breadcrumbs__item ${extraClassName}`.trim()}
        key={`${item.label}-${index}`}
      >
        {index > 0 && renderSeparator()}
        {isCurrent || !item.href ? (
          <span
            aria-current={isCurrent ? "page" : undefined}
            className={isCurrent ? "breadcrumbs__current" : ""}
            title={item.label}
          >
            {item.label}
          </span>
        ) : (
          <a
            href={item.href}
            onClick={(event) => activateItem(event, item)}
            title={item.label}
          >
            {item.label}
          </a>
        )}
      </li>
    );
  };

  const renderEllipsis = (kind, hiddenItems, className) => {
    const isOpen = openMenu === kind;
    const menuId = `${baseMenuId}-${kind}`;

    return (
      <li
        className={`breadcrumbs__item breadcrumbs__ellipsis ${className}`}
        key={`${kind}-ellipsis`}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setOpenMenu(null);
          }
        }}
        onMouseEnter={() => setOpenMenu(kind)}
        onMouseLeave={() => setOpenMenu(null)}
      >
        {renderSeparator()}
        <button
          aria-controls={menuId}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="Show hidden breadcrumb items"
          onClick={() => setOpenMenu(kind)}
          ref={(element) => {
            menuButtonRefs.current[kind] = element;
          }}
          type="button"
        >
          <span aria-hidden="true">…</span>
        </button>
        <div
          aria-label="Hidden breadcrumb items"
          className="breadcrumbs__menu global-content-dropdown"
          hidden={!isOpen}
          id={menuId}
          role="menu"
        >
          {hiddenItems.map((item, index) =>
            item.href ? (
              <a
                href={item.href}
                key={`${item.label}-${index}`}
                onClick={(event) => activateItem(event, item)}
                role="menuitem"
              >
                {item.label}
              </a>
            ) : (
              <span
                aria-disabled="true"
                className="breadcrumbs__menu-label"
                key={`${item.label}-${index}`}
                role="menuitem"
              >
                {item.label}
              </span>
            ),
          )}
        </div>
      </li>
    );
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className={`breadcrumbs ${className}`.trim()}
      ref={navRef}
    >
      <ol className="breadcrumbs__list">
        {renderItem(items[0], 0)}

        {shouldCollapseDesktop &&
          renderEllipsis(
            "desktop",
            desktopHiddenItems,
            "breadcrumbs__desktop-ellipsis",
          )}

        {items.length > 2 &&
          renderEllipsis(
            "mobile",
            mobileHiddenItems,
            "breadcrumbs__mobile-ellipsis",
          )}

        {desktopTailItems.map((item, offset) => {
          const originalIndex = desktopTailStart + offset;
          const mobileClassName =
            originalIndex < lastIndex
              ? "breadcrumbs__item--mobile-collapsible"
              : "";
          return renderItem(item, originalIndex, mobileClassName);
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
