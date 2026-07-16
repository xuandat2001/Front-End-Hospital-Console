import { useEffect, useRef, useState } from "react";
import useSessionStore from "../../store/useSessionStore";
import Icon from "./Icon";
import { workspaceModules } from "./workspaceModules";

function ModuleBar({ activeModule, onModuleChange, onNavigationOpen }) {
  const workspace = useSessionStore((state) => state.workspace);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const pickerRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const selectedIndex = Math.max(
    0,
    workspaceModules.findIndex((item) => item.value === activeModule),
  );
  const activeLabel = workspaceModules[selectedIndex]?.label;
  const hospitalName = workspace?.hospitalName || "Hospital Workspace";

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnOutsidePress = (event) => {
      if (!pickerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    window.requestAnimationFrame(() => {
      optionRefs.current[selectedIndex]?.focus();
    });
  }, [isOpen, selectedIndex]);

  const openMenu = () => {
    setFocusedIndex(selectedIndex);
    setIsOpen(true);
  };

  const toggleMenu = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      openMenu();
    }
  };

  const selectModule = (value) => {
    onModuleChange?.(value);
    setIsOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleTriggerKeyDown = (event) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openMenu();
    }
  };

  const handleMenuKeyDown = (event) => {
    let nextIndex;

    if (event.key === "ArrowDown") {
      nextIndex = (focusedIndex + 1) % workspaceModules.length;
    } else if (event.key === "ArrowUp") {
      nextIndex =
        (focusedIndex - 1 + workspaceModules.length) % workspaceModules.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = workspaceModules.length - 1;
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    } else if (event.key === "Tab") {
      setIsOpen(false);
      return;
    } else {
      return;
    }

    event.preventDefault();
    setFocusedIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus();
  };

  return (
    <header className="dashboard-module-bar" aria-label="Workspace context">
      <button
        aria-label="Open navigation"
        className="icon-button dashboard-menu-button"
        onClick={onNavigationOpen}
        type="button"
      >
        <Icon name="menu" size={20} />
      </button>

      <div className="dashboard-module-controls">
        <div
          aria-label={`Facility: ${hospitalName}`}
          className="dashboard-control hospital-control"
        >
          <Icon name="hospital" size={16} />
          <span>
            <small>Facility</small>
            <strong title={hospitalName}>{hospitalName}</strong>
          </span>
        </div>

        <div className="module-picker" ref={pickerRef}>
          <button
            aria-controls="hospital-module-menu"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-label={`Workspace: ${activeLabel}`}
            className="dashboard-control dashboard-select-control"
            onClick={toggleMenu}
            onKeyDown={handleTriggerKeyDown}
            ref={triggerRef}
            type="button"
          >
            <Icon name="operations" size={16} />
            <span className="select-copy">
              <small>Workspace</small>
              <span>{activeLabel}</span>
            </span>
            <Icon
              className={isOpen ? "is-open" : ""}
              name="chevronDown"
              size={15}
            />
          </button>

          {isOpen && (
            <div
              aria-label="Hospital workspaces"
              className="module-picker-menu"
              id="hospital-module-menu"
              onKeyDown={handleMenuKeyDown}
              role="listbox"
            >
              <div className="module-picker-heading">
                <span>Choose workspace</span>
                <small>{workspaceModules.length} available</small>
              </div>
              <div className="module-picker-options">
                {workspaceModules.map((module, index) => {
                  const isSelected = module.value === activeModule;

                  return (
                    <button
                      aria-selected={isSelected}
                      className={isSelected ? "is-selected" : ""}
                      key={module.value}
                      onClick={() => selectModule(module.value)}
                      onFocus={() => setFocusedIndex(index)}
                      ref={(element) => {
                        optionRefs.current[index] = element;
                      }}
                      role="option"
                      tabIndex={index === focusedIndex ? 0 : -1}
                      type="button"
                    >
                      <strong>{module.label}</strong>
                      {isSelected && <i>Active</i>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default ModuleBar;
