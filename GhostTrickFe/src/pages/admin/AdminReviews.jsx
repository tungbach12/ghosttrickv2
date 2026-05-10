import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Edit2, Star, User, Search, Plus, X, Save, Upload, Camera, ChevronDown, Filter, ChevronLeft, ChevronRight, AlertCircle, ArrowUpDown, Check } from 'lucide-react';
import reviewService from '../../services/reviewService';
import { productService } from '../../services/productService';
import feedbackService from '../../services/feedbackService';
import { useToast } from '../../context/ToastContext';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [formData, setFormData] = useState({
    productId: '',
    rating: 5,
    comment: '',
    fakeUserName: '',
    fakeAvatarUrl: '',
    forceVerifiedPurchase: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('active'); // 'all', 'active', 'deleted'
  const [ratingFilter, setRatingFilter] = useState('all'); // 'all', '1'-'5'
  const [orderBy, setOrderBy] = useState('newest'); // 'newest', 'oldest'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'customer', 'fake'
  const [verifiedFilter, setVerifiedFilter] = useState('all'); // 'all', 'verified', 'none'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const dropdownRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    // Initial fetch for products
    const fetchProducts = async () => {
      try {
        const res = await productService.getProducts({ pageSize: 500 });
        setProducts(res.items);
      } catch (error) {
        addToast('Không thể tải danh sách sản phẩm', 'error');
      }
    };
    fetchProducts();

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch reviews when filters/pagination change
  useEffect(() => {
    fetchReviews();
  }, [currentPage, debouncedSearch, statusFilter, ratingFilter, typeFilter, verifiedFilter, orderBy]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const showDeleted = statusFilter === 'deleted' ? true : (statusFilter === 'active' ? false : null);
      const rating = ratingFilter === 'all' ? null : parseInt(ratingFilter);
      const isFake = typeFilter === 'all' ? null : (typeFilter === 'fake');
      const isVerified = verifiedFilter === 'all' ? null : (verifiedFilter === 'verified');
      
      const res = await reviewService.getAllReviews(currentPage, pageSize, debouncedSearch, showDeleted, rating, isFake, isVerified, orderBy);
      setReviews(res.items);
      setTotalCount(res.totalCount);
    } catch (error) {
      addToast('Không thể tải đánh giá', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const renderPagination = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      if (currentPage <= 3) end = 4;
      else if (currentPage >= totalPages - 2) start = totalPages - 3;
      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }
    return pages.map((num, idx) => (
      num === '...' ? (
        <span key={`dots-${idx}`} className="p-dots">...</span>
      ) : (
        <button 
          key={num} 
          className={`p-btn ${currentPage === num ? 'active' : ''}`}
          onClick={() => setCurrentPage(num)}
        >
          {num}
        </button>
      )
    ));
  };

  const fetchData = fetchReviews; // Keep compatibility if needed

  const handleOpenModal = (review = null) => {
    if (review) {
      setEditingReview(review);
      setFormData({
        productId: review.productId,
        rating: review.rating,
        comment: review.comment,
        fakeUserName: review.userName,
        fakeAvatarUrl: review.userAvatarUrl || '',
        forceVerifiedPurchase: review.isVerifiedPurchase
      });
    } else {
      setEditingReview(null);
      setFormData({
        productId: products.length > 0 ? products[0].id : '',
        rating: 5,
        comment: '',
        fakeUserName: '',
        fakeAvatarUrl: '',
        forceVerifiedPurchase: true // Default to true for fake reviews usually
      });
    }
    setProductSearch('');
    setShowModal(true);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingReview) {
        await reviewService.updateReview(editingReview.id, formData);
        addToast('Cập nhật đánh giá thành công', 'success');
      } else {
        await reviewService.createReview(formData);
        addToast('Đã thêm đánh giá giả mạo thành công', 'success');
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      addToast('Có lỗi xảy ra', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!reviewToDelete) return;
    setIsDeleting(true);
    try {
      await reviewService.deleteReview(reviewToDelete);
      addToast('Đã xóa đánh giá', 'success');
      setReviewToDelete(null);
      fetchData();
    } catch (error) {
      addToast('Không thể xóa', 'error');
    } finally {
      setIsDeleting(false);
    }
  };


  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await feedbackService.uploadImage(file);
      setFormData({ ...formData, fakeAvatarUrl: res.url });
      addToast('Tải ảnh đại diện thành công', 'success');
    } catch (error) {
      addToast('Không thể tải ảnh', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === formData.productId);
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );



  return (
    <div className="admin-container animate-up">
      <div className="admin-header-flex">
        <div>
          <h1 className="admin-title">QUẢN LÝ ĐÁNH GIÁ</h1>
          <p className="admin-subtitle">Quản lý phản hồi khách hàng và tạo social proof</p>
        </div>
        <button className="admin-btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> THÊM REVIEW GIẢ
        </button>
      </div>

      <div className="admin-card">
      <div className="filters-container">
        <div className="filters-bar mt-32">
          <div className="search-box">
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              placeholder="Tìm theo tên khách hàng, nội dung hoặc sản phẩm..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-actions">
            <select 
              className="sort-select"
              value={orderBy}
              onChange={(e) => { setOrderBy(e.target.value); setCurrentPage(1); }}
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
            </select>

            <button 
              className={`advanced-toggle ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} />
              <span>Bộ lọc nâng cao</span>
              {(statusFilter !== 'active' || ratingFilter !== 'all' || typeFilter !== 'all' || verifiedFilter !== 'all') && <span className="filter-dot"></span>}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="advanced-filters-panel">
            <div className="filters-grid">
              <div className="filter-item">
                <label>TRẠNG THÁI</label>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang hiển thị</option>
                  <option value="deleted">Đã ẩn/xóa</option>
                </select>
              </div>

              <div className="filter-item">
                <label>SỐ SAO</label>
                <select value={ratingFilter} onChange={(e) => { setRatingFilter(e.target.value); setCurrentPage(1); }}>
                  <option value="all">Mọi loại sao</option>
                  <option value="5">5 Sao ⭐⭐⭐⭐⭐</option>
                  <option value="4">4 Sao ⭐⭐⭐⭐</option>
                  <option value="3">3 Sao ⭐⭐⭐</option>
                  <option value="2">2 Sao ⭐⭐</option>
                  <option value="1">1 Sao ⭐</option>
                </select>
              </div>

              <div className="filter-item">
                <label>LOẠI NGƯỜI DÙNG</label>
                <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}>
                  <option value="all">Mọi loại khách</option>
                  <option value="customer">Khách thật</option>
                  <option value="fake">Review giả</option>
                </select>
              </div>

              <div className="filter-item">
                <label>XÁC MINH MUA HÀNG</label>
                <select value={verifiedFilter} onChange={(e) => { setVerifiedFilter(e.target.value); setCurrentPage(1); }}>
                  <option value="all">Mọi trạng thái</option>
                  <option value="verified">Đã mua hàng</option>
                  <option value="none">Chưa xác minh</option>
                </select>
              </div>
            </div>
            <div className="panel-footer">
              <button className="clear-all-btn" onClick={() => { setStatusFilter('active'); setRatingFilter('all'); setTypeFilter('all'); setVerifiedFilter('all'); setCurrentPage(1); }}>Xóa tất cả bộ lọc</button>
            </div>
          </div>
        )}
      </div>

        <div className="admin-table-wrapper hide-mobile">
          <table className="admin-table">
            <thead>
              <tr>
                <th>NGƯỜI DÙNG</th>
                <th>SẢN PHẨM</th>
                <th>ĐÁNH GIÁ</th>
                <th>NỘI DUNG</th>
                <th>NGÀY</th>
                <th className="text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-10">Đang tải...</td></tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10">
                    <div className="empty-state">
                      <AlertCircle size={48} color="#94a3b8" />
                      <p>Không tìm thấy đánh giá nào</p>
                    </div>
                  </td>
                </tr>
              ) : (
                reviews.map(r => (
                  <tr key={r.id} className={r.isDeleted ? 'row-deleted' : ''}>
                    <td>
                      <div className="admin-user-cell">
                        {r.userAvatarUrl ? (
                          <img src={r.userAvatarUrl} alt="" className="admin-avatar-sm" />
                        ) : (
                          <div className="admin-avatar-placeholder-sm"><User size={14}/></div>
                        )}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="font-bold">{r.userName}</span>
                            {r.isFake && <span className="badge-fake">FAKE</span>}
                          </div>
                          {r.isDeleted && <span className="badge-deleted">ĐÃ XÓA</span>}
                        </div>
                      </div>
                    </td>
                    <td><span className="sku-label">{r.productName}</span></td>
                    <td>
                      <div className="admin-rating">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star 
                            key={star} 
                            size={12} 
                            fill={star <= r.rating ? '#000' : 'none'} 
                            color={star <= r.rating ? '#000' : '#ccc'} 
                          />
                        ))}
                      </div>
                    </td>
                    <td>
                      <p className="admin-comment-truncate" title={r.comment}>{r.comment}</p>
                    </td>
                    <td>{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="text-right">
                      <div className="admin-table-actions">
                        <button className="action-btn edit" onClick={() => handleOpenModal(r)}><Edit2 size={16}/></button>
                        {!r.isDeleted && (
                          <button className="action-btn delete" onClick={() => setReviewToDelete(r.id)}><Trash2 size={16}/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="admin-mobile-reviews show-mobile">
           {loading ? (
             <div className="text-center py-10">Đang tải...</div>
           ) : reviews.length === 0 ? (
             <div className="empty-state">
               <AlertCircle size={48} color="#94a3b8" />
               <p>Không tìm thấy đánh giá nào</p>
             </div>
           ) : (
             reviews.map(r => (
               <div key={r.id} className={`review-mobile-card ${r.isDeleted ? 'row-deleted' : ''}`}>
                 <div className="review-card-top">
                   <div className="admin-user-cell">
                      {r.userAvatarUrl ? (
                        <img src={r.userAvatarUrl} alt="" className="admin-avatar-sm" />
                      ) : (
                        <div className="admin-avatar-placeholder-sm"><User size={14}/></div>
                      )}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="font-bold">{r.userName}</span>
                          {r.isFake && <span className="badge-fake">FAKE</span>}
                        </div>
                        <div className="admin-rating">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star 
                              key={star} 
                              size={10} 
                              fill={star <= r.rating ? '#000' : 'none'} 
                              color={star <= r.rating ? '#000' : '#ccc'} 
                            />
                          ))}
                        </div>
                      </div>
                   </div>
                   <div className="review-card-actions-top">
                      <button className="action-btn edit" onClick={() => handleOpenModal(r)}><Edit2 size={14}/></button>
                      {!r.isDeleted && (
                        <button className="action-btn delete" onClick={() => setReviewToDelete(r.id)}><Trash2 size={14}/></button>
                      )}
                   </div>
                 </div>
                 <div className="review-card-mid">
                    <span className="sku-label">{r.productName}</span>
                    <span className="review-date">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</span>
                 </div>
                 <div className="review-card-content">
                    <p>{r.comment}</p>
                 </div>
               </div>
             ))
           )}
        </div>

        {/* Pagination */}
        {totalCount > pageSize && (
          <div className="admin-pagination">
            <div className="page-info">
              Hiển thị <b>{(currentPage - 1) * pageSize + 1}</b> - <b>{Math.min(currentPage * pageSize, totalCount)}</b> trong tổng số <b>{totalCount}</b> đánh giá
            </div>
            <div className="pagination-controls">
              <button 
                className="p-btn" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft size={18} />
              </button>
              {renderPagination()}
              <button 
                className="p-btn" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Delete Confirmation Modal */}
      {reviewToDelete && createPortal(
        <div className="admin-rev-modal-overlay" onClick={() => !isDeleting && setReviewToDelete(null)}>
          <div className="admin-rev-modal" style={{ maxWidth: '400px', textAlign: 'center', padding: '32px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '64px', height: '64px', background: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Trash2 size={32} />
            </div>
            <h3 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '8px' }}>XÓA ĐÁNH GIÁ?</h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '32px', lineHeight: 1.5 }}>
              Bạn có chắc chắn muốn xóa đánh giá này? Hành động này không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="admin-rev-btn-cancel" 
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc' }}
                onClick={() => setReviewToDelete(null)}
                disabled={isDeleting}
              >
                HỦY
              </button>
              <button 
                className="admin-rev-btn-save" 
                style={{ flex: 1, background: '#ef4444', justifyContent: 'center' }}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'ĐANG XÓA...' : 'XÓA NGAY'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showModal && createPortal(

        <div className="admin-rev-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-rev-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-rev-modal-header">
              <h3>{editingReview ? 'CHỈNH SỬA ĐÁNH GIÁ' : 'TẠO REVIEW GIẢ MẠO'}</h3>
              <button className="admin-rev-btn-cancel" onClick={() => setShowModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="admin-rev-modal-body">
                <div className="admin-rev-form-group">
                  <label className="admin-rev-label">Sản phẩm</label>
                  <div className="searchable-select-container" ref={dropdownRef}>
                    <div 
                      className={`searchable-select-trigger ${showProductDropdown ? 'active' : ''}`}
                      onClick={() => setShowProductDropdown(!showProductDropdown)}
                    >
                      {selectedProduct ? (
                        <span>{selectedProduct.name} <small>(SKU: {selectedProduct.sku})</small></span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Chọn sản phẩm...</span>
                      )}
                      <ChevronDown size={18} />
                    </div>
                    
                    {showProductDropdown && (
                      <div className="searchable-select-dropdown">
                        <div className="dropdown-search">
                          <Search size={14} />
                          <input 
                            type="text" 
                            placeholder="Tìm sản phẩm..." 
                            value={productSearch}
                            onChange={e => setProductSearch(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                        <div className="dropdown-list">
                          {filteredProducts.length === 0 ? (
                            <div className="dropdown-no-results">Không tìm thấy sản phẩm</div>
                          ) : (
                            filteredProducts.map(p => (
                              <div 
                                key={p.id} 
                                className={`dropdown-item ${p.id === formData.productId ? 'selected' : ''}`}
                                onClick={() => {
                                  setFormData({...formData, productId: p.id});
                                  setShowProductDropdown(false);
                                  setProductSearch('');
                                }}
                              >
                                <div className="item-name">{p.name}</div>
                                <div className="item-sku">SKU: {p.sku}</div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="admin-rev-form-group">
                  <label className="admin-rev-label">Avatar (tùy chọn)</label>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div className="avatar-upload-preview">
                      {formData.fakeAvatarUrl ? (
                        <img src={formData.fakeAvatarUrl} alt="Avatar" />
                      ) : (
                        <Camera size={24} color="#94a3b8" />
                      )}
                      {isUploading && (
                        <div className="avatar-upload-loading">
                          <div className="loader-sm"></div>
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input 
                        type="file" 
                        id="avatar-upload-main" 
                        hidden 
                        onChange={handleAvatarUpload}
                        accept="image/*"
                      />
                      <button 
                        type="button" 
                        className="admin-rev-btn-cancel" 
                        onClick={() => document.getElementById('avatar-upload-main').click()}
                        disabled={isUploading}
                        style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        <Upload size={16} /> {formData.fakeAvatarUrl ? 'ĐỔI ẢNH' : 'TẢI ẢNH LÊN'}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '16px' }}>
                  <div className="admin-rev-form-group">
                    <label className="admin-rev-label">Tên hiển thị</label>
                    <input 
                      className="admin-rev-input" 
                      placeholder="VD: Nguyễn Văn A"
                      value={formData.fakeUserName}
                      onChange={e => setFormData({...formData, fakeUserName: e.target.value})}
                      required
                    />
                  </div>
                  <div className="admin-rev-form-group">
                    <label className="admin-rev-label">Rating</label>
                    <select 
                      className="admin-rev-input"
                      value={formData.rating}
                      onChange={e => setFormData({...formData, rating: parseInt(e.target.value)})}
                    >
                      <option value="5">5 ★</option>
                      <option value="4">4 ★</option>
                      <option value="3">3 ★</option>
                      <option value="2">2 ★</option>
                      <option value="1">1 ★</option>
                    </select>
                  </div>
                </div>

                <div className="admin-rev-form-group">
                  <label className="verified-toggle">
                    <input 
                      type="checkbox" 
                      checked={formData.forceVerifiedPurchase}
                      onChange={e => setFormData({...formData, forceVerifiedPurchase: e.target.checked})}
                    />
                    <span>Đã mua hàng (Verified Purchase)</span>
                  </label>
                </div>

                <div className="admin-rev-form-group">
                  <label className="admin-rev-label">Nội dung đánh giá</label>
                  <textarea 
                    className="admin-rev-input" 
                    rows="4"
                    placeholder="Nội dung nhận xét..."
                    value={formData.comment}
                    onChange={e => setFormData({...formData, comment: e.target.value})}
                    required
                  ></textarea>
                </div>
              </div>
              <div className="admin-rev-footer">
                <button type="button" className="admin-rev-btn-cancel" onClick={() => setShowModal(false)}>HỦY</button>
                <button type="submit" className="admin-rev-btn-save">
                   <Save size={18} /> {editingReview ? 'CẬP NHẬT' : 'TẠO REVIEW'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}


      <style>{`
        .badge-fake { background: #fee2e2; color: #ef4444; font-size: 0.6rem; font-weight: 900; padding: 2px 6px; border-radius: 4px; margin-left: 8px; }
        .badge-deleted { font-size: 0.6rem; background: #f1f5f9; color: #64748b; padding: 2px 6px; border-radius: 4px; margin-left: 8px; font-weight: 800; display: inline-block; margin-top: 4px; }
        .admin-user-cell { display: flex; align-items: center; gap: 10px; }
        .admin-avatar-sm { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
        .admin-avatar-placeholder-sm { width: 32px; height: 32px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #94a3b8; }
        .admin-rating { display: flex; gap: 2px; flex-wrap: nowrap; align-items: center; }
        .admin-comment-truncate { max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.85rem; color: #64748b; font-weight: 500; }
        .font-bold { font-weight: 700; }
        .sku-label { font-size: 0.75rem; font-weight: 600; color: #000; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
        .row-deleted { opacity: 0.6; background: #f8fafc !important; }
        .row-deleted td { color: #94a3b8 !important; }

        .admin-header-flex { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; gap: 20px; }
        .admin-title { font-size: 2.25rem; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -1px; line-height: 1.1; }
        .admin-subtitle { color: #64748b; font-weight: 600; margin: 8px 0 0; font-size: 1rem; }
        
        .admin-btn-primary { background: #3b82f6; color: white; border: none; padding: 14px 24px; border-radius: 16px; font-weight: 800; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -1px rgba(59, 130, 246, 0.1); }
        .admin-btn-primary:hover { background: #2563eb; transform: translateY(-3px) scale(1.02); box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3), 0 4px 6px -2px rgba(59, 130, 246, 0.1); }
        .admin-btn-primary:active { transform: translateY(-1px); }

        /* Standardized Filters Bar */
        .filters-bar { background: #fff; padding: 20px; border-radius: 16px; border: 1px solid #f1f5f9; display: flex; gap: 20px; align-items: center; flex-wrap: wrap; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); margin-bottom: 24px; }
        .search-box { position: relative; flex: 1; min-width: 300px; }
        .search-box input { width: 100%; padding: 12px 16px 12px 48px; border-radius: 12px; border: 1.5px solid #e2e8f0; font-size: 0.95rem; font-weight: 600; transition: all 0.2s; outline: none; background: #f8fafc; }
        .search-box input:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
        .search-box .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        
        .filter-group { display: flex; gap: 12px; align-items: center; }
        .filter-select { padding: 10px 16px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 0.85rem; font-weight: 700; color: #0f172a; cursor: pointer; background: white; outline: none; min-width: 150px; }
        .filter-select:focus { border-color: #3b82f6; }
        .ml-12 { margin-left: 12px; }
        .mt-32 { margin-top: 32px; }

        .empty-state { padding: 60px 0; display: flex; flex-direction: column; align-items: center; gap: 16px; color: #94a3b8; font-weight: 600; }

        /* Pagination */
        .admin-pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding: 16px; background: white; border-radius: 12px; border: 1px solid #f1f5f9; }
        .page-info { font-size: 0.85rem; color: #64748b; font-weight: 600; }
        .pagination-controls { display: flex; gap: 8px; }
        .p-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 10px; border: 1.5px solid #e2e8f0; background: white; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .p-btn:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; transform: translateY(-2px); }
        .p-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .p-btn.active { background: #000; color: white; border-color: #000; }
        .p-dots { display: flex; align-items: center; justify-content: center; width: 36px; color: #94a3b8; font-weight: 800; }
        
        .filters-container { background: white; border-radius: 24px; border: 1px solid #e2e8f0; margin-bottom: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); }
        .filters-bar { padding: 20px 24px; display: flex; gap: 20px; align-items: center; border-bottom: 1px solid #f1f5f9; }
        .search-box { position: relative; flex: 1; min-width: 300px; }
        .search-box input { width: 100%; padding: 12px 16px 12px 48px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 0.95rem; font-weight: 600; transition: all 0.2s; background: #f8fafc; outline: none; }
        .search-box input:focus { border-color: #0f172a; background: white; }
        .search-box .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        
        .filter-actions { display: flex; gap: 12px; }
        .advanced-toggle { display: flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 12px; border: 1px solid #e2e8f0; background: white; font-size: 0.9rem; font-weight: 700; color: #475569; cursor: pointer; transition: all 0.2s; position: relative; }
        .advanced-toggle.active { background: #0f172a; color: white; border-color: #0f172a; }
        .filter-dot { position: absolute; top: -4px; right: -4px; width: 10px; height: 10px; background: #ef4444; border-radius: 50%; border: 2px solid white; }
        
        .sort-select { padding: 12px 16px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 0.9rem; font-weight: 700; color: #0f172a; background: white; cursor: pointer; display: flex; align-items: center; gap: 8px; outline: none; }

        .advanced-filters-panel { padding: 24px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; animation: slideDown 0.3s ease; }
        .filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; }
        .filter-item label { display: block; font-size: 0.7rem; font-weight: 800; color: #94a3b8; margin-bottom: 8px; letter-spacing: 0.05em; }
        .filter-item select, .filter-item input { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 0.9rem; font-weight: 600; background: white; outline: none; }
        .panel-footer { margin-top: 24px; display: flex; justify-content: flex-end; }
        .clear-all-btn { background: none; border: none; font-size: 0.85rem; font-weight: 800; color: #ef4444; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
        @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        
        .admin-rev-btn-save { background: #000; color: white; border: none; padding: 12px 28px; font-weight: 700; display: flex; align-items: center; gap: 8px; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
        .admin-rev-btn-save:hover { background: #334155; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .admin-rev-btn-cancel { background: none; border: none; font-weight: 700; cursor: pointer; color: #64748b; font-size: 0.9rem; }
        .admin-rev-btn-cancel:hover { color: #0f172a; }
        
        /* Modern Admin Review Modal (Clean Style) */
        .admin-rev-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 10001; animation: fadeIn 0.2s; padding: 20px; }
        .admin-rev-modal { background: white; width: 100%; max-width: 500px; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); border: 1px solid rgba(0,0,0,0.05); position: relative; animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; }
        .admin-rev-modal-header { padding: 24px 30px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        .admin-rev-modal-header h3 { font-weight: 800; font-size: 1.25rem; color: #0f172a; margin: 0; }
        .admin-rev-modal-body { padding: 30px; overflow-y: auto; flex: 1; }
        .admin-rev-form-group { margin-bottom: 24px; }
        .admin-rev-label { display: block; font-size: 0.8rem; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .admin-rev-input { width: 100%; padding: 12px 16px; border: 1.5px solid #e2e8f0; background: #f8fafc; border-radius: 12px; font-weight: 600; font-family: inherit; font-size: 0.95rem; transition: all 0.2s; }
        .admin-rev-input:focus { border-color: #3b82f6; outline: none; background: #fff; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
        .admin-rev-footer { padding: 20px 30px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 12px; flex-shrink: 0; }

        .verified-toggle { display: flex; align-items: center; gap: 12px; background: #fff; padding: 14px 18px; border: 1.5px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
        .verified-toggle:hover { border-color: #cbd5e1; background: #f8fafc; }
        .verified-toggle input { width: 20px; height: 20px; cursor: pointer; border-radius: 6px; }
        .verified-toggle span { font-size: 0.85rem; font-weight: 700; color: #334155; }

        /* Searchable Select Styles */
        .searchable-select-container { position: relative; width: 100%; }
        .searchable-select-trigger { width: 100%; padding: 12px 16px; border: 1.5px solid #e2e8f0; background: #f8fafc; border-radius: 12px; font-weight: 600; font-size: 0.95rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; }
        .searchable-select-trigger:hover { border-color: #cbd5e1; background: #fff; }
        .searchable-select-trigger.active { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
        .searchable-select-trigger span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .searchable-select-trigger small { color: #94a3b8; margin-left: 8px; font-weight: 500; }

        .searchable-select-dropdown { position: absolute; top: calc(100% + 8px); left: 0; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); z-index: 100; overflow: hidden; animation: fadeIn 0.2s ease; }
        .dropdown-search { padding: 12px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 8px; background: #f8fafc; }
        .dropdown-search input { flex: 1; border: none; background: transparent; font-size: 0.85rem; font-weight: 600; outline: none; }
        .dropdown-list { max-height: 250px; overflow-y: auto; padding: 4px; }
        .dropdown-item { padding: 10px 16px; border-radius: 10px; cursor: pointer; transition: all 0.2s; }
        .dropdown-item:hover { background: #f1f5f9; }
        .dropdown-item.selected { background: #eff6ff; color: #1d4ed8; }
        .item-name { font-size: 0.85rem; font-weight: 700; }
        .item-sku { font-size: 0.7rem; color: #94a3b8; font-weight: 600; margin-top: 2px; }
        .dropdown-no-results { padding: 20px; text-align: center; color: #94a3b8; font-size: 0.85rem; font-weight: 600; }

        .avatar-upload-preview { width: 64px; height: 64px; border-radius: 16px; background: #f1f5f9; border: 1.5px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
        .avatar-upload-preview img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-upload-loading { position: absolute; inset: 0; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; }
        .loader-sm { width: 20px; height: 20px; border: 2px solid #e2e8f0; border-top-color: #0f172a; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        /* Mobile Specific Optimization */
        .show-mobile { display: none; }
        @media (max-width: 768px) {
          .hide-mobile { display: none; }
          .show-mobile { display: block; }
          
          .admin-header-flex { flex-direction: column; align-items: center; gap: 20px; text-align: center; margin-bottom: 24px; }
          .admin-title { font-size: 1.75rem; line-height: 1.2; }
          .admin-subtitle { font-size: 0.85rem; margin-top: 10px; }
          .admin-btn-primary { width: 100%; justify-content: center; padding: 14px; border-radius: 18px; }
          
          .filters-bar { padding: 16px; gap: 12px; flex-direction: column; align-items: stretch; border-bottom: none; }
          .search-box { min-width: unset; }
          .filter-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .filter-actions > .sort-select { grid-column: span 2; height: 48px; }
          .advanced-toggle { flex: 1; justify-content: center; height: 48px; }
          .filters-grid { grid-template-columns: 1fr; gap: 16px; }
          
          .review-mobile-card { background: #fff; border: 1px solid #f1f5f9; border-radius: 20px; padding: 20px; margin-bottom: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
          .review-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
          .review-card-mid { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 10px; }
          .review-date { font-size: 0.75rem; color: #94a3b8; font-weight: 700; }
          .review-card-content { font-size: 0.95rem; color: #334155; line-height: 1.6; font-weight: 500; }
          .admin-rating { display: flex; gap: 3px; margin-top: 6px; flex-wrap: nowrap; }
          
          .review-card-actions-top { display: flex; gap: 8px; }
          .review-card-actions-top .action-btn { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; background: #fff; color: #64748b; }
          .review-card-actions-top .action-btn.delete { color: #ef4444; }
          
          .admin-pagination { flex-direction: column; gap: 16px; align-items: center; text-align: center; }
          .pagination-controls { width: 100%; justify-content: center; }
        }
      `}</style>


    </div>
  );
}
