import api from './api';

const homeBannerService = {
  getActiveBanners: () => api.get('/homebanners'),

  getAdminBanners: () => api.get('/homebanners/admin'),

  createBanner: (formData) => api.post('/homebanners', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  updateBanner: (id, formData) => api.put(`/homebanners/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  deleteBanner: (id) => api.delete(`/homebanners/${id}`),
};

export default homeBannerService;
