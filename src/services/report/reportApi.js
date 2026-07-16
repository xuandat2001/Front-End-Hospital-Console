import { apiRequest } from '../config/config';

export const reportService = {
  getAllReports: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.reportCategory) query.set('reportCategory', params.reportCategory);
    if (params.reportSubcategory) query.set('reportSubcategory', params.reportSubcategory);
    if (params.status) query.set('status', params.status);
    if (params.priority) query.set('priority', params.priority);
    if (params.hospitalId) query.set('hospitalId', params.hospitalId);
    if (params.departmentId) query.set('departmentId', params.departmentId);
    const qs = query.toString();
    return await apiRequest(`/reports${qs ? `?${qs}` : ''}`);
  },

  getReportById: async (reportId) => {
    return await apiRequest(`/reports/${reportId}`);
  },

  createReport: async (reportData) => {
    return await apiRequest('/reports', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  },

  updateReport: async (reportId, reportData) => {
    return await apiRequest(`/reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify(reportData),
    });
  },

  deleteReport: async (reportId) => {
    return await apiRequest(`/reports/${reportId}`, {
      method: 'DELETE',
    });
  },

  addComment: async (reportId, commentData) => {
    return await apiRequest(`/reports/${reportId}/comments`, {
      method: 'POST',
      body: JSON.stringify(commentData),
    });
  },

  resolveReport: async (reportId) => {
    return await apiRequest(`/reports/${reportId}/resolve`, {
      method: 'PUT',
    });
  },

  closeReport: async (reportId) => {
    return await apiRequest(`/reports/${reportId}/close`, {
      method: 'PUT',
    });
  },
};
