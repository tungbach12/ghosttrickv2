import api from './api';

const reviewService = {
  getProductReviews: async (productId) => {
    const res = await api.get(`/reviews/product/${productId}`);
    return res.data;
  },

  getAllReviews: async (page = 1, pageSize = 10, search = '', showDeleted = null, rating = null, isFake = null, isVerified = null, orderBy = 'newest') => {
    let url = `/reviews?page=${page}&pageSize=${pageSize}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (showDeleted !== null) url += `&showDeleted=${showDeleted}`;
    if (rating !== null) url += `&rating=${rating}`;
    if (isFake !== null) url += `&isFake=${isFake}`;
    if (isVerified !== null) url += `&isVerified=${isVerified}`;
    if (orderBy) url += `&orderBy=${orderBy}`;
    const res = await api.get(url);
    return res.data;
  },

  createReview: async (reviewData) => {
    const res = await api.post('/reviews', reviewData);
    return res.data;
  },

  updateReview: async (id, reviewData) => {
    const res = await api.put(`/reviews/${id}`, reviewData);
    return res.data;
  },

  deleteReview: async (id) => {
    await api.delete(`/reviews/${id}`);
  },
  getReviewById: async (id) => {
    const res = await api.get(`/reviews/${id}`);
    return res.data;
  }
};

export default reviewService;
