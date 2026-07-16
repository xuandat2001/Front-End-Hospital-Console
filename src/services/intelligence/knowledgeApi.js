import { apiRequest } from "../config/config";

export const knowledgeService = {
  ask(question) {
    return apiRequest("/ai/knowledge/ask", {
      method: "POST",
      body: JSON.stringify({
        question,
      }),
    });
  },

  getDocuments() {
    return apiRequest("/ai/knowledge/documents");
  },

  uploadPdfDocument(file, fields = {}) {
    const formData = new FormData();

    formData.append("file", file);
    formData.append(
      "title",
      fields.title || file.name?.replace(/\.pdf$/i, "") || "Knowledge document",
    );
    formData.append("category", fields.category || "hospital_policy");
    formData.append("visibility", fields.visibility || "internal");
    formData.append(
      "containsPatientData",
      String(Boolean(fields.containsPatientData)),
    );
    formData.append(
      "allowLLMRetrieval",
      String(Boolean(fields.allowLLMRetrieval)),
    );

    if (fields.uploadedBy) {
      formData.append("uploadedBy", fields.uploadedBy);
    }

    return apiRequest("/ai/knowledge/documents/pdf", {
      method: "POST",
      body: formData,
    });
  },
  getDocumentById(id, includeContent = false) {
    const query = includeContent ? "?includeContent=true" : "";

    return apiRequest(`/ai/knowledge/documents/${id}${query}`);
  },
};
