import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "../../components/dashboard/Icon";
import { knowledgeService } from "../../services/intelligence/knowledgeApi";

function formatDate(value) {
  if (!value) return "No date";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getChunkCount(document) {
  return Number(document?.metadata?.chunkCount || 0);
}

function getEmbeddedChunkCount(document) {
  return Number(document?.metadata?.embeddedChunkCount || 0);
}

function KnowledgeStatCard({ label, value, detail }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/45">
        {label}
      </p>
      <strong className="mt-2 block text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </strong>
      {detail && (
        <span className="mt-1 block text-xs text-slate-500 dark:text-white/45">
          {detail}
        </span>
      )}
    </section>
  );
}

function KnowledgeBaseResources({ embedded = false, initialSearch = "", refreshKey = 0 } = {}) {
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await knowledgeService.getDocuments();
      setDocuments(response.data || []);
    } catch (requestError) {
      setError(requestError.message || "Failed to load knowledge documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadDocuments, 0);
    return () => window.clearTimeout(timer);
  }, [loadDocuments, refreshKey]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(documents.map((document) => document.category).filter(Boolean)),
    );
  }, [documents]);

  const visibilities = useMemo(() => {
    return Array.from(
      new Set(documents.map((document) => document.visibility).filter(Boolean)),
    );
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return documents.filter((document) => {
      const matchesSearch =
        !keyword ||
        document.title?.toLowerCase().includes(keyword) ||
        document.category?.toLowerCase().includes(keyword) ||
        document.sourceFileName?.toLowerCase().includes(keyword);

      const matchesCategory =
        categoryFilter === "all" || document.category === categoryFilter;

      const matchesVisibility =
        visibilityFilter === "all" || document.visibility === visibilityFilter;

      return matchesSearch && matchesCategory && matchesVisibility;
    });
  }, [documents, searchText, categoryFilter, visibilityFilter]);

  const stats = useMemo(() => {
    const totalChunks = documents.reduce(
      (sum, document) => sum + getChunkCount(document),
      0,
    );

    const embeddedChunks = documents.reduce(
      (sum, document) => sum + getEmbeddedChunkCount(document),
      0,
    );

    const retrievableDocs = documents.filter(
      (document) => document.allowLLMRetrieval,
    ).length;

    const privateDocs = documents.filter(
      (document) =>
        document.containsPatientData || document.visibility === "patient_private",
    ).length;

    return {
      totalDocuments: documents.length,
      retrievableDocs,
      totalChunks,
      embeddedChunks,
      privateDocs,
    };
  }, [documents]);

  const openDocumentDetail = async (document) => {
    setSelectedDocument(document);
    setDetailLoading(true);
    setError("");

    try {
      const response = await knowledgeService.getDocumentById(document.id, false);
      setSelectedDocument(response.data);
    } catch (requestError) {
      setError(requestError.message || "Failed to load document detail.");
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading" aria-live="polite">
        <span />
        <p>Loading knowledge base...</p>
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "intelligence-page"}>
      {!embedded && (
        <header className="intelligence-page-header">
          <div>
            <h1>Knowledge Base</h1>
            <p>
              Manage trusted hospital documents used by the Knowledge Layer and
              Elly AI answers.
            </p>
          </div>

          <button className="btn btn-secondary" onClick={loadDocuments} type="button">
            Refresh
          </button>
        </header>
      )}

      {error && (
        <div className="error-message intelligence-error" role="alert">
          {error}
        </div>
      )}

      {!embedded && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KnowledgeStatCard
            label="Documents"
            value={stats.totalDocuments}
            detail="Readable by current user"
          />
          <KnowledgeStatCard
            label="LLM Retrieval"
            value={stats.retrievableDocs}
            detail="Allowed for AI answers"
          />
          <KnowledgeStatCard
            label="Chunks"
            value={stats.totalChunks}
            detail="Created from documents"
          />
          <KnowledgeStatCard
            label="Embedded"
            value={stats.embeddedChunks}
            detail="Ready for vector search"
          />
          <KnowledgeStatCard
            label="Private / PHI"
            value={stats.privateDocs}
            detail="Protected from LLM retrieval"
          />
        </div>
      )}

      <section className="dashboard-card intelligence-panel">
        <div className="intelligence-panel-heading">
          <div>
            <h2>Knowledge Documents</h2>
            <p className="intelligence-muted">
              These documents are the source material for Knowledge Layer RAG.
            </p>
          </div>

          <span>{filteredDocuments.length} shown</span>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <input
            className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search document title..."
          />

          <select
            className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {titleCase(category)}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
            value={visibilityFilter}
            onChange={(event) => setVisibilityFilter(event.target.value)}
          >
            <option value="all">All visibility</option>
            {visibilities.map((visibility) => (
              <option key={visibility} value={visibility}>
                {titleCase(visibility)}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-white/45">
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="py-3 pr-3">Document</th>
                <th className="py-3 pr-3">Category</th>
                <th className="py-3 pr-3">Visibility</th>
                <th className="py-3 pr-3">Source</th>
                <th className="py-3 pr-3">Chunks</th>
                <th className="py-3 pr-3">LLM</th>
                <th className="py-3 pr-3">Status</th>
                <th className="py-3 pr-3">Updated</th>
                <th className="py-3 pr-3">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {filteredDocuments.map((document) => (
                <tr
                  key={document.id}
                  className="text-slate-700 dark:text-white/75"
                >
                  <td className="py-3 pr-3">
                    <strong className="block text-slate-900 dark:text-white">
                      {document.title}
                    </strong>
                    <small className="text-slate-500 dark:text-white/40">
                      {document.sourceFileName || document.id}
                    </small>
                  </td>

                  <td className="py-3 pr-3">{titleCase(document.category)}</td>

                  <td className="py-3 pr-3">
                    <span className="rounded-full border border-slate-200 px-2 py-1 text-xs dark:border-white/10">
                      {titleCase(document.visibility)}
                    </span>
                  </td>

                  <td className="py-3 pr-3">{titleCase(document.sourceType)}</td>

                  <td className="py-3 pr-3">
                    {getEmbeddedChunkCount(document)} / {getChunkCount(document)}
                  </td>

                  <td className="py-3 pr-3">
                    {document.allowLLMRetrieval ? "Enabled" : "Disabled"}
                  </td>

                  <td className="py-3 pr-3">{titleCase(document.status)}</td>

                  <td className="py-3 pr-3">{formatDate(document.updatedAt)}</td>

                  <td className="py-3 pr-3">
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => openDocumentDetail(document)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {!filteredDocuments.length && (
                <tr>
                  <td colSpan="9" className="py-8 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-white/45">
                      <Icon name="records" size={22} />
                      <strong>No knowledge documents found</strong>
                      <span>
                        Upload or create documents from the backend first.
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedDocument && (
        <div className="fixed inset-y-20 left-4 right-4 z-[60] flex items-start justify-center bg-black/45 px-0 py-4 backdrop-blur-sm xl:bottom-8 xl:left-[246px] xl:right-[310px] xl:top-28">
          <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedDocument.title || "Document detail"}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Document metadata used for retrieval and permission checks.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDocument(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {detailLoading ? (
                <p className="intelligence-muted">Loading detail...</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <KnowledgeStatCard
                    label="Category"
                    value={titleCase(selectedDocument.category)}
                  />
                  <KnowledgeStatCard
                    label="Visibility"
                    value={titleCase(selectedDocument.visibility)}
                  />
                  <KnowledgeStatCard
                    label="Owner"
                    value={selectedDocument.ownerId || "Unknown"}
                    detail={titleCase(selectedDocument.ownerType)}
                  />
                  <KnowledgeStatCard
                    label="Hospital"
                    value={selectedDocument.hospitalEllyId || "Global"}
                  />
                  <KnowledgeStatCard
                    label="Chunks"
                    value={`${getEmbeddedChunkCount(selectedDocument)} / ${getChunkCount(
                      selectedDocument,
                    )}`}
                    detail="Embedded / total"
                  />
                  <KnowledgeStatCard
                    label="Embedding Model"
                    value={selectedDocument.metadata?.embeddingModel || "None"}
                  />
                  <KnowledgeStatCard
                    label="Patient Data"
                    value={selectedDocument.containsPatientData ? "Yes" : "No"}
                  />
                  <KnowledgeStatCard
                    label="LLM Retrieval"
                    value={selectedDocument.allowLLMRetrieval ? "Enabled" : "Disabled"}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KnowledgeBaseResources;