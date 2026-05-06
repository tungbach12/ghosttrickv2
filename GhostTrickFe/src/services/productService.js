import api from './api';

export const productService = {
  getProducts: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  getProductById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  getBestSellers: async (top = 8) => {
    const response = await api.get('/products/best-sellers', { params: { top } });
    return response.data;
  },

  getNewArrivals: async (top = 8) => {
    const response = await api.get('/products/new-arrivals', { params: { top } });
    return response.data;
  }
};
