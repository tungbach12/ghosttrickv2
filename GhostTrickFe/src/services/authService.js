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
    try {
      const response = await api.post('/auth/google-login', { idToken });
      if (response.data.accessToken) {
        localStorage.setItem('gt_access_token', response.data.accessToken);
        localStorage.setItem('gt_refresh_token', response.data.refreshToken);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Cart API
  getCart: async () => {
    const response = await api.get('/cart');
    return response.data;
  },

  addToServerCart: async (productId, variantId, quantity) => {
    const response = await api.post('/cart', { productId, variantId, quantity });
    return response.data;
  },

  removeFromServerCart: async (variantId) => {
    const response = await api.delete(`/cart/${variantId}`);
    return response.data;
  },

  syncCartToServer: async (guestCart) => {
    // guestCart: [{ productId, variantId, quantity }, ...]
    const response = await api.post('/cart/sync', guestCart);
    return response.data;
  }
};
