import api from './api';

const saleService = {
  getAdminSales: () => api.get('/sale-events/admin'),
  getSaleEvents: () => api.get('/sale-events'), // Active events for homepage
  getEventBySlug: (slug) => api.get(`/sale-events/${slug}`),
  getSaleById: (id) => api.get(`/sale-events/id/${id}`),
  createSale: (data) => api.post('/sale-events', data),
  updateSale: (id, data) => api.put(`/sale-events/${id}`, data),
  deleteSale: (id) => api.delete(`/sale-events/${id}`),
   assignProducts: (id, products) => api.post(`/sale-events/${id}/products`, products),
  activateSale: (id) => api.post(`/sale-events/${id}/activate`),
};

export default saleService;
