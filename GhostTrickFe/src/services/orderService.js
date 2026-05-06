import api from './api';

export const orderService = {
  createOrder: async (orderData) => {
    // orderData: { items: [{ variantId, quantity }], shippingAddress, note, voucherCode, paymentMethod }
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  getUserOrders: async () => {
    const response = await api.get('/orders');
    return response.data;
  },

  getOrderDetails: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  cancelOrder: async (id) => {
    const response = await api.post(`/orders/${id}/cancel`);
    return response.data;
  }
};
