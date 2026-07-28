import { useEffect } from "react";
import useDocumentStore from "../../store/useDocumentStore";

export default function DocumentModeOverlay({ children }) {
  const { isDocumentMode, exitDocumentMode } = useDocumentStore();

  useEffect(() => {
    if (!isDocumentMode) {
      document
        .querySelectorAll("[data-widget-hovered]")
        .forEach((el) => el.removeAttribute("data-widget-hovered"));
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") exitDocumentMode();
    };
    document.addEventListener("keydown", handleKeyDown);

    document.body.style.cursor = "crosshair";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.cursor = "";
      document
        .querySelectorAll("[data-widget-hovered]")
        .forEach((el) => el.removeAttribute("data-widget-hovered"));
    };
  }, [isDocumentMode, exitDocumentMode]);

  const handleMouseMove = (e) => {
    if (!isDocumentMode) return;

    document
      .querySelectorAll("[data-widget-hovered]")
      .forEach((el) => el.removeAttribute("data-widget-hovered"));

    const widget = e.target.closest("[data-widget-id]");
    if (widget) {
      widget.setAttribute("data-widget-hovered", "true");
    } else {
      const card = e.target.closest(
        ".dashboard-card, .dashboard-content-stage > div, section",
      );
      if (card && card !== e.currentTarget) {
        card.setAttribute("data-widget-hovered", "true");
      }
    }
  };

  const handleClick = (e) => {
    if (!isDocumentMode) return;

    const widget = e.target.closest("[data-widget-id]");
    const store = useDocumentStore.getState();
    store.selectWidget(widget ? widget.dataset.widgetId : null);
  };

  return (
    <div className="h-full min-h-0" onMouseMove={handleMouseMove} onClick={handleClick}>
      {children}
    </div>
  );
}
