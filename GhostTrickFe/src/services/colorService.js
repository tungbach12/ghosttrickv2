import api from './api';

const colorService = {
  getColors: async () => {
    const response = await api.get('/colors');
    return response.data;
  },

  createColor: async (colorData) => {
    const response = await api.post('/colors', colorData);
    return response.data;
  },

  updateColor: async (id, colorData) => {
    const response = await api.put(`/colors/${id}`, colorData);
    return response.data;
  },

  deleteColor: async (id) => {
    const response = await api.delete(`/colors/${id}`);
    return response.data;
  }
};

export default colorService;
