import { useState } from "react";
import { knowledgeService } from "../../services/intelligence/knowledgeApi";
import {
  KNOWLEDGE_DOCUMENT_CATEGORIES,
  KNOWLEDGE_DOCUMENT_VISIBILITIES,
} from "./knowledgeDocumentOptions";
import KnowledgeOptionSelect from "./KnowledgeOptionSelect";

const initialUploadForm = {
  file: null,
  title: "",
  category: "hospital_policy",
  visibility: "internal",
  allowLLMRetrieval: true,
  containsPatientData: false,
};

function KnowledgeUploadModal({ onClose, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState(initialUploadForm);

  const resetForm = () => {
    setForm(initialUploadForm);
    setStatus("");
  };

  const closeModal = () => {
    resetForm();
    onClose?.();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setStatus("Only PDF documents can be uploaded.");
      event.target.value = "";
      return;
    }

    setStatus("");
    setForm((current) => ({
      ...current,
      file,
      title: current.title || file.name.replace(/\.pdf$/i, ""),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.file) {
      setStatus("Please select a PDF document.");
      return;
    }

    if (!form.title.trim()) {
      setStatus("Document title is required.");
      return;
    }

    setUploading(true);
    setStatus("");

    try {
      await knowledgeService.uploadPdfDocument(form.file, {
        title: form.title.trim(),
        category: form.category,
        visibility: form.visibility,
        containsPatientData: form.containsPatientData,
        allowLLMRetrieval: form.containsPatientData
          ? false
          : form.allowLLMRetrieval,
        uploadedBy: "hospital-console",
      });

      resetForm();
      onUploaded?.("Document uploaded successfully.");
      onClose?.();
    } catch (error) {
      setStatus(error.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[560px] rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              Upload Knowledge Document
            </h2>
            <p className="mt-1 text-xs text-white/50">
              Add approved hospital documents for Elly AI retrieval.
            </p>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/10"
          >
            Close
          </button>
        </div>

        {status && (
          <p className="mb-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-amber-200">
            {status}
          </p>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/60">
              PDF document
            </label>

            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            />

            {form.file && (
              <p className="mt-1 text-xs text-emerald-300">
                Selected: {form.file.name}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-white/60">
              Document title
            </label>

            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Example: Bed Capacity Escalation Policy"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-indigo-400"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/60">
                Category
              </label>
              <KnowledgeOptionSelect
                value={form.category}
                options={KNOWLEDGE_DOCUMENT_CATEGORIES}
                onChange={(category) =>
                  setForm((current) => ({
                    ...current,
                    category,
                  }))
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-white/60">
                Visibility
              </label>
              <KnowledgeOptionSelect
                value={form.visibility}
                options={KNOWLEDGE_DOCUMENT_VISIBILITIES}
                onChange={(visibility) =>
                  setForm((current) => ({
                    ...current,
                    visibility,
                  }))
                }
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <label className="mb-3 flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={form.allowLLMRetrieval}
                disabled={form.containsPatientData}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    allowLLMRetrieval: event.target.checked,
                  }))
                }
              />
              Allow LLM retrieval
            </label>

            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={form.containsPatientData}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    containsPatientData: event.target.checked,
                    allowLLMRetrieval: event.target.checked
                      ? false
                      : current.allowLLMRetrieval,
                    visibility: event.target.checked
                      ? "patient_private"
                      : current.visibility,
                  }))
                }
              />
              Contains patient data
            </label>

            {form.containsPatientData && (
              <p className="mt-2 text-xs text-amber-300">
                Patient/private data will not be used for normal LLM retrieval.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/60 hover:bg-white/10"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={uploading}
              className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-900/40 hover:bg-indigo-600 disabled:cursor-wait disabled:opacity-70"
            >
              {uploading ? "Uploading..." : "Upload Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default KnowledgeUploadModal;