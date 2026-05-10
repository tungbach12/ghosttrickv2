import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { Plus, Trash2, Ticket, Percent, Banknote, AlertCircle, Info, Hash, FileText, ShoppingBag, Target, Users, Check, Calendar, Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { formatPrice, formatDate } from '../../utils/formatters';

const AdminVouchers = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  const [orderBy, setOrderBy] = useState('newest');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [newVoucher, setNewVoucher] = useState({
    code: '',
    description: '',
    category: 'General',
    discountType: 'Percent',
    discountValue: 0,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    usageLimit: 0,
    limitPerUser: 1,
    isActive: true,
    startDate: new Date().toISOString().slice(0, 16),
    endDate: ''
  });

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('pageSize', pageSize);
      if (searchTerm) params.append('q', searchTerm);
      if (statusFilter !== 'All') params.append('status', statusFilter);
      if (categoryFilter !== 'All') params.append('category', categoryFilter);
      if (orderBy) params.append('orderBy', orderBy);
      
      const response = await api.get(`/vouchers?${params.toString()}`);
      setVouchers(response.data.items);
      setTotalPages(Math.ceil(response.data.totalCount / pageSize));
    } catch (error) {
      addToast('Không thể tải danh sách mã giảm giá', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [page, statusFilter, categoryFilter, orderBy]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1); // Reset to first page on new search
      fetchVouchers();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const validate = () => {
    const newErrors = {};
    if (!newVoucher.code.trim()) newErrors.code = 'Mã voucher không được để trống';
    if (!newVoucher.description.trim()) newErrors.description = 'Vui lòng nhập mô tả';

    if (newVoucher.discountValue <= 0) {
      newErrors.discountValue = 'Giá trị phải lớn hơn 0';
    } else if (newVoucher.discountType === 'Percent' && newVoucher.discountValue > 100) {
      newErrors.discountValue = 'Phần trăm không được quá 100%';
    }

    if (newVoucher.minOrderAmount < 0) newErrors.minOrderAmount = 'Giá trị không hợp lệ';
    if (newVoucher.limitPerUser < 1) newErrors.limitPerUser = 'Tối thiểu là 1';
    if (newVoucher.usageLimit < 0) newErrors.usageLimit = 'Giá trị không hợp lệ';

    if (newVoucher.endDate && newVoucher.startDate && newVoucher.endDate < newVoucher.startDate) {
      newErrors.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setNewVoucher({
      code: '', description: '', category: 'General', discountType: 'Percent', discountValue: 0,
      minOrderAmount: 0, maxDiscountAmount: 0, usageLimit: 0, limitPerUser: 1, isActive: true,
      startDate: new Date().toISOString().slice(0, 16), endDate: ''
    });
    setEditingId(null);
    setErrors({});
    setServerError('');
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const dataToSend = {
      ...newVoucher,
      startDate: newVoucher.startDate || null,
      endDate: newVoucher.endDate || null
    };

    try {
      setServerError('');
      if (editingId) {
        await api.put(`/vouchers/${editingId}`, dataToSend);
        addToast('Đã cập nhật mã giảm giá!', 'success');
      } else {
        await api.post('/vouchers', dataToSend);
        addToast('Đã tạo mã giảm giá mới!', 'success');
      }
      resetForm();
      setShowModal(false);
      fetchVouchers();
    } catch (error) {
      console.error('Error saving voucher:', error);
      let msg = editingId ? 'Lỗi cập nhật mã' : 'Lỗi tạo mã';
      if (error.response?.data?.message) msg = error.response.data.message;
      setServerError(msg);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa mã này?')) {
      try {
        await api.delete(`/vouchers/${id}`);
        fetchVouchers();
        addToast('Đã xóa mã giảm giá', 'success');
      } catch (error) {
        addToast('Lỗi xóa mã giảm giá', 'error');
      }
    }
  };

  const handleEdit = (v) => {
    setEditingId(v.id);
    setNewVoucher({
      code: v.code,
      description: v.description,
      category: v.category,
      discountType: v.discountType,
      discountValue: v.discountValue,
      minOrderAmount: v.minOrderAmount,
      maxDiscountAmount: v.maxDiscountAmount,
      usageLimit: v.usageLimit,
      limitPerUser: v.limitPerUser,
      isActive: v.isActive,
      startDate: v.startDate ? v.startDate.slice(0, 16) : new Date().toISOString().slice(0, 16),
      endDate: v.endDate ? v.endDate.slice(0, 16) : ''
    });
    setErrors({});
    setShowModal(true);
  };

  const getVoucherStatus = (v) => {
    if (!v.isActive) return { label: 'Vô hiệu', class: 'gray' };
    const now = new Date();
    const start = v.startDate ? new Date(v.startDate) : null;
    const end = v.endDate ? new Date(v.endDate) : null;

    if (start && start > now) return { label: 'Sắp diễn ra', class: 'blue' };
    if (end && end < now) return { label: 'Hết hạn', class: 'red' };
    if (v.usageLimit > 0 && v.usedCount >= v.usageLimit) return { label: 'Hết lượt', class: 'orange' };

    return { label: 'Đang chạy', class: 'green' };
  };

  const handleInputChange = (field, value) => {
    setNewVoucher({ ...newVoucher, [field]: value });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };


  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
      <div className="loader"></div>
    </div>
  );

  return (
    <div className="admin-vouchers-page">
      <div className="admin-page-header">
        <div className="header-content">
          <div>
            <h2 className="title">Quản lý Vouchers</h2>
            <p className="subtitle">Thiết lập các chương trình khuyến mãi và phí vận chuyển.</p>
          </div>
          <button className="add-new-btn" onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={20} /> Tạo mã mới
          </button>
        </div>
      </div>

      {showModal && createPortal(
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Chỉnh sửa Voucher' : 'Tạo Voucher mới'}</h3>
              <button className="close-modal" onClick={() => setShowModal(false)}><Plus size={24} style={{ transform: 'rotate(45deg)' }} /></button>
            </div>
            <div className="modal-body">
              {serverError && (
                <div style={{ background: '#fef2f2', color: '#dc2626', padding: '16px', borderRadius: '18px', marginBottom: '24px', border: '1px solid #fecaca', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertCircle size={20} />
                  {serverError}
                </div>
              )}
              <div className="modal-grid">
                {/* Left: Form */}
                <div className="form-column">
                  <form onSubmit={handleCreateOrUpdate} noValidate>
                    <div className="form-section">
                      <h4 className="section-label">1. Thông tin định danh</h4>
                      <div className="form-group">
                        <label><Hash size={14} /> Mã Voucher</label>
                        <input
                          type="text" placeholder="VD: GHOSTTRICK20" value={newVoucher.code}
                          className={errors.code ? 'error' : ''}
                          onChange={e => handleInputChange('code', e.target.value.toUpperCase())}
                        />
                        {errors.code && <span className="error-message">{errors.code}</span>}
                      </div>
                      <div className="form-group">
                        <label><FileText size={14} /> Mô tả hiển thị</label>
                        <input
                          type="text" placeholder="VD: Giảm 20k cho đơn từ 200k" value={newVoucher.description}
                          className={errors.description ? 'error' : ''}
                          onChange={e => handleInputChange('description', e.target.value)}
                        />
                        {errors.description && <span className="error-message">{errors.description}</span>}
                      </div>
                      <div className="form-group">
                        <label><Target size={14} /> Loại Voucher</label>
                        <div className="discount-type-selector">
                          <button
                            type="button"
                            className={`type-btn ${newVoucher.category === 'General' ? 'active' : ''}`}
                            onClick={() => handleInputChange('category', 'General')}
                          >
                            Giảm giá hàng
                          </button>
                          <button
                            type="button"
                            className={`type-btn ${newVoucher.category === 'Shipping' ? 'active' : ''}`}
                            onClick={() => handleInputChange('category', 'Shipping')}
                          >
                            Giảm phí vận chuyển
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="form-section">
                      <h4 className="section-label">2. Cơ chế giảm giá</h4>
                      <div className="discount-type-selector">
                        <button
                          type="button"
                          className={`type-btn ${newVoucher.discountType === 'Percent' ? 'active' : ''}`}
                          onClick={() => handleInputChange('discountType', 'Percent')}
                        >
                          <Percent size={16} /> Phần trăm (%)
                        </button>
                        <button
                          type="button"
                          className={`type-btn ${newVoucher.discountType === 'Fixed' ? 'active' : ''}`}
                          onClick={() => handleInputChange('discountType', 'Fixed')}
                        >
                          <Banknote size={16} /> Số tiền cố định
                        </button>
                      </div>

                      <div className="input-row mt-16">
                        <div className="form-group flex-1">
                          <label>Giá trị giảm</label>
                          <div className="input-with-suffix">
                            <input
                              type="number" value={newVoucher.discountValue}
                              onChange={e => handleInputChange('discountValue', Number(e.target.value))}
                              className={errors.discountValue ? 'error' : ''}
                            />
                            <span className="suffix">{newVoucher.discountType === 'Percent' ? '%' : 'đ'}</span>
                          </div>
                          {errors.discountValue && <span className="error-message">{errors.discountValue}</span>}
                        </div>

                        {newVoucher.discountType === 'Percent' && (
                          <div className="form-group flex-1">
                            <label><Target size={14} /> Giảm tối đa</label>
                            <input
                              type="number" value={newVoucher.maxDiscountAmount}
                              onChange={e => handleInputChange('maxDiscountAmount', Number(e.target.value))}
                              placeholder="0 = Không giới hạn"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="form-section">
                      <h4 className="section-label">3. Điều kiện áp dụng</h4>
                      <div className="input-row">
                        <div className="form-group flex-1">
                          <label><ShoppingBag size={14} /> Đơn tối thiểu</label>
                          <input
                            type="number" value={newVoucher.minOrderAmount}
                            className={errors.minOrderAmount ? 'error' : ''}
                            onChange={e => handleInputChange('minOrderAmount', Number(e.target.value))}
                          />
                          {errors.minOrderAmount && <span className="error-message">{errors.minOrderAmount}</span>}
                        </div>
                        <div className="form-group flex-1">
                          <label><Users size={14} /> Lượt dùng / 1 user</label>
                          <input
                            type="number" value={newVoucher.limitPerUser}
                            className={errors.limitPerUser ? 'error' : ''}
                            onChange={e => handleInputChange('limitPerUser', Number(e.target.value))}
                            placeholder="0 = Vô hạn"
                          />
                          {errors.limitPerUser && <span className="error-message">{errors.limitPerUser}</span>}
                        </div>
                        <div className="form-group flex-1">
                          <label><Users size={14} /> Tổng số lượng mã</label>
                          <input
                            type="number" value={newVoucher.usageLimit}
                            className={errors.usageLimit ? 'error' : ''}
                            onChange={e => handleInputChange('usageLimit', Number(e.target.value))}
                            placeholder="0 = Vô hạn"
                          />
                          {errors.usageLimit && <span className="error-message">{errors.usageLimit}</span>}
                        </div>
                      </div>
                      <div className="input-row">
                        <div className="form-group flex-1">
                          <label>Ngày bắt đầu</label>
                          <input
                            type="datetime-local" value={newVoucher.startDate}
                            className={errors.startDate ? 'error' : ''}
                            onChange={e => handleInputChange('startDate', e.target.value)}
                          />
                          {errors.startDate && <span className="error-message">{errors.startDate}</span>}
                        </div>
                        <div className="form-group flex-1">
                          <label>Ngày kết thúc</label>
                          <input
                            type="datetime-local" value={newVoucher.endDate}
                            className={errors.endDate ? 'error' : ''}
                            onChange={e => handleInputChange('endDate', e.target.value)}
                          />
                          {errors.endDate && <span className="error-message">{errors.endDate}</span>}
                        </div>
                      </div>

                      <div className="form-section">
                        <h4 className="section-label">4. Trạng thái hoạt động</h4>
                        <label className="switch-container">
                          <div className="switch">
                            <input
                              type="checkbox"
                              checked={newVoucher.isActive}
                              onChange={(e) => setNewVoucher({ ...newVoucher, isActive: e.target.checked })}
                            />
                            <span className="slider"></span>
                          </div>
                          <span className="switch-label">Kích hoạt mã giảm giá này</span>
                        </label>
                      </div>
                    </div>

                    <button type="submit" className={`create-voucher-btn ${editingId ? 'update' : ''}`}>
                      {editingId ? 'Cập nhật Voucher' : 'Tạo mã giảm giá'}
                    </button>
                  </form>
                </div>

                {/* Right: Preview */}
                <div className="preview-column">
                  <div className="sticky-preview">
                    <h4 className="section-label">Xem trước hiển thị</h4>
                    <div className="voucher-preview-card">
                      <div className="v-glass-overlay"></div>
                      <div className="voucher-left">
                        <div className="voucher-icon-box">
                          <Ticket size={28} />
                        </div>
                      </div>
                      <div className="voucher-main">
                        <div className="v-tag">{newVoucher.category === 'Shipping' ? 'SHIPPING VOUCHER' : 'OFFICIAL VOUCHER'}</div>
                        <div className="v-code">{newVoucher.code || 'CODE_HERE'}</div>
                        <div className="v-desc">{newVoucher.description || 'Chưa có mô tả chi tiết'}</div>
                        <div className="v-details">
                          {newVoucher.discountType === 'Percent'
                            ? `Giảm ${newVoucher.discountValue}% ${newVoucher.category === 'Shipping' ? 'phí ship' : 'đơn hàng'}`
                            : `Giảm ${formatPrice(newVoucher.discountValue)} ${newVoucher.category === 'Shipping' ? 'phí ship' : 'đơn hàng'}`
                          }
                        </div>
                      </div>
                      <div className="voucher-right">
                        <div className="v-circle top"></div>
                        <div className="v-circle bottom"></div>
                        <div className="barcode-placeholder">
                          {[12, 24, 18, 30, 15, 22, 28, 12].map((h, i) => (
                            <div key={i} className="b-line" style={{ height: h, opacity: i % 3 === 0 ? 0.6 : 1 }}></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="filters-container">
        <div className="filters-bar mt-32">
          <div className="search-box">
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              placeholder="Tìm theo mã giảm giá hoặc mô tả..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-actions">
            <select 
              className="sort-select"
              value={orderBy}
              onChange={(e) => { setOrderBy(e.target.value); setPage(1); }}
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
              {(statusFilter !== 'All' || categoryFilter !== 'All') && <span className="filter-dot"></span>}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="advanced-filters-panel">
            <div className="filters-grid">
              <div className="filter-item">
                <label>TRẠNG THÁI</label>
                <select 
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                >
                  <option value="All">Tất cả trạng thái</option>
                  <option value="Active">Đang hoạt động</option>
                  <option value="Inactive">Ngưng hoạt động</option>
                  <option value="Deleted">Đã xóa</option>
                </select>
              </div>

              <div className="filter-item">
                <label>LOẠI MÃ</label>
                <select 
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                >
                  <option value="All">Tất cả loại</option>
                  <option value="General">Giảm hàng hóa</option>
                  <option value="Shipping">Giảm phí ship</option>
                </select>
              </div>
            </div>
            <div className="panel-footer">
              <button className="clear-all-btn" onClick={() => { setStatusFilter('All'); setCategoryFilter('All'); setPage(1); }}>Xóa tất cả bộ lọc</button>
            </div>
          </div>
        )}
      </div>

      <div className="admin-table-card mt-20">
        <h3 className="card-title mb-20">Danh sách Voucher hệ thống</h3>
        <div className="table-responsive desktop-only">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Thông tin Voucher</th>
                <th>Giảm giá</th>
                <th>Điều kiện</th>
                <th>Thời hạn</th>
                <th>Trạng thái</th>
                <th>Sử dụng</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => {
                const status = getVoucherStatus(v);
                return (
                  <tr key={v.id || v.code}>
                    <td>
                      <div className="v-table-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="v-table-code">{v.code}</span>
                          <span className={`cat-badge ${v.category === 'Shipping' ? 'orange' : 'gray'}`}>
                            {v.category === 'Shipping' ? 'Freeship' : 'Giảm đơn'}
                          </span>
                        </div>
                        <span className="v-table-desc">{v.description}</span>
                      </div>
                    </td>
                    <td>
                      <div className="v-table-discount">
                        <span className={`disc-pill ${v.discountType === 'Percent' ? 'blue' : 'green'}`}>
                          {v.discountType === 'Percent' ? `${v.discountValue}%` : formatPrice(v.discountValue)}
                        </span>
                        {v.discountType === 'Percent' && v.maxDiscountAmount > 0 && (
                          <span className="max-disc-hint">Tối đa {formatPrice(v.maxDiscountAmount)}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="v-table-cond">
                        <span className="v-table-min">Đơn ≥ {formatPrice(v.minOrderAmount)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="v-table-dates">
                        <div className="date-pill start">
                          <Calendar size={12} />
                          <span>{formatDate(v.startDate)}</span>
                        </div>
                        <div className="date-connector"></div>
                        <div className="date-pill end">
                          <Calendar size={12} />
                          <span>{v.endDate ? formatDate(v.endDate) : 'Vô hạn'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {v.isDeleted ? (
                        <span className="status-badge red">Đã xóa</span>
                      ) : (
                        <span className={`status-badge ${status.class}`}>{status.label}</span>
                      )}
                    </td>
                    <td>
                      <div className="usage-visual-box">
                        <div className="usage-info-row">
                          <span className="usage-main-val">{v.usedCount}</span>
                          <span className="usage-sep">/</span>
                          <span className="usage-total-val">{v.usageLimit === 0 ? 'Vô hạn' : v.usageLimit}</span>
                        </div>
                        <div className="usage-progress-track">
                          <div
                            className={`usage-progress-fill ${v.usageLimit > 0 && (v.usedCount / v.usageLimit) > 0.8 ? 'warning' : ''}`}
                            style={{ width: v.usageLimit === 0 ? '5%' : `${Math.min((v.usedCount / v.usageLimit) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <div className="usage-sub-info">
                          <Users size={10} />
                          <span>Tối đa {v.limitPerUser === 0 ? 'Vô hạn' : `${v.limitPerUser} lần/khách`}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button onClick={() => handleEdit(v)} className="action-btn edit" title="Sửa">
                          <FileText size={16} />
                        </button>
                        <button onClick={() => handleDelete(v.id || v.code)} className="action-btn delete" title="Xóa">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mobile-voucher-list mobile-only">
          {vouchers.map((v) => {
            const status = getVoucherStatus(v);
            return (
              <div key={v.id || v.code} className="v-mobile-card">
                <div className="v-m-header">
                  <div className="v-m-code-row">
                    <span className="v-m-code">{v.code}</span>
                    <span className={`cat-badge ${v.category === 'Shipping' ? 'orange' : 'gray'}`}>
                      {v.category === 'Shipping' ? 'Ship' : 'Đơn'}
                    </span>
                  </div>
                  <div className={`status-badge ${status.class}`}>{status.label}</div>
                </div>
                <div className="v-m-body">
                  <p className="v-m-desc">{v.description}</p>
                  <div className="v-m-stats">
                    <div className="stat-item">
                      <label>Giảm</label>
                      <span>{v.discountType === 'Percent' ? `${v.discountValue}%` : formatPrice(v.discountValue)}</span>
                    </div>
                    <div className="stat-item">
                      <label>Đơn tối thiểu</label>
                      <span>{formatPrice(v.minOrderAmount)}</span>
                    </div>
                  </div>
                  <div className="v-m-usage">
                    <div className="usage-progress-track">
                      <div
                        className="usage-progress-fill"
                        style={{ width: v.usageLimit === 0 ? '5%' : `${Math.min((v.usedCount / v.usageLimit) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="usage-text">Đã dùng {v.usedCount}/{v.usageLimit === 0 ? '∞' : v.usageLimit}</div>
                  </div>
                </div>
                <div className="v-m-actions">
                  <button onClick={() => handleEdit(v)} className="v-m-btn edit">Sửa</button>
                  <button onClick={() => handleDelete(v.id || v.code)} className="v-m-btn delete">Xóa</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-container mt-32">
            <div className="pagination-info">
              Trang {page} trên {totalPages}
            </div>
            <div className="pagination-controls">
              <button 
                className="pagination-btn" 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={20} />
              </button>
              
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i + 1}
                  className={`pagination-btn number ${page === i + 1 ? 'active' : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}

              <button 
                className="pagination-btn" 
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .admin-vouchers-page { padding: 32px; font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #f8fafc; min-height: 100vh; color: #0f172a; }
        .admin-page-header { margin-bottom: 40px; }
        .header-content { display: flex; justify-content: space-between; align-items: center; gap: 24px; }
        .admin-page-header .title { font-size: 2rem; font-weight: 800; color: #0f172a; margin-bottom: 8px; letter-spacing: -0.03em; }
        .admin-page-header .subtitle { color: #334155; font-size: 1rem; font-weight: 500; }
        
        .add-new-btn { background: #0f172a; color: white; border: none; padding: 14px 28px; border-radius: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); white-space: nowrap; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12); }
        .add-new-btn:hover { background: #1e293b; transform: translateY(-2px); box-shadow: 0 10px 25px rgba(15, 23, 42, 0.2); }

        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; animation: modalFadeIn 0.4s ease-out; }
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }

        .modal-content { background: white; width: 100%; max-width: 1080px; max-height: 92vh; border-radius: 36px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 40px 80px rgba(0,0,0,0.15); position: relative; animation: modalSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes modalSlideUp { from { transform: translateY(40px) scale(0.97); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }

        .modal-header { padding: 32px 48px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(15px); z-index: 10; }
        .modal-title { font-size: 1.75rem; font-weight: 900; color: #0f172a; letter-spacing: -0.04em; }
        .close-modal { background: #f1f5f9; border: none; color: #94a3b8; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: center; }
        .close-modal:hover { background: #e2e8f0; color: #0f172a; transform: rotate(90deg) scale(1.1); }
        
        .modal-body { padding: 48px; overflow-y: auto; flex: 1; }
        .modal-grid { display: grid; grid-template-columns: 1fr 380px; gap: 56px; align-items: flex-start; }

        .admin-table-card { background: white; border-radius: 28px; padding: 40px; border: 1px solid #f1f5f9; box-shadow: 0 8px 30px rgba(0,0,0,0.03); }
        
        .form-section { margin-bottom: 40px; }
        .section-label { font-size: 0.8rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 24px; display: flex; align-items: center; gap: 16px; }
        .section-label::after { content: ''; flex: 1; height: 2px; background: #f1f5f9; border-radius: 2px; }

        .form-group { margin-bottom: 24px; }
        .form-group label { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 10px; letter-spacing: 0.01em; }
        .form-group input { width: 100%; padding: 16px 20px; border: 2px solid #f1f5f9; border-radius: 18px; font-size: 1rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); outline: none; background: #f8fafc; font-weight: 500; color: #0f172a; }
        .form-group input::placeholder { color: #94a3b8; font-weight: 400; }
        .form-group input:focus { border-color: #0f172a; background: white; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05); transform: translateY(-1px); }
        
        .input-row { display: flex; gap: 24px; }
        .flex-1 { flex: 1; }
        .mt-16 { margin-top: 16px; }
        .mb-20 { margin-bottom: 20px; }
        .mt-32 { margin-top: 32px; }

        .discount-type-selector { display: flex; gap: 10px; background: #f1f5f9; padding: 8px; border-radius: 20px; }
        .type-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px; border: none; border-radius: 16px; cursor: pointer; font-size: 0.9rem; font-weight: 700; color: #64748b; background: transparent; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .type-btn.active { background: white; color: #0f172a; box-shadow: 0 6px 15px rgba(0,0,0,0.08); transform: translateY(-1px); }
        
        .input-with-suffix { position: relative; }
        .input-with-suffix .suffix { position: absolute; right: 20px; top: 50%; transform: translateY(-50%); font-weight: 900; color: #94a3b8; font-size: 1.2rem; }
        
        .sticky-preview { position: sticky; top: 0; }
        .voucher-preview-card { background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%); color: white; border-radius: 28px; height: 200px; display: flex; position: relative; overflow: hidden; box-shadow: 0 30px 60px -12px rgba(15, 23, 42, 0.35); transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1); cursor: default; }
        .voucher-preview-card:hover { transform: translateY(-8px) rotate(0.5deg); box-shadow: 0 45px 80px -15px rgba(15, 23, 42, 0.45); }
        
        /* Mesh Gradient & Reflection */
        .voucher-preview-card::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(59,130,246,0.1) 0%, transparent 50%); z-index: 1; }
        .v-glass-overlay { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(255,255,255,0.03) 100%); z-index: 2; pointer-events: none; }
        .v-glass-overlay::after { content: ''; position: absolute; top: -100%; left: -100%; width: 300%; height: 300%; background: linear-gradient(45deg, transparent 45%, rgba(255,255,255,0.1) 50%, transparent 55%); animation: shine 6s infinite linear; }
        @keyframes shine { from { transform: translateX(-10%); } to { transform: translateX(10%); } }
        
        .voucher-left { width: 100px; display: flex; align-items: center; justify-content: center; border-right: 3px dashed rgba(255,255,255,0.12); position: relative; z-index: 3; }
        .voucher-icon-box { background: rgba(255,255,255,0.08); padding: 16px; border-radius: 22px; backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1); }
        
        .voucher-main { flex: 1; padding: 32px; display: flex; flex-direction: column; justify-content: center; position: relative; z-index: 3; }
        .v-tag { font-size: 0.7rem; font-weight: 900; letter-spacing: 0.2em; color: rgba(255,255,255,0.35); margin-bottom: 8px; text-transform: uppercase; }
        .v-code { font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 2rem; font-weight: 800; letter-spacing: 2px; margin-bottom: 6px; color: #fff; text-shadow: 0 4px 15px rgba(0,0,0,0.3); }
        .v-desc { font-size: 0.95rem; color: rgba(255,255,255,0.6); margin-bottom: 16px; font-weight: 500; line-height: 1.4; }
        .v-details { font-size: 0.8rem; font-weight: 800; background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 12px; width: fit-content; border: 1px solid rgba(255,255,255,0.12); backdrop-filter: blur(4px); }
        
        .voucher-right { width: 70px; background: rgba(255,255,255,0.02); position: relative; display: flex; align-items: center; justify-content: center; z-index: 3; }
        .barcode-placeholder { display: flex; flex-direction: column; gap: 4px; align-items: center; opacity: 0.25; }
        .b-line { width: 36px; background: white; border-radius: 2px; }
        
        .v-circle { width: 28px; height: 28px; background: white; border-radius: 50%; position: absolute; left: -14px; z-index: 4; box-shadow: inset 0 4px 8px rgba(0,0,0,0.05); }
        .v-circle.top { top: -14px; }
        .v-circle.bottom { bottom: -14px; }
        
        /* Table Row & Cell Polishing */
        .admin-table { width: 100%; border-collapse: separate; border-spacing: 0 12px; margin-top: -12px; }
        .admin-table th { background: transparent; border: none; padding: 16px 24px; color: #64748b; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.05em; }
        .admin-table tr { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .admin-table tbody tr { background: white; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
        .admin-table tbody tr:hover { transform: translateY(-3px) scale(1.002); box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06); z-index: 5; position: relative; }
        .admin-table td { border: 1px solid #f1f5f9; border-width: 1px 0; padding: 24px; }
        .admin-table td:first-child { border-left-width: 1px; border-top-left-radius: 20px; border-bottom-left-radius: 20px; }
        .admin-table td:last-child { border-right-width: 1px; border-top-right-radius: 20px; border-bottom-right-radius: 20px; }
        
        .v-table-code { font-family: 'JetBrains Mono', monospace; font-weight: 800; color: #0f172a; font-size: 1.1rem; }
        .v-table-desc { font-size: 0.85rem; color: #475569; font-weight: 500; }
        
        .v-table-dates { display: flex; flex-direction: column; gap: 6px; }
        .date-pill { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; }
        .date-pill.start { background: #f0fdf4; color: #10b981; }
        .date-pill.end { background: #fef2f2; color: #f43f5e; }

        .usage-progress-track { height: 10px; background: #f1f5f9; border-radius: 12px; overflow: hidden; margin-bottom: 10px; }
        .usage-progress-fill { height: 100%; background: #0f172a; border-radius: 12px; transition: width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .usage-progress-fill.warning { background: linear-gradient(90deg, #f59e0b, #ef4444); animation: pulse 2s infinite; }
        
        .status-badge { font-size: 0.65rem; font-weight: 900; padding: 6px 12px; border-radius: 10px; letter-spacing: 0.08em; }
        
        .action-btn { width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; border: 1px solid #f1f5f9; background: white; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); color: #475569; }
        .action-btn:hover { background: #0f172a; color: white; border-color: #0f172a; transform: translateY(-3px) rotate(5deg); box-shadow: 0 10px 20px rgba(15, 23, 42, 0.15); }
        .action-btn.delete:hover { background: #f43f5e; border-color: #f43f5e; }

        /* Premium Switch Toggle Fix */
        .switch-container { display: flex; align-items: center; gap: 16px; cursor: pointer; padding: 18px 28px; background: #f8fafc; border-radius: 22px; border: 2px solid #f1f5f9; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .switch-container:hover { border-color: #0f172a; background: white; transform: translateY(-1px); }
        .switch { position: relative; display: inline-block; width: 48px; height: 26px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #e2e8f0; transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        input:checked + .slider { background-color: #10b981; }
        input:checked + .slider:before { transform: translateX(22px); }

        .create-voucher-btn { width: 100%; padding: 20px; background: #0f172a; color: white; border: none; border-radius: 22px; font-weight: 900; font-size: 1.1rem; cursor: pointer; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); margin-top: 32px; box-shadow: 0 15px 30px rgba(15, 23, 42, 0.15); }
        .create-voucher-btn:hover { background: #1e293b; transform: translateY(-4px); box-shadow: 0 25px 50px rgba(15, 23, 42, 0.25); }
        .create-voucher-btn.update { background: #2563eb; }

        @media (max-width: 1024px) {
          .modal-grid { grid-template-columns: 1fr; gap: 40px; }
          .preview-column { order: -1; }
          .sticky-preview { position: sticky; top: 20px; }
        }
        
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
        
        .mt-20 { margin-top: 20px; }
        .mt-32 { margin-top: 32px; }

        .desktop-only { display: block; }
        .mobile-only { display: none; }

        @media (max-width: 768px) {
          .admin-vouchers-page { padding: 16px; }
          .header-content { flex-direction: column; align-items: flex-start; gap: 12px; }
          .add-new-btn { width: 100%; justify-content: center; }
          
          .modal-overlay { padding: 0; align-items: flex-start; }
          .modal-content { height: 100vh; max-height: 100vh; border-radius: 0; }
          .modal-header { padding: 16px 20px; }
          .modal-body { padding: 24px 20px; flex: 1; }
          
          .modal-grid { gap: 32px; }
          .form-section { margin-bottom: 32px; }
          .admin-table-card { padding: 16px; border-radius: 16px; }
          .admin-page-header .title { font-size: 1.4rem; }
          
          .filters-bar { padding: 16px; gap: 12px; flex-direction: column; align-items: stretch; border-bottom: none; }
          .search-box { min-width: unset; }
          .filter-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .filter-actions > .sort-select { grid-column: span 2; height: 48px; }
          .advanced-toggle { flex: 1; justify-content: center; height: 48px; }
          .filters-grid { grid-template-columns: 1fr; gap: 16px; }

          .desktop-only { display: none !important; }
          .mobile-only { display: block !important; }
          
          .v-mobile-card { background: #fff; border: 1px solid #f1f5f9; border-radius: 16px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
          .v-m-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
          .v-m-code-row { display: flex; align-items: center; gap: 8px; }
          .v-m-code { font-family: 'JetBrains Mono', monospace; font-weight: 800; color: #0f172a; font-size: 1rem; }
          .v-m-desc { font-size: 0.85rem; color: #64748b; margin-bottom: 16px; font-weight: 500; }
          .v-m-stats { display: flex; gap: 20px; margin-bottom: 16px; }
          .stat-item label { display: block; font-size: 0.65rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
          .stat-item span { font-weight: 800; color: #1e293b; font-size: 0.9rem; }
          .v-m-usage { margin-bottom: 16px; }
          .usage-text { font-size: 0.7rem; color: #94a3b8; font-weight: 700; margin-top: 6px; text-align: right; }
          .v-m-actions { display: flex; gap: 8px; border-top: 1px solid #f1f5f9; pt: 12px; margin-top: 12px; padding-top: 12px; }
          .v-m-btn { flex: 1; padding: 10px; border-radius: 10px; border: none; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
          .v-m-btn.edit { background: #f1f5f9; color: #475569; }
          .v-m-btn.delete { background: #fee2e2; color: #ef4444; }

          .pagination-container { display: flex; flex-direction: column; align-items: center; gap: 16px; }
          .pagination-controls { justify-content: center; width: 100%; }
        }

        /* Pagination Styles */
        .pagination-container { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-top: 1px solid #f1f5f9; }
        .pagination-info { font-size: 0.9rem; font-weight: 600; color: #64748b; }
        .pagination-controls { display: flex; gap: 8px; align-items: center; }
        .pagination-btn { width: 40px; height: 40px; border-radius: 12px; border: 1px solid #e2e8f0; background: white; display: flex; align-items: center; justify-content: center; color: #0f172a; cursor: pointer; transition: all 0.2s; }
        .pagination-btn:hover:not(:disabled) { border-color: #0f172a; background: #f8fafc; transform: translateY(-2px); }
        .pagination-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .pagination-btn.number { font-weight: 700; font-size: 0.9rem; }
        .pagination-btn.number.active { background: #0f172a; color: white; border-color: #0f172a; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2); }
        
        .ml-12 { margin-left: 12px; }
        `
      }} />
    </div>
  );
};

export default AdminVouchers;
