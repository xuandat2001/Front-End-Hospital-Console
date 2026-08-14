import { useEffect } from "react";
import { createPortal } from "react-dom";
import { FileText, X } from "lucide-react";
import PatientRecordView from "../../../core-modules/patients/record/PatientRecordView";

export default function PatientRecordModal({ patient, workspace, onClose }) {
  useEffect(() => {
    if (!patient) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, patient]);

  if (!patient?.ellyId) return null;

  return createPortal(
    <div
      className="console-tinted-popup-layer fixed inset-0 z-[14000] flex items-center justify-center bg-black/75 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-patient-record-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="console-tinted-popup flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0717] shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300">
              <FileText size={14} /> Patient record
            </p>
            <h2 id="appointment-patient-record-title" className="mt-1 truncate text-lg font-bold text-white">
              {patient.name || "Patient"}
            </h2>
            <p className="truncate text-xs text-slate-400">{patient.ellyId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Close patient record"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">
          <PatientRecordView
            ellyId={patient.ellyId}
            workspace={workspace}
            initialTab="overview"
            allowUnregistered
          />
        </div>
      </section>
    </div>,
    document.body,
  );
}
