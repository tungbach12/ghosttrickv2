import api from './api';

const homeBannerService = {
  getActiveBanners: () => api.get('/home-banners'),

  getAdminBanners: () => api.get('/home-banners/admin'),

  createBanner: (formData) => api.post('/home-banners', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  updateBanner: (id, formData) => api.put(`/home-banners/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  deleteBanner: (id) => api.delete(`/home-banners/${id}`),
};

export default homeBannerService;
