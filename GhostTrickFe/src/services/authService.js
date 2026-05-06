import api from './api';

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.accessToken) {
      localStorage.setItem('gt_access_token', response.data.accessToken);
      localStorage.setItem('gt_refresh_token', response.data.refreshToken);
    }
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('gt_access_token');
    localStorage.removeItem('gt_refresh_token');
    localStorage.removeItem('ghosttrick_user');
  },

  sendOtp: async (email) => {
    const response = await api.post('/auth/send-otp', { email });
    return response.data;
  },

  verifyOtp: async (email, code) => {
    const response = await api.post('/auth/verify-otp', { email, code });
    return response.data;
  },

  googleLogin: async (idToken) => {
    const response = await api.post('/auth/google-login', { idToken });
    if (response.data.accessToken) {
      localStorage.setItem('gt_access_token', response.data.accessToken);
      localStorage.setItem('gt_refresh_token', response.data.refreshToken);
    }
    return response.data;
  }
};
