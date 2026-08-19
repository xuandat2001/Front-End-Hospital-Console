import { X } from "lucide-react";
import { useEffect } from "react";

export default function BillingModalShell({ children, onClose, title }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      aria-modal="true"
      className="billing-modal-layer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <section className="billing-modal" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button aria-label={`Close ${title}`} onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
