import { api } from './client.js';

export const logsApi = {
  /** Admin: all access logs. */
  all: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/v1/admin/logs${qs ? `?${qs}` : ''}`);
  },
};
