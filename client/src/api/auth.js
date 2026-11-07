import { api } from './client.js';

export const authApi = {
  register: (data) => api.post('/api/v1/auth/register', data),

  login: (data) => api.post('/api/v1/auth/login', data),

  refresh: () => api.post('/api/v1/auth/refresh', {}),

  logout: () => api.post('/api/v1/auth/logout', {}),

  me: () => api.get('/api/v1/users/me'),
};
