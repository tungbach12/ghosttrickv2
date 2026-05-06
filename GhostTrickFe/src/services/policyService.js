import api from './api';

export const policyService = {
  getPolicies: async () => {
    const response = await api.get('/policies');
    return response.data;
  },

  getPolicyBySlug: async (slug) => {
    const response = await api.get(`/policies/${slug}`);
    return response.data;
  }
};
