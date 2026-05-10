import React, { useState, useEffect } from 'react';
import { X, Star, Save, Trash2 } from 'lucide-react';
import reviewService from '../services/reviewService';
import { useToast } from '../context/ToastContext';

export default function ReviewModal({ isOpen, onClose, productId, productName, orderId, existingReview, onSuccess }) {

  const [rating, setRating] = useState(existingReview?.rating || 5);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (existingReview && existingReview.id) {
      if (existingReview.rating && existingReview.comment) {
        setRating(existingReview.rating);
        setComment(existingReview.comment);
      } else {
        // Fetch full details
        reviewService.getReviewById(existingReview.id).then(data => {
          setRating(data.rating);
          setComment(data.comment);
        }).catch(() => {
          addToast('Không thể tải thông tin đánh giá', 'error');
        });
      }
    } else {
      setRating(5);
      setComment('');
    }
  }, [existingReview, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      addToast('Vui lòng nhập nhận xét', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        productId: parseInt(productId),
        orderId: orderId ? parseInt(orderId) : null,
        rating,
        comment
      };


      if (existingReview) {
        await reviewService.updateReview(existingReview.id, payload);
        addToast('Cập nhật đánh giá thành công', 'success');
      } else {
        await reviewService.createReview(payload);
        addToast('Cảm ơn bạn đã gửi đánh giá!', 'success');
      }
      onSuccess();

      onClose();
    } catch (error) {
      addToast('Có lỗi xảy ra khi gửi đánh giá', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) return;
    try {
      await reviewService.deleteReview(existingReview.id);
      addToast('Đã xóa đánh giá', 'success');
      onSuccess();

      onClose();
    } catch (error) {
      addToast('Không thể xóa đánh giá', 'error');
    }
  };

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3>{existingReview ? 'CHỈNH SỬA ĐÁNH GIÁ' : 'ĐÁNH GIÁ SẢN PHẨM'}</h3>
          <button className="close-btn" onClick={onClose}><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="review-product-info" style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px' }}>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Sản phẩm:</p>
            <p style={{ fontWeight: 800, fontSize: '1rem' }}>{productName}</p>
          </div>

          <div className="form-group text-center" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '12px' }}>Chất lượng sản phẩm</label>
            <div className="star-rating-input" style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star} 
                  type="button" 
                  onClick={() => setRating(star)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <Star 
                    size={32} 
                    fill={star <= rating ? '#000' : 'none'} 
                    color={star <= rating ? '#000' : '#cbd5e1'} 
                    style={{ transition: 'all 0.2s' }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nhận xét của bạn</label>
            <textarea 
              className="form-control"
              rows="4"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
              required
            ></textarea>
          </div>

          <div className="modal-footer" style={{ justifyContent: existingReview ? 'space-between' : 'flex-end' }}>
            {existingReview && (
              <button type="button" className="btn-delete-modal" onClick={handleDelete} style={{ color: '#ef4444', background: '#fee2e2', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trash2 size={18} /> XÓA
              </button>
            )}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="btn-text" onClick={onClose}>HỦY</button>
              <button type="submit" className="admin-btn-primary" disabled={submitting}>
                <Save size={18} /> {submitting ? 'ĐANG GỬI...' : (existingReview ? 'CẬP NHẬT' : 'GỬI ĐÁNH GIÁ')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
