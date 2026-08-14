import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function FollowUpModalShell({ title, subtitle, onClose, children, size = "max-w-2xl", layer = "z-[14000]" }) {
  return createPortal(
    <div className={`console-tinted-popup-layer fixed inset-0 ${layer} flex items-center justify-center bg-black/70 p-4`} role="dialog" aria-modal="true" aria-label={title}>
      <section className={`console-tinted-popup max-h-[90vh] w-full ${size} overflow-y-auto rounded-2xl border border-white/10 bg-[#120920] p-5 shadow-2xl sm:p-6`}>
        <header className="mb-5 flex items-start justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">Doctor workspace</p><h2 className="mt-1 text-xl font-bold text-white">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}</div>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 p-2 text-slate-300 hover:bg-white/10" aria-label="Close"><X size={18} /></button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}
