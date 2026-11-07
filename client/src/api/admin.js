import { api } from './client.js';

export const adminApi = {
  listUsers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/v1/admin/users${qs ? `?${qs}` : ''}`);
  },

  setUserStatus: (id, isDisabled) => api.patch(`/api/v1/admin/users/${id}/status`, { isDisabled }),

  listFiles: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/v1/admin/files${qs ? `?${qs}` : ''}`);
  },

  deleteFile: (id) => api.delete(`/api/v1/admin/files/${id}`),

  revokeLink: (id) => api.delete(`/api/v1/admin/links/${id}`),

  listLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/v1/admin/logs${qs ? `?${qs}` : ''}`);
  },
};
