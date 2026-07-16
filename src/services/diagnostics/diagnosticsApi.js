import { apiRequest } from '../config/config';

export const diagnosticsService = {
  list: async (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        qs.set(key, value);
      }
    });
    const query = qs.toString();
    return await apiRequest(`/diagnostics${query ? `?${query}` : ''}`);
  },

  getById: async (id) => {
    return await apiRequest(`/diagnostics/${id}`);
  },

  create: async (data) => {
    return await apiRequest('/diagnostics', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  assignReviewer: async (id, reviewer, reviewerRole) => {
    return await apiRequest(`/diagnostics/${id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ reviewer, reviewerRole }),
    });
  },

  triggerAiAnalysis: async (id) => {
    return await apiRequest(`/diagnostics/${id}/ai-analysis`, {
      method: 'POST',
    });
  },

  saveDraft: async (id, draftReport) => {
    return await apiRequest(`/diagnostics/${id}/draft`, {
      method: 'PUT',
      body: JSON.stringify({ draftReport }),
    });
  },

  finalize: async (id, finalReport) => {
    return await apiRequest(`/diagnostics/${id}/finalize`, {
      method: 'PUT',
      body: JSON.stringify({ finalReport }),
    });
  },

  getStats: async (department) => {
    const qs = department ? `?department=${department}` : '';
    return await apiRequest(`/diagnostics/stats/summary${qs}`);
  },

  getAttachments: async (id) => {
    return await apiRequest(`/diagnostics/${id}/attachments`);
  },

  addAttachment: async (id, data) => {
    return await apiRequest(`/diagnostics/${id}/attachments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getAuditLogs: async (id) => {
    return await apiRequest(`/diagnostics/${id}/audit-logs`);
  },

  deleteAttachment: async (diagnosticId, attachmentId) => {
    return await apiRequest(`/diagnostics/${diagnosticId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
  },

  uploadAttachment: async (diagnosticId, file) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('diagnosticId', diagnosticId);
    return await apiRequest('/diagnostics/upload-xray', {
      method: 'POST',
      body: formData,
    });
  },
};
