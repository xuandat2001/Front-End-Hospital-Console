import { useEffect, useRef, useState } from "react";

function KnowledgeOptionSelect({ value, options, onChange, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedOption =
    options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-[38px] w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-left text-sm text-white outline-none transition hover:border-indigo-400 focus:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="min-w-0 truncate">{selectedOption?.label}</span>
        <span
          aria-hidden="true"
          className={`text-[10px] text-white/45 transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          aria-label="Knowledge options"
          className="global-content-dropdown absolute left-0 right-0 top-[calc(100%+4px)] z-[80] max-h-[180px] overflow-y-auto rounded-xl border border-white/10 bg-slate-900 py-1 shadow-2xl scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                aria-selected={isSelected}
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`global-content-dropdown__item flex min-h-9 w-full items-center px-3 text-left text-sm transition ${
                  isSelected
                    ? "is-selected bg-indigo-600 text-white"
                    : "text-white/85 hover:bg-white/10"
                }`}
                role="option"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default KnowledgeOptionSelect;
