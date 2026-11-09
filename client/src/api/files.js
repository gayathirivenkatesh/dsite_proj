import { api } from './client.js';

export const filesApi = {
  upload: (formData) => api.upload('/api/v1/files', formData),

  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/v1/files${qs ? `?${qs}` : ''}`);
  },

  get: (id) => api.get(`/api/v1/files/${id}`),

  rename: (id, name) => api.patch(`/api/v1/files/${id}`, { name, originalName: name }),

  delete: (id) => api.delete(`/api/v1/files/${id}`),

  logs: (id, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/v1/files/${id}/logs${qs ? `?${qs}` : ''}`);
  },
};
