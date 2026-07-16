import { useEffect } from "react";

const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "select",
  "[role='button']",
  "[data-interactive='true']",
].join(",");

function InteractionLayer() {
  useEffect(() => {
    const createRipple = (event) => {
      if (event.button !== 0) return;

      const target = event.target.closest(INTERACTIVE_SELECTOR);
      if (!target || target.matches(":disabled, [aria-disabled='true']")) return;
      if (target.closest("[data-no-ripple='true'], .no-interaction-ripple")) return;

      const surface = target.matches("select")
        ? target.closest(".dashboard-select-control, .select-shell") || target
        : target;
      if (surface.matches(".notification-emergency")) return;

      const rect = surface.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.8;
      const ripple = document.createElement("span");

      ripple.className = "interaction-ripple";
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

      surface.querySelectorAll(":scope > .interaction-ripple").forEach((item) => {
        item.remove();
      });
      surface.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove(), {
        once: true,
      });
    };

    document.addEventListener("pointerdown", createRipple);
    return () => document.removeEventListener("pointerdown", createRipple);
  }, []);

  return null;
}

export default InteractionLayer;
