import api from './api';

const settingsService = {
  getSettings: async () => {
    const response = await api.get('/settings');
    return response.data;
  },

  updateSetting: async (key, value) => {
    const response = await api.put(`/settings/${key}`, { value });
    return response.data;
  },

  getPublicSettings: async () => {
    const response = await api.get('/settings/public');
    return response.data;
  },

  backupNow: async () => {
    const response = await api.post('/system/backup-now');
    return response.data;
  }
};

export default settingsService;
