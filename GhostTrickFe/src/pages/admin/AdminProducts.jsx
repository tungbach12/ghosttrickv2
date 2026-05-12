import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Plus, Edit, Trash2, Eye, X, Package, Tag, Layers, ShoppingBag, Info, Palette, Search, Filter, Star, User, Edit2, Upload, Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import feedbackService from '../../services/feedbackService';
import { useToast } from '../../context/ToastContext';
import { formatPrice } from '../../utils/formatters';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(null); // ID of product being updated
  const pageSize = 10;
  const { addToast } = useToast();

  // Tabs for Detail Modal
  const [activeDetailTab, setActiveDetailTab] = useState('info'); // 'info' or 'reviews'
  const [editingReviewAdmin, setEditingReviewAdmin] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [isDeletingReview, setIsDeletingReview] = useState(false);
  const [productReviews, setProductReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Fake Review State
  const [showFakeReviewForm, setShowFakeReviewForm] = useState(false);
  const [fakeReviewData, setFakeReviewData] = useState({
    rating: 5,
    comment: '',
    fakeUserName: '',
    fakeAvatarUrl: '',
    forceVerifiedPurchase: true
  });

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        pageSize: pageSize,
      });

      if (searchTerm) params.append('q', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (stockStatus) params.append('stockStatus', stockStatus);
      if (sortBy) params.append('sort', sortBy);

      const response = await api.get(`/products?${params.toString()}`);
      if (response.data.items) {
        setProducts(response.data.items);
        setTotalCount(response.data.totalCount);
        setLowStockCount(response.data.lowStockCount || 0);
        setOutOfStockCount(response.data.outOfStockCount || 0);
      } else {
        setProducts(response.data);
      }
    } catch (error) {
      addToast('Không thể tải danh sách sản phẩm', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, statusFilter, categoryFilter, stockStatus, sortBy]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) fetchProducts();
      else setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, minPrice, maxPrice]);

  const handleViewDetail = async (id) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    setActiveDetailTab('info');
    try {
      const response = await api.get(`/products/${id}`);
      setSelectedProduct(response.data);
    } catch (error) {
      addToast('Không thể tải chi tiết sản phẩm', 'error');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchProductReviews = async (productId) => {
    setReviewsLoading(true);
    try {
      const response = await api.get(`/reviews?productId=${productId}`);
      setProductReviews(response.data.items || response.data);
    } catch (error) {
      addToast('Không thể tải đánh giá', 'error');
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (showDetailModal && activeDetailTab === 'reviews' && selectedProduct) {
      fetchProductReviews(selectedProduct.id);
    }
  }, [showDetailModal, activeDetailTab, selectedProduct]);

  const handleConfirmDeleteReview = async () => {
    if (!reviewToDelete) return;
    setIsDeletingReview(true);
    try {
      await api.delete(`/reviews/${reviewToDelete}`);
      setProductReviews(productReviews.filter(r => r.id !== reviewToDelete));
      addToast('Đã xóa đánh giá', 'success');
      setReviewToDelete(null);
    } catch (error) {
      addToast('Không thể xóa đánh giá', 'error');
    } finally {
      setIsDeletingReview(false);
    }
  };


  const handleCreateFakeReview = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...fakeReviewData,
        productId: selectedProduct.id
      };
      await api.post('/reviews', payload);
      addToast('Đã thêm đánh giá thành công', 'success');
      setShowFakeReviewForm(true);
      setFakeReviewData({
        rating: 5,
        comment: '',
        fakeUserName: '',
        fakeAvatarUrl: '',
        forceVerifiedPurchase: true
      });
      fetchProductReviews(selectedProduct.id);
    } catch (error) {
      addToast('Không thể tạo đánh giá', 'error');
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const res = await feedbackService.uploadImage(file);
      setFakeReviewData({ ...fakeReviewData, fakeAvatarUrl: res.url });
      addToast('Tải ảnh đại diện thành công', 'success');
    } catch (error) {
      addToast('Không thể tải ảnh', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };


  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const handleQuickStatusUpdate = async (productId, newStatus) => {
    setStatusUpdateLoading(productId);
    try {
      await api.patch(`/products/${productId}/status`, { status: newStatus });
      setProducts(products.map(p => p.id === productId ? { ...p, status: newStatus } : p));
      addToast('Cập nhật trạng thái thành công', 'success');
    } catch (error) {
      addToast('Không thể cập nhật trạng thái', 'error');
    } finally {
      setStatusUpdateLoading(null);
    }
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    setDeleteLoading(true);
    try {
      await api.delete(`/products/${productToDelete.id}`);
      setProducts(products.filter(p => p.id !== productToDelete.id));
      addToast('Đã xóa sản phẩm thành công', 'success');
      setShowDeleteModal(false);
    } catch (error) {
      addToast('Lỗi khi xóa sản phẩm', 'error');
    } finally {
      setDeleteLoading(false);
      setProductToDelete(null);
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

  if (loading) return (
    <div style={{ display: 'flex', height: '200px', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loader"></div>
    </div>
  );

  return (
    <div className="admin-products-page">
      <div className="admin-page-header">
        <div className="header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="title">Quản lý Sản phẩm</h2>
            <p className="subtitle">Quản lý thông tin, giá cả và tồn kho của tất cả sản phẩm.</p>
          </div>
          <Link to="/admin/products/add" className="add-new-btn">
            <Plus size={20} /> Thêm Sản phẩm
          </Link>
        </div>
      </div>

      <div className="admin-stats-overview">
        <div 
          className={`stat-card-mini clickable ${(!statusFilter && !stockStatus) ? 'active' : ''}`}
          onClick={() => { setStatusFilter(''); setStockStatus(''); }}
        >
          <div className="s-label">TỔNG SẢN PHẨM</div>
          <div className="s-value">{totalCount}</div>
        </div>
        <div 
          className={`stat-card-mini clickable ${stockStatus === 'lowstock' ? 'active' : ''}`}
          onClick={() => setStockStatus('lowstock')}
        >
          <div className="s-label">SẮP HẾT HÀNG</div>
          <div className="s-value" style={{ color: '#ef4444' }}>
            {lowStockCount}
          </div>
        </div>
        <div 
          className={`stat-card-mini clickable ${stockStatus === 'outofstock' ? 'active' : ''}`}
          onClick={() => setStockStatus('outofstock')}
        >
          <div className="s-label">HẾT HÀNG</div>
          <div className="s-value" style={{ color: '#94a3b8' }}>
            {outOfStockCount}
          </div>
        </div>
      </div>

      <div className="filters-container">
        <div className="filters-bar">
          <div className="search-box">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Tìm theo tên sản phẩm hoặc SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-actions">
            <button 
              className={`advanced-toggle ${showAdvancedFilters ? 'active' : ''}`}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter size={18} />
              Bộ lọc nâng cao
              { (categoryFilter || statusFilter || stockStatus || minPrice || maxPrice) && <span className="filter-dot"></span> }
            </button>

              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Mới nhất</option>
                <option value="price-asc">Giá thấp đến cao</option>
                <option value="price-desc">Giá cao đến thấp</option>
                <option value="name-asc">Tên A-Z</option>
                <option value="best-sellers-actual">Bán chạy nhất (Thực tế)</option>
                <option value="best-sellers">Bán chạy nhất (Ảo)</option>
              </select>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="advanced-filters-panel">
            <div className="filters-grid">
              <div className="filter-item">
                <label>DANH MỤC</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="filter-item">
                <label>TRẠNG THÁI</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="Active">Hoạt động</option>
                  <option value="Draft">Bản nháp</option>
                  <option value="Archived">Đã lưu trữ</option>
                  <option value="SoldOut">Hết hàng</option>
                  <option value="Deleted">Đã xóa</option>
                </select>
              </div>

              <div className="filter-item">
                <label>TỒN KHO</label>
                <select
                  value={stockStatus}
                  onChange={(e) => setStockStatus(e.target.value)}
                >
                  <option value="">Tất cả</option>
                  <option value="instock">Còn hàng</option>
                  <option value="outofstock">Hết hàng</option>
                  <option value="lowstock">Sắp hết hàng</option>
                </select>
              </div>

              <div className="filter-item">
                <label>KHOẢNG GIÁ</label>
                <div className="price-inputs">
                  <input 
                    type="number" 
                    placeholder="Min" 
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                  <span>-</span>
                  <input 
                    type="number" 
                    placeholder="Max" 
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="panel-footer">
              <button className="clear-all-btn" onClick={() => {
                setCategoryFilter('');
                setStatusFilter('');
                setStockStatus('');
                setMinPrice('');
                setMaxPrice('');
                setSearchTerm('');
              }}>
                Xóa tất cả bộ lọc
              </button>
            </div>
          </div>
        )}

        {/* Active Filter Tags */}
        <div className="active-filters">
          {categoryFilter && (
            <div className="filter-tag">
              Danh mục: {categories.find(c => c.slug === categoryFilter)?.name}
              <button onClick={() => setCategoryFilter('')}><X size={14} /></button>
            </div>
          )}
          {statusFilter && (
            <div className="filter-tag">
              Trạng thái: {statusFilter}
              <button onClick={() => setStatusFilter('')}><X size={14} /></button>
            </div>
          )}
          {stockStatus && (
            <div className="filter-tag">
              Kho: {stockStatus === 'instock' ? 'Còn hàng' : stockStatus === 'outofstock' ? 'Hết hàng' : 'Sắp hết'}
              <button onClick={() => setStockStatus('')}><X size={14} /></button>
            </div>
          )}
          {minPrice && (
            <div className="filter-tag">
              Giá từ: {formatPrice(minPrice)}
              <button onClick={() => setMinPrice('')}><X size={14} /></button>
            </div>
          )}
          {maxPrice && (
            <div className="filter-tag">
              Giá đến: {formatPrice(maxPrice)}
              <button onClick={() => setMaxPrice('')}><X size={14} /></button>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .admin-products-page { padding: 0; }
        .admin-page-header { background: transparent; border-bottom: none; margin-bottom: 40px; }
        .admin-page-header .title { font-size: 2.2rem; font-weight: 800; color: #0f172a; margin-bottom: 8px; letter-spacing: -0.03em; }
        .admin-page-header .subtitle { color: #64748b; font-size: 1rem; font-weight: 500; }
        
        .add-new-btn { background: #0f172a; color: white; border: none; padding: 14px 28px; border-radius: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); white-space: nowrap; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12); text-decoration: none; }
        .add-new-btn:hover { background: #1e293b; transform: translateY(-2px); box-shadow: 0 10px 25px rgba(15, 23, 42, 0.2); color: white; }
        
        .admin-stats-overview { display: flex; gap: 16px; margin-bottom: 24px; }
        .stat-card-mini { background: white; padding: 16px 24px; border-radius: 16px; border: 1px solid #f1f5f9; flex: 1; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .stat-card-mini.clickable { cursor: pointer; transition: all 0.2s; }
        .stat-card-mini.clickable:hover { transform: translateY(-2px); border-color: #cbd5e1; }
        .stat-card-mini.clickable.active { border-color: #0f172a; background: #f8fafc; box-shadow: 0 0 0 1px #0f172a; }
        .s-label { font-size: 0.65rem; font-weight: 800; color: #94a3b8; letter-spacing: 0.05em; margin-bottom: 4px; }
        .s-value { font-size: 1.5rem; font-weight: 900; color: #0f172a; }

        .filters-container { background: white; border-radius: 24px; border: 1px solid #f1f5f9; margin-bottom: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); }
        .filters-bar { padding: 20px 24px; display: flex; gap: 20px; align-items: center; border-bottom: 1px solid #f1f5f9; }
        .search-box { position: relative; flex: 1; min-width: 300px; }
        .search-box input { width: 100%; padding: 12px 16px 12px 48px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 0.95rem; font-weight: 600; transition: all 0.2s; background: #f8fafc; }
        .search-box input:focus { border-color: #0f172a; outline: none; background: white; box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.05); }
        .search-box .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        
        .filter-actions { display: flex; gap: 12px; align-items: center; }
        .advanced-toggle { display: flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 12px; border: 1px solid #e2e8f0; background: white; font-size: 0.9rem; font-weight: 700; color: #475569; cursor: pointer; transition: all 0.2s; position: relative; }
        .advanced-toggle:hover { border-color: #0f172a; color: #0f172a; background: #f8fafc; }
        .advanced-toggle.active { background: #0f172a; color: white; border-color: #0f172a; }
        .filter-dot { position: absolute; top: -4px; right: -4px; width: 10px; height: 10px; background: #ef4444; border-radius: 50%; border: 2px solid white; }
        
        .sort-select { padding: 12px 16px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 0.9rem; font-weight: 700; color: #0f172a; background: #f8fafc; cursor: pointer; outline: none; min-width: 180px; }
        .sort-select:focus { border-color: #0f172a; }
        
        .advanced-filters-panel { padding: 24px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; animation: slideDown 0.3s ease; }
        @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        
        .filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; }
        .filter-item label { display: block; font-size: 0.7rem; font-weight: 800; color: #94a3b8; margin-bottom: 8px; letter-spacing: 0.05em; }
        .filter-item select, .filter-item input { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 0.9rem; font-weight: 600; background: white; outline: none; }
        .filter-item select:focus, .filter-item input:focus { border-color: #0f172a; }
        
        .price-inputs { display: flex; align-items: center; gap: 8px; }
        .price-inputs input { flex: 1; }
        .price-inputs span { color: #94a3b8; font-weight: 700; }
        
        .panel-footer { margin-top: 24px; display: flex; justify-content: flex-end; }
        .clear-all-btn { background: none; border: none; font-size: 0.85rem; font-weight: 800; color: #ef4444; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
        .clear-all-btn:hover { background: #fee2e2; }

        .active-filters { padding: 12px 24px; display: flex; gap: 8px; flex-wrap: wrap; background: white; }
        .filter-tag { display: flex; align-items: center; gap: 6px; background: #f1f5f9; padding: 6px 12px; border-radius: 100px; font-size: 0.8rem; font-weight: 700; color: #475569; border: 1px solid #e2e8f0; }
        .filter-tag button { background: none; border: none; display: flex; align-items: center; justify-content: center; color: #94a3b8; cursor: pointer; padding: 2px; border-radius: 50%; }
        .filter-tag button:hover { background: #e2e8f0; color: #0f172a; }

        .quick-status-wrapper { position: relative; width: 130px; }
        .quick-status-select { width: 100%; padding: 6px 12px; border-radius: 10px; border: 1.5px solid #e2e8f0; font-size: 0.75rem; font-weight: 800; cursor: pointer; outline: none; transition: all 0.2s; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; }
        .quick-status-select:hover:not(:disabled) { border-color: #0f172a; background-color: #f8fafc; }
        .quick-status-select.active { background-color: #dcfce7; color: #166534; border-color: #bbf7d0; }
        .quick-status-select.draft { background-color: #f1f5f9; color: #475569; border-color: #e2e8f0; }
        .quick-status-select.archived { background-color: #ffedd5; color: #9a3412; border-color: #fed7aa; }
        .quick-status-select.soldout { background-color: #f1f5f9; color: #64748b; border-color: #e2e8f0; opacity: 0.8; }
        .quick-status-select.loading { opacity: 0.5; cursor: wait; }
        .quick-status-select:disabled { cursor: not-allowed; opacity: 0.7; }
        
        .deleted-badge { position: absolute; inset: 0; background: #fee2e2; color: #991b1b; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-size: 0.7rem; font-weight: 800; border: 1.5px solid #fecaca; }
        
        .mt-32 { margin-top: 32px; }

        /* Modal Styles */
        .detail-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 9999; padding: 20px; animation: fadeIn 0.3s ease; }
        .detail-modal-content { background: white; width: 100%; max-width: 900px; max-height: 90vh; border-radius: 32px; overflow: hidden; display: flex; flex-direction: column; position: relative; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        
        .modal-header-pd { padding: 24px 32px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: white; position: sticky; top: 0; z-index: 10; }
        .modal-body-pd { padding: 32px; overflow-y: auto; }
        
        .pd-grid { display: grid; grid-template-columns: 320px 1fr; gap: 40px; }
        .pd-image-section img { width: 100%; border-radius: 20px; border: 1px solid #f1f5f9; object-fit: cover; }
        .pd-image-gallery { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; }
        .pd-image-gallery img { width: 100%; aspect-ratio: 1; border-radius: 8px; border: 1px solid #f1f5f9; }
        
        .pd-label-tag { font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; display: block; }
        .pd-value-text { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin-bottom: 20px; display: block; }
        .pd-desc { color: #64748b; font-size: 0.95rem; line-height: 1.6; margin-bottom: 30px; }
        
        .variant-summary-table { width: 100%; border-collapse: collapse; border: 1px solid #f1f5f9; border-radius: 12px; overflow: hidden; }
        .variant-summary-table th { background: #f8fafc; padding: 12px; text-align: left; font-size: 0.75rem; font-weight: 800; color: #64748b; }
        .variant-summary-table td { padding: 12px; border-top: 1px solid #f1f5f9; font-size: 0.9rem; font-weight: 600; }
        .variant-summary-table .color-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-right: 8px; border: 1px solid rgba(0,0,0,0.1); }
        
        /* Pagination */
        .admin-pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding: 16px; background: white; border-radius: 12px; border: 1px solid #f1f5f9; }
        .page-info { font-size: 0.85rem; color: #64748b; font-weight: 600; }
        .pagination-controls { display: flex; gap: 8px; }
        .p-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .p-btn:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
        .p-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .p-btn.active { background: #0f172a; color: white; border-color: #0f172a; }
        .p-dots { display: flex; align-items: center; justify-content: center; width: 32px; color: #94a3b8; font-weight: 800; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        /* Modern Admin Review Modal (Clean Style) */
        .admin-rev-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 10001; animation: fadeIn 0.2s; }
        .admin-rev-modal { background: white; width: 100%; max-width: 500px; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); border: 1px solid rgba(0,0,0,0.05); position: relative; animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); overflow: hidden; }
        .admin-rev-modal-header { padding: 24px 30px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .admin-rev-modal-header h3 { font-weight: 800; font-size: 1.25rem; color: #0f172a; margin: 0; }
        .admin-rev-modal-body { padding: 30px; }
        .admin-rev-form-group { margin-bottom: 24px; }
        .admin-rev-label { display: block; font-size: 0.8rem; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .admin-rev-input { width: 100%; padding: 12px 16px; border: 1.5px solid #e2e8f0; background: #f8fafc; border-radius: 12px; font-weight: 600; font-family: inherit; font-size: 0.95rem; transition: all 0.2s ease; }
        .admin-rev-input:focus { border-color: #3b82f6; outline: none; background: #fff; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
        .admin-rev-footer { padding: 20px 30px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 12px; }
        
        .admin-rev-btn-save { background: #000; color: white; border: none; padding: 12px 28px; font-weight: 700; display: flex; align-items: center; gap: 8px; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
        .admin-rev-btn-save:hover { background: #334155; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .admin-rev-btn-cancel { background: none; border: none; font-weight: 700; cursor: pointer; color: #64748b; font-size: 0.9rem; }
        .admin-rev-btn-cancel:hover { color: #0f172a; }

        .verified-toggle { display: flex; align-items: center; gap: 12px; background: #fff; padding: 14px 18px; border: 1.5px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
        .verified-toggle:hover { border-color: #cbd5e1; background: #f8fafc; }
        .verified-toggle input { width: 20px; height: 20px; cursor: pointer; border-radius: 6px; }
        .verified-toggle span { font-size: 0.85rem; font-weight: 700; color: #334155; }

        .avatar-upload-preview { width: 64px; height: 64px; border-radius: 16px; background: #f1f5f9; border: 1.5px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
        .avatar-upload-preview img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-upload-loading { position: absolute; inset: 0; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; }
        .loader-sm { width: 20px; height: 20px; border: 2px solid #e2e8f0; border-top-color: #0f172a; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @keyframes modalSlideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }


        /* Confirm Modal */
        .confirm-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 10000; animation: fadeIn 0.2s ease; }
        .confirm-modal-card { background: white; width: 400px; padding: 32px; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #f1f5f9; text-align: center; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .confirm-icon { width: 64px; height: 64px; background: #fee2e2; color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
        .confirm-title { font-size: 1.25rem; font-weight: 900; color: #0f172a; margin-bottom: 8px; }
        .confirm-desc { color: #64748b; font-size: 0.95rem; margin-bottom: 32px; line-height: 1.5; }
        .confirm-actions { display: flex; gap: 12px; }
        .confirm-btn { flex: 1; padding: 12px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .confirm-btn.cancel { background: #f8fafc; border: 1px solid #e2e8f0; color: #475569; }
        .confirm-btn.delete { background: #ef4444; border: none; color: white; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .confirm-btn:hover { transform: translateY(-2px); }
        .confirm-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        /* Tabs */
        .modal-tabs { display: flex; gap: 4px; padding: 0 32px; background: white; border-bottom: 1px solid #f1f5f9; }
        .modal-tab { padding: 12px 24px; font-size: 0.85rem; font-weight: 800; color: #64748b; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s; }
        .modal-tab.active { color: #0f172a; border-bottom-color: #0f172a; }
        .modal-tab:hover:not(.active) { color: #0f172a; background: #f8fafc; }

        /* Review Styles in Modal */
        .admin-review-item { padding: 16px; border-radius: 16px; background: #f8fafc; border: 1px solid #f1f5f9; margin-bottom: 12px; }
        .review-user-info { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .review-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
        .review-name { font-weight: 700; color: #0f172a; font-size: 0.9rem; }
        .review-comment-admin { color: #475569; font-size: 0.85rem; line-height: 1.5; margin-bottom: 8px; }
        .review-footer-admin { display: flex; justify-content: space-between; align-items: center; }
        .review-meta-admin { font-size: 0.7rem; color: #94a3b8; font-weight: 600; }
        .badge-fake-admin { font-size: 0.6rem; background: #fee2e2; color: #ef4444; padding: 2px 6px; border-radius: 4px; font-weight: 900; margin-left: 6px; }

        .fake-review-form { background: #0f172a; border-radius: 20px; padding: 24px; margin-bottom: 24px; color: white; }
        .fake-review-form h4 { font-weight: 900; margin-bottom: 16px; font-size: 1rem; color: white; display: flex; align-items: center; gap: 8px; }
        .fake-form-grid { display: grid; grid-template-columns: 1fr 100px; gap: 16px; margin-bottom: 16px; }
        .fake-form-group label { display: block; font-size: 0.75rem; font-weight: 700; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; }
        .fake-input { width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 10px 14px; color: white; font-size: 0.9rem; font-weight: 500; }
        .fake-input:focus { border-color: #3b82f6; outline: none; }
        .fake-review-form .admin-btn-primary { background: white; color: #0f172a; }
        .fake-review-form .admin-btn-primary:hover { background: #f1f5f9; }

        /* Responsive Mobile */
        .desktop-only { display: block; }
        .mobile-product-list { display: none; }

        @media (max-width: 1024px) {
          .admin-page-header .header-flex { flex-direction: column; align-items: flex-start; gap: 16px; }
          .admin-page-header { margin-bottom: 24px; }
          .admin-page-header .title { font-size: 1.6rem; text-align: center; }
          .admin-page-header .subtitle { font-size: 0.85rem; text-align: center; }
          .header-flex { flex-direction: column; gap: 16px; align-items: center !important; }
          
          .admin-stats-overview { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .stat-card-mini { padding: 10px; border-radius: 12px; text-align: center; }
          .s-label { font-size: 0.55rem; }
          .s-value { font-size: 1.1rem; }

          .filters-bar { flex-direction: column; align-items: stretch; padding: 16px; }
          .search-box { min-width: 100%; }
          .filter-actions { width: 100%; flex-direction: column; }
          .advanced-toggle, .sort-select { width: 100%; justify-content: center; }
          .filters-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 768px) {
          .desktop-only { display: none; }
          .mobile-product-list { display: flex; flex-direction: column; gap: 16px; }
          .mobile-product-card { background: white; border-radius: 20px; padding: 16px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .card-top { display: flex; gap: 16px; margin-bottom: 16px; }
          .card-top img { width: 80px; height: 80px; border-radius: 12px; object-fit: cover; }
          .card-info { flex: 1; }
          .card-name { font-weight: 800; color: #0f172a; font-size: 1rem; margin-bottom: 4px; line-height: 1.3; }
          .card-sku { font-size: 0.8rem; color: #64748b; font-weight: 600; }
          .card-cat { font-size: 0.75rem; color: #3b82f6; font-weight: 700; text-transform: uppercase; margin-top: 4px; }
          
          .card-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 12px 0; border-top: 1px dashed #f1f5f9; border-bottom: 1px dashed #f1f5f9; margin-bottom: 16px; }
          .stat { display: flex; flex-direction: column; gap: 4px; }
          .stat-label { font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
          .stat-value { font-size: 0.9rem; font-weight: 700; color: #0f172a; }
          .status-pill { font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 20px; display: inline-block; width: fit-content; }
          .status-pill.active { background: #dcfce7; color: #166534; }
          
          .card-actions { display: flex; gap: 8px; }
          .m-action-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 0.85rem; font-weight: 700; color: #475569; text-decoration: none; }
          .m-action-btn.delete { color: #ef4444; }
          
          .admin-pagination { flex-direction: column; gap: 16px; text-align: center; }
          .pd-grid { grid-template-columns: 1fr; }
          .detail-modal-content { border-radius: 0; max-height: 100vh; }
        }
      `}} />


      <div className="admin-table-container desktop-only">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>SKU</th>
              <th>Giá</th>
              <th>Kho</th>
              <th>Lượt bán</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: 'right' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={product.mainImageUrl}
                      alt={product.name}
                      style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                    />
                    <div>
                      <div style={{ fontWeight: '700', color: '#1e293b' }}>{product.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: '600', textTransform: 'uppercase' }}>{product.categorySlug}</div>
                    </div>
                  </div>
                </td>
                <td style={{ color: '#64748b', fontWeight: '500' }}>{product.sku}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: '800', color: product.price < product.originalPrice ? '#ef4444' : '#0f172a' }}>
                      {formatPrice(product.price)}
                    </span>
                    {product.originalPrice > product.price && (
                      <span style={{ fontSize: '0.75rem', textDecoration: 'line-through', color: '#94a3b8' }}>
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <div style={{
                    fontWeight: '700',
                    color: product.totalStock <= 5 ? '#ef4444' : '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {product.totalStock}
                    {product.totalStock <= 5 && <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#ef4444', padding: '1px 4px', borderRadius: '4px' }}>LOW</span>}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, color: '#64748b' }}>
                      BÁN THỰC: {product.actualSalesCount}
                    </div>
                    <div style={{ 
                      background: product.manualSalesCount !== null ? '#0f172a' : '#f1f5f9', 
                      color: product.manualSalesCount !== null ? 'white' : '#94a3b8', 
                      padding: '4px 8px', 
                      borderRadius: '6px', 
                      fontSize: '0.7rem', 
                      fontWeight: 800 
                    }}>
                      BÁN ẢO: {product.manualSalesCount !== null ? product.manualSalesCount : '---'}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="quick-status-wrapper">
                    <select
                      className={`quick-status-select ${product.isDeleted || product.status === 'Deleted' ? 'deleted' : product.status.toLowerCase()} ${statusUpdateLoading === product.id ? 'loading' : ''}`}
                      value={product.status === 'SoldOut' ? 'Active' : product.status}
                      onChange={(e) => handleQuickStatusUpdate(product.id, e.target.value)}
                      disabled={statusUpdateLoading === product.id || product.isDeleted}
                    >
                      <option value="Active">Hoạt động</option>
                      <option value="Draft">Bản nháp</option>
                      <option value="Archived">Lưu trữ</option>
                    </select>
                    {(product.isDeleted || product.status === 'Deleted') && <span className="deleted-badge">Đã xóa</span>}
                    {(!product.isDeleted && product.status === 'Active' && product.totalStock <= 0) && (
                      <div style={{ position: 'absolute', top: '-18px', left: '0', fontSize: '0.65rem', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase' }}>
                        HẾT HÀNG (TỰ ĐỘNG)
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={() => handleViewDetail(product.id)} className="action-btn" title="Xem chi tiết">
                      <Eye size={18} />
                    </button>
                    <Link to={`/admin/products/edit/${product.id}`} className="action-btn edit" title="Sửa">
                      <Edit size={18} />
                    </Link>
                    <button onClick={() => handleDeleteClick(product)} className="action-btn delete" title="Xóa">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-product-list">
        {products.map((product) => (
          <div key={product.id} className="mobile-product-card">
            <div className="card-top">
              <img src={product.mainImageUrl} alt={product.name} />
              <div className="card-info">
                <div className="card-name">{product.name}</div>
                <div className="card-sku">SKU: {product.sku}</div>
                <div className="card-cat">{product.categorySlug}</div>
              </div>
            </div>
            <div className="card-stats">
              <div className="stat">
                <span className="stat-label">GIÁ</span>
                <span className="stat-value">{formatPrice(product.price)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">KHO</span>
                <span className="stat-value" style={{ color: product.totalStock <= 5 ? '#ef4444' : '#0f172a' }}>
                  {product.totalStock}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">BÁN</span>
                <span className="stat-value" style={{ fontSize: '0.75rem' }}>{product.actualSalesCount} | {product.manualSalesCount ?? '---'}</span>
              </div>
            </div>

            <div style={{ padding: '0 16px 16px' }}>
              <div className="quick-status-wrapper" style={{ width: '100%' }}>
                <select
                  className={`quick-status-select ${product.isDeleted || product.status === 'Deleted' ? 'deleted' : product.status.toLowerCase()} ${statusUpdateLoading === product.id ? 'loading' : ''}`}
                  value={product.status === 'SoldOut' ? 'Active' : product.status}
                  onChange={(e) => handleQuickStatusUpdate(product.id, e.target.value)}
                  disabled={statusUpdateLoading === product.id || product.isDeleted}
                  style={{ padding: '8px 12px', fontSize: '0.8rem', width: '100%' }}
                >
                  <option value="Active">Hoạt động</option>
                  <option value="Draft">Bản nháp</option>
                  <option value="Archived">Lưu trữ</option>
                </select>
                {(product.isDeleted || product.status === 'Deleted') && <span className="deleted-badge">Đã xóa</span>}
                {(!product.isDeleted && product.status === 'Active' && product.totalStock <= 0) && (
                  <div style={{ position: 'absolute', top: '-14px', left: '0', fontSize: '0.6rem', fontWeight: 900, color: '#ef4444' }}>
                    HẾT HÀNG (TỰ ĐỘNG)
                  </div>
                )}
              </div>
            </div>
            <div className="card-actions">
              <button onClick={() => handleViewDetail(product.id)} className="m-action-btn">
                <Eye size={18} /> Chi tiết
              </button>
              <Link to={`/admin/products/edit/${product.id}`} className="m-action-btn">
                <Edit size={18} /> Sửa
              </Link>
              <button onClick={() => handleDeleteClick(product)} className="m-action-btn delete">
                <Trash2 size={18} /> Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination UI */}
      {totalCount > pageSize && (
        <div className="admin-pagination">
          <div className="page-info">
            Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} trong tổng số {totalCount} sản phẩm
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


      {/* Delete Confirmation Modal for Reviews */}
      {reviewToDelete && createPortal(
        <div className="confirm-modal-overlay" onClick={() => !isDeletingReview && setReviewToDelete(null)}>
           <div className="confirm-modal-card" onClick={e => e.stopPropagation()}>
              <div className="confirm-icon">
                <Trash2 size={32} />
              </div>
              <h3 className="confirm-title">XÓA ĐÁNH GIÁ?</h3>
              <p className="confirm-desc">
                Hành động này không thể hoàn tác. Đánh giá này sẽ bị xóa vĩnh viễn khỏi hệ thống.
              </p>
              <div className="confirm-actions">
                <button 
                  className="confirm-btn cancel" 
                  onClick={() => setReviewToDelete(null)}
                  disabled={isDeletingReview}
                >
                  HỦY
                </button>
                <button 
                  className="confirm-btn delete" 
                  onClick={handleConfirmDeleteReview}
                  disabled={isDeletingReview}
                >
                  {isDeletingReview ? 'ĐANG XÓA...' : 'XÓA NGAY'}
                </button>
              </div>
           </div>
        </div>,
        document.body
      )}

      {/* Fake Review Modal */}

      {/* Detail Modal */}
      {showDetailModal && createPortal(
        <div className="detail-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="detail-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header-pd">
              <h3 style={{ fontWeight: 900, fontSize: '1.4rem' }}>Chi tiết sản phẩm</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer' }}
              >
                <X size={20} color="#64748b" />
              </button>
            </div>

            <div className="modal-tabs">
              <div
                className={`modal-tab ${activeDetailTab === 'info' ? 'active' : ''}`}
                onClick={() => setActiveDetailTab('info')}
              >
                THÔNG TIN CHUNG
              </div>
              <div
                className={`modal-tab ${activeDetailTab === 'reviews' ? 'active' : ''}`}
                onClick={() => setActiveDetailTab('reviews')}
              >
                ĐÁNH GIÁ SẢN PHẨM
              </div>
            </div>


            <div className="modal-body-pd">
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><div className="loader"></div></div>
              ) : selectedProduct ? (
                activeDetailTab === 'info' ? (
                  <div className="pd-grid">
                    <div className="pd-image-section">
                      <img src={selectedProduct.mainImageUrl} alt={selectedProduct.name} />
                      <div className="pd-image-gallery">
                        {selectedProduct.images?.map((img, i) => (
                          <img key={i} src={img} alt={`Gallery ${i}`} />
                        ))}
                      </div>
                    </div>

                    <div className="pd-info-section">
                      <span className="pd-label-tag">Tên sản phẩm</span>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '8px', color: '#0f172a' }}>{selectedProduct.name}</h2>
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>SKU: <span style={{ color: '#0f172a' }}>{selectedProduct.sku}</span></span>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Category: <span style={{ color: '#3b82f6' }}>{selectedProduct.categoryName}</span></span>
                      </div>

                      <div style={{ display: 'flex', gap: '40px' }}>
                        <div>
                          <span className="pd-label-tag">Giá bán</span>
                          <span className="pd-value-text" style={{ color: '#0f172a', fontSize: '1.5rem' }}>{formatPrice(selectedProduct.price)}</span>
                        </div>
                        {selectedProduct.originalPrice > 0 && selectedProduct.originalPrice > selectedProduct.price && (
                          <div>
                            <span className="pd-label-tag">Giá gốc</span>
                            <span className="pd-value-text" style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{formatPrice(selectedProduct.originalPrice)}</span>
                          </div>
                        )}
                        <div>
                          <span className="pd-label-tag">Thống kê bán hàng</span>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 16px', borderRadius: '12px', flex: 1 }}>
                              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', marginBottom: '2px' }}>THỰC TẾ</div>
                              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>{selectedProduct.actualSalesCount}</div>
                            </div>
                            <div style={{ 
                              background: selectedProduct.manualSalesCount !== null ? '#0f172a' : '#f1f5f9', 
                              color: selectedProduct.manualSalesCount !== null ? 'white' : '#64748b', 
                              padding: '10px 16px', 
                              borderRadius: '12px', 
                              flex: 1,
                              border: selectedProduct.manualSalesCount !== null ? 'none' : '1px solid #e2e8f0'
                            }}>
                              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: selectedProduct.manualSalesCount !== null ? '#94a3b8' : '#94a3b8', marginBottom: '2px' }}>HIỂN THỊ (ẢO)</div>
                              <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{selectedProduct.manualSalesCount !== null ? selectedProduct.manualSalesCount : selectedProduct.actualSalesCount}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <span className="pd-label-tag">Mô tả</span>
                      <p className="pd-desc">{selectedProduct.description || 'Không có mô tả.'}</p>

                      <span className="pd-label-tag" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                        <Layers size={14} /> Quản lý tồn kho chi tiết
                      </span>

                      <table className="variant-summary-table">
                        <thead>
                          <tr>
                            <th>MÀU SẮC</th>
                            <th>KÍCH THƯỚC</th>
                            <th>TỒN KHO</th>
                            <th>CẢNH BÁO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProduct.variants?.map((v, i) => (
                            <tr key={i}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <span className="color-dot" style={{ background: v.colorHex }}></span>
                                  {v.colorName}
                                </div>
                              </td>
                              <td><span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>{v.size}</span></td>
                              <td style={{ color: v.stock <= v.lowStockThreshold ? '#ef4444' : '#0f172a', fontWeight: 800 }}>{v.stock}</td>
                              <td style={{ color: '#94a3b8' }}>{v.lowStockThreshold}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="pd-reviews-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <h4 style={{ fontWeight: 900 }}>Đánh giá của khách hàng ({productReviews.length})</h4>
                      <button
                        className="p-btn active"
                        onClick={() => setShowFakeReviewForm(!showFakeReviewForm)}
                        style={{ fontSize: '0.75rem' }}
                      >
                        {showFakeReviewForm ? 'ĐÓNG FORM' : 'THÊM REVIEW GIẢ'}
                      </button>
                    </div>

                    {showFakeReviewForm && (
                      <form className="fake-review-form" onSubmit={handleCreateFakeReview}>
                        <h4><Palette size={18} /> Tạo đánh giá giả mạo</h4>
                        <div className="fake-form-grid">
                          <div className="fake-form-group">
                            <label>Tên khách hàng</label>
                            <input
                              type="text"
                              className="fake-input"
                              placeholder="VD: Nguyễn Văn A"
                              value={fakeReviewData.fakeUserName}
                              onChange={e => setFakeReviewData({ ...fakeReviewData, fakeUserName: e.target.value })}
                              required
                            />
                          </div>
                          <div className="fake-form-group">
                            <label>Rating</label>
                            <select
                              className="fake-input"
                              value={fakeReviewData.rating}
                              onChange={e => setFakeReviewData({ ...fakeReviewData, rating: parseInt(e.target.value) })}
                            >
                              <option value="5">5 ★</option>
                              <option value="4">4 ★</option>
                              <option value="3">3 ★</option>
                              <option value="2">2 ★</option>
                              <option value="1">1 ★</option>
                            </select>
                          </div>
                        </div>
                        <div className="fake-form-group" style={{ marginBottom: '16px' }}>
                          <label>Nhận xét</label>
                          <textarea
                            className="fake-input"
                            rows="3"
                            placeholder="Nội dung đánh giá..."
                            value={fakeReviewData.comment}
                            onChange={e => setFakeReviewData({ ...fakeReviewData, comment: e.target.value })}
                            required
                          ></textarea>
                        </div>
                        <button type="submit" className="add-new-btn" style={{ width: '100%', background: 'white', color: '#0f172a' }}>
                          LƯU ĐÁNH GIÁ
                        </button>
                      </form>
                    )}

                    {reviewsLoading ? (
                      <div style={{ textAlign: 'center', padding: '20px' }}><div className="loader"></div></div>
                    ) : productReviews.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '20px', color: '#64748b' }}>
                        <ShoppingBag size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                        <p>Chưa có đánh giá nào cho sản phẩm này.</p>
                      </div>
                    ) : (
                      <div className="reviews-list-admin">
                        {productReviews.map(r => (
                          <div key={r.id} className="admin-review-item">
                            <div className="review-user-info">
                              {r.userAvatarUrl ? (
                                <img src={r.userAvatarUrl} alt="" className="review-avatar" />
                              ) : (
                                <div className="review-avatar" style={{ background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <User size={16} color="#94a3b8" />
                                </div>
                              )}
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <span className="review-name">{r.userName}</span>
                                  {r.isFake && <span className="badge-fake-admin">FAKE</span>}
                                </div>
                                <div className="admin-rating" style={{ display: 'flex', gap: '2px' }}>
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <Star
                                      key={star}
                                      size={10}
                                      fill={star <= r.rating ? '#f59e0b' : 'none'}
                                      color={star <= r.rating ? '#f59e0b' : '#cbd5e1'}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <p className="review-comment-admin">{r.comment}</p>
                            <div className="review-footer-admin">
                              <span className="review-meta-admin">
                                {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                                {r.isVerifiedPurchase && <span style={{ color: '#10b981', marginLeft: '8px' }}>• Đã mua hàng</span>}
                              </span>
                                <button
                                  className="action-btn delete" 
                                  style={{ padding: '4px' }}
                                  onClick={() => setReviewToDelete(r.id)}
                                  title="Xóa"
                                >
                                  <Trash2 size={14} />
                                </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                    }
                  </div>
                )

              ) : null}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && createPortal(
        <div className="confirm-modal-overlay" onClick={() => !deleteLoading && setShowDeleteModal(false)}>
          <div className="confirm-modal-card" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">
              <Trash2 size={32} />
            </div>
            <h3 className="confirm-title">Xác nhận xóa?</h3>
            <p className="confirm-desc">
              Bạn có chắc chắn muốn xóa sản phẩm <strong>{productToDelete?.name}</strong>?
              Sản phẩm này sẽ được chuyển vào trạng thái "Đã xóa" và không còn hiển thị với khách hàng.
            </p>
            <div className="confirm-actions">
              <button
                className="confirm-btn cancel"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                Hủy bỏ
              </button>
              <button
                className="confirm-btn delete"
                onClick={confirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? <div className="loader" style={{ width: 16, height: 16, borderThickness: 2 }}></div> : 'Xóa sản phẩm'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminProducts;
