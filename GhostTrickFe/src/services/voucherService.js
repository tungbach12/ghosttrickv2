import api from './api';

export const voucherService = {
  validateVoucher: async (code, orderAmount) => {
    const response = await api.post('/vouchers/validate', { code, orderAmount });
    return response.data;
  },

  getPublicVouchers: async () => {
    const response = await api.get('/vouchers/public');
    return response.data;
  },

  getMyWallet: async () => {
    const response = await api.get('/vouchers/my-wallet');
    return response.data;
  },

  saveToWallet: async (code) => {
    const response = await api.post(`/vouchers/save/${code}`);
    return response.data;
  }
};
