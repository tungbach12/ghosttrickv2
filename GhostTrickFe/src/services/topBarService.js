import api from './api';

const topBarService = {
  getPromos: async () => {
    const response = await api.get('/topbar-promos');
    return response.data;
  },

  getPromosAdmin: async () => {
    const response = await api.get('/topbar-promos/admin');
    return response.data;
  },

  createPromo: async (data) => {
    const response = await api.post('/topbar-promos', data);
    return response.data;
  },

  updatePromo: async (id, data) => {
    const response = await api.put(`/topbar-promos/${id}`, data);
    return response.data;
  },

  deletePromo: async (id) => {
    await api.delete(`/topbar-promos/${id}`);
  }
};

export default topBarService;
