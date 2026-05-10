import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5043/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request Interceptor: Attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('gt_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh logic for login/refresh endpoints
    const isAuthRequest = originalRequest.url?.includes('/auth/login') || 
                         originalRequest.url?.includes('/auth/google-login') ||
                         originalRequest.url?.includes('/auth/refresh');

    // If error is 401 and we haven't tried refreshing yet
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('gt_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        // Call refresh endpoint
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken: refreshToken
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Save new tokens
        localStorage.setItem('gt_access_token', accessToken);
        localStorage.setItem('gt_refresh_token', newRefreshToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed -> Logout user
        localStorage.removeItem('gt_access_token');
        localStorage.removeItem('gt_refresh_token');
        localStorage.removeItem('ghosttrick_user');
        window.location.href = '/sign-in';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
