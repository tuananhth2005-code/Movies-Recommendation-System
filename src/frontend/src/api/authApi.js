import axiosClient from './axiosClient';

const authApi = {
  login: (data) => axiosClient.post('/auth/login', data),
  register: (data) => axiosClient.post('/auth/register', data),
  logout: () => axiosClient.post('/auth/logout'),
  getMe: () => axiosClient.get('/auth/me'),
  updatePreferences: (data) => axiosClient.put('/auth/me/preferences', data),
  refreshToken: () => axiosClient.post('/auth/refresh'),
};

export default authApi;
