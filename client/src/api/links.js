import { api } from './client.js';

export const linksApi = {
  create: (fileId, options = {}) => api.post('/api/v1/links', { fileId, ...options }),

  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/v1/links${qs ? `?${qs}` : ''}`);
  },

  revoke: (id) => api.delete(`/api/v1/links/${id}`),

  logs: (id, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/v1/links/${id}/logs${qs ? `?${qs}` : ''}`);
  },

  /** Public endpoints (no auth required). */
  publicMeta: (token) => api.get(`/api/v1/links/public/${token}`),

  publicUnlock: (token, password) => api.post(`/api/v1/links/public/${token}/unlock`, { password }),

  /** Returns a URL to trigger streaming download (browser navigation). */
  downloadUrl: (token) =>
    `${import.meta.env.VITE_API_URL ?? ''}/api/v1/links/public/${token}/download`,
};
