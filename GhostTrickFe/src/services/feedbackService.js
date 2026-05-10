import api from './api';

const feedbackService = {
  getFeedbacks: async () => {
    const response = await api.get('/Feedbacks');
    return response.data;
  },

  getFeedbacksAdmin: async () => {
    const response = await api.get('/Feedbacks/admin');
    return response.data;
  },

  createFeedback: async (feedbackData) => {
    const response = await api.post('/Feedbacks', feedbackData);
    return response.data;
  },

  updateFeedback: async (id, feedbackData) => {
    const response = await api.put(`/Feedbacks/${id}`, feedbackData);
    return response.data;
  },

  deleteFeedback: async (id) => {
    const response = await api.delete(`/Feedbacks/${id}`);
    return response.data;
  },

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/Feedbacks/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

export default feedbackService;
