import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";

const VIEWPORT_GUTTER = 12;

function ProfileDropdown({
  className = "",
  data,
  items = [],
  menuLabel = "Account actions",
  menuMinWidth = 0,
  menuOffsetTop = 6,
  onOpen,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({
    left: 0,
    top: 0,
    width: 0,
  });
  const containerRef = useRef(null);
  const chevronRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = `profile-menu-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const positionMenu = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const availableWidth = Math.max(
      0,
      window.innerWidth - VIEWPORT_GUTTER * 2,
    );
    const width = Math.min(Math.max(rect.width, menuMinWidth), availableWidth);

    setMenuPosition({
      left: Math.max(
        VIEWPORT_GUTTER,
        Math.min(rect.left, window.innerWidth - width - VIEWPORT_GUTTER),
      ),
      top: rect.bottom + menuOffsetTop,
      width,
    });
  }, [menuMinWidth, menuOffsetTop]);

  const closeMenu = useCallback(({ restoreFocus = false } = {}) => {
    setIsOpen(false);
    if (restoreFocus) {
      chevronRef.current?.focus();
    }
  }, []);

  const toggleMenu = () => {
    if (!isOpen) positionMenu();
    setIsOpen((open) => !open);
  };

  const handleProfileClick = () => {
    if (isOpen) closeMenu();
    onOpen?.();
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnOutsidePress = (event) => {
      if (
        !containerRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        closeMenu();
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        closeMenu({ restoreFocus: true });
      }
    };
    const reposition = () => positionMenu();

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [closeMenu, isOpen, positionMenu]);

  const selectItem = async (item) => {
    if (item.disabled) return;

    try {
      await item.onSelect?.();
    } finally {
      if (!item.keepOpen) closeMenu();
    }
  };

  return (
    <>
      <div
        className={`profile-dropdown dashboard-logo-card__trigger ${className}`.trim()}
        ref={containerRef}
      >
        <button
          aria-label="Open profile"
          className="profile-dropdown__profile"
          onClick={handleProfileClick}
          type="button"
        >
          <img
            alt=""
            aria-hidden="true"
            className="profile-dropdown__avatar"
            src={data.avatar}
          />
          <span className="dashboard-logo-card__identity profile-dropdown__identity">
            <strong>{data.name}</strong>
            <span>{data.secondary}</span>
          </span>
        </button>
        <button
          aria-controls={menuId}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="Open account menu"
          className="profile-dropdown__chevron-trigger"
          onClick={toggleMenu}
          ref={chevronRef}
          type="button"
        >
          <Icon
            className={`profile-dropdown__chevron${isOpen ? " is-open" : ""}`}
            name="chevronDown"
            size={15}
          />
        </button>
      </div>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            aria-label={menuLabel}
            className="profile-dropdown__menu is-open"
            id={menuId}
            ref={menuRef}
            role="menu"
            style={{
              left: `${menuPosition.left}px`,
              top: `${menuPosition.top}px`,
              width: `${menuPosition.width}px`,
            }}
          >
            <div className="profile-dropdown__items">
              {items.map((item) => (
                <button
                  className="profile-dropdown__item"
                  data-tone={item.tone || "default"}
                  disabled={item.disabled}
                  key={item.id || item.label}
                  onClick={() => selectItem(item)}
                  role="menuitem"
                  type="button"
                >
                  {typeof item.icon === "string" ? (
                    <Icon name={item.icon} size={16} />
                  ) : (
                    item.icon
                  )}
                  <span>{item.disabled && item.pendingLabel ? item.pendingLabel : item.label}</span>
                  {item.value && <em>{item.value}</em>}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export default ProfileDropdown;
