import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Search,
  Filter,
  Eye,
  History,
  User,
  MapPin,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
  ExternalLink,
  Package,
  MoreHorizontal,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  DollarSign,
  Phone,
  Mail,
  Box,
  Tag,
  Info,
  Layers,
  Activity
} from 'lucide-react';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info' or 'products' or 'history'
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [orderBy, setOrderBy] = useState('newest');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [detailLoading, setDetailLoading] = useState(false);
  const { addToast } = useToast();

  const fetchOrders = useCallback(async (page = currentPage) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('pageSize', pageSize);
      
      if (searchTerm) params.append('q', searchTerm);
      if (statusFilter !== 'All') params.append('status', statusFilter);
      if (paymentMethodFilter !== 'All') params.append('paymentMethod', paymentMethodFilter);
      if (paymentStatusFilter !== 'All') params.append('paymentStatus', paymentStatusFilter);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      if (orderBy) params.append('orderBy', orderBy);

      const response = await api.get(`/orders/all?${params.toString()}`);
      setOrders(response.data.items);
      setTotalPages(response.data.totalPages);
      setTotalCount(response.data.totalCount);
      setCurrentPage(response.data.page);
    } catch (error) {
      addToast('Không thể tải danh sách đơn hàng', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, paymentMethodFilter, paymentStatusFilter, dateRange, orderBy, pageSize, addToast]);

  useEffect(() => {
    fetchOrders(1);
  }, [statusFilter, paymentMethodFilter, paymentStatusFilter, dateRange, orderBy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders(1);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleViewDetail = async (id) => {
    setDetailLoading(true);
    setActiveTab('info');
    // Set immediate partial data if available
    const quickOrder = orders.find(o => o.id === id);
    if (quickOrder) setSelectedOrder(quickOrder);

    try {
      const response = await api.get(`/orders/${id}`);
      setSelectedOrder(response.data);
    } catch (error) {
      addToast('Không thể tải chi tiết đơn hàng', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      addToast(`Cập nhật đơn hàng #GT-${orderId} thành công`, 'success');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      addToast('Không thể cập nhật trạng thái', 'error');
    }
  };

  const handlePaymentStatusChange = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/payment-status`, { status: newStatus });
      addToast(`Đã cập nhật thanh toán đơn hàng #GT-${orderId}`, 'success');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentStatus: newStatus } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, paymentStatus: newStatus }));
      }
    } catch (error) {
      addToast('Lỗi cập nhật thanh toán', 'error');
    }
  };

  const handleDeleteOrder = async (id) => {
    if (window.confirm(`Bạn có chắc muốn xóa đơn hàng #GT-${id}?`)) {
      try {
        await api.delete(`/orders/${id}`);
        fetchOrders();
        addToast(`Đã xóa đơn hàng #GT-${id} thành công`, 'success');
        if (selectedOrder && selectedOrder.id === id) setSelectedOrder(null);
      } catch (error) {
        addToast('Không thể xóa đơn hàng', 'error');
      }
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'Delivered': return { label: 'Đã giao', color: '#059669', bg: '#ecfdf5' };
      case 'Cancelled': return { label: 'Đã hủy', color: '#dc2626', bg: '#fef2f2' };
      case 'Failed': return { label: 'Thất bại', color: '#dc2626', bg: '#fef2f2' };
      case 'Confirmed': return { label: 'Đã xác nhận', color: '#2563eb', bg: '#eff6ff' };
      case 'Processing': return { label: 'Đang xử lý', color: '#d97706', bg: '#fffbeb' };
      case 'Shipping': return { label: 'Đang giao', color: '#7c3aed', bg: '#f5f3ff' };
      default: return { label: 'Chờ xác nhận', color: '#64748b', bg: '#f8fafc' };
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setPaymentMethodFilter('All');
    setPaymentStatusFilter('All');
    setDateRange({ start: '', end: '' });
  };

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
          className={`p-btn num ${currentPage === num ? 'active' : ''}`}
          onClick={() => fetchOrders(num)}
        >
          {num}
        </button>
      )
    ));
  };

  return (
    <div className="admin-orders-page">
      <div className="admin-page-header">
        <div className="header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="title">Quản lý Đơn hàng</h2>
            <p className="subtitle">Theo dõi, cập nhật trạng thái và quản lý vận chuyển đơn hàng.</p>
          </div>
          <div className="header-actions">
            <div className="stat-pill">
              <span className="s-label">TỔNG ĐƠN HÀNG</span>
              <span className="s-value">{totalCount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="filters-container">
        <div className="filters-bar">
          <div className="search-box">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Tìm theo Mã đơn, Khách hàng, Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-actions">
            <select 
              className="sort-select" 
              value={orderBy} 
              onChange={(e) => setOrderBy(e.target.value)}
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
              { (statusFilter !== 'All' || paymentMethodFilter !== 'All' || dateRange.start) && <span className="filter-dot"></span> }
            </button>
            <button className="sort-select" onClick={() => fetchOrders()}>
              <Activity size={18} /> <span className="hide-mobile">Làm mới dữ liệu</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="advanced-filters-panel">
            <div className="filters-grid">
              <div className="filter-item">
                <label>TRẠNG THÁI ĐƠN</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="All">Tất cả</option>
                  <option value="Pending">Chờ xác nhận</option>
                  <option value="Confirmed">Đã xác nhận</option>
                  <option value="Processing">Đang xử lý</option>
                  <option value="Shipping">Đang giao hàng</option>
                  <option value="Delivered">Đã giao hàng</option>
                  <option value="Cancelled">Đã hủy</option>
                </select>
              </div>
              <div className="filter-item">
                <label>THANH TOÁN</label>
                <select value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value)}>
                  <option value="All">Tất cả phương thức</option>
                  <option value="COD">COD</option>
                  <option value="BankTransfer">Chuyển khoản</option>
                </select>
              </div>
              <div className="filter-item">
                <label>TỪ NGÀY</label>
                <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
              </div>
              <div className="filter-item">
                <label>ĐẾN NGÀY</label>
                <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
              </div>
            </div>
            <div className="panel-footer">
              <button className="clear-all-btn" onClick={resetFilters}>Xóa tất cả bộ lọc</button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loader-container"><div className="loader"></div></div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-modern-table pc-view">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>MÃ ĐƠN</th>
                <th>KHÁCH HÀNG</th>
                <th style={{ width: '150px' }}>THỜI GIAN</th>
                <th style={{ width: '150px' }}>TỔNG CỘNG</th>
                <th style={{ width: '200px' }}>THANH TOÁN</th>
                <th style={{ width: '200px' }}>TRẠNG THÁI</th>
                <th style={{ width: '120px' }} className="text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const status = getStatusConfig(order.status);
                const isPaid = order.paymentStatus === 'Paid';
                const isRefunded = order.paymentStatus === 'Refunded';
                
                return (
                  <tr key={order.id}>
                    <td><span className="order-id-badge">#GT-{order.id}</span></td>
                    <td>
                      <div className="user-info-cell">
                        <div className="u-avatar">{(order.userFullName || 'G').charAt(0).toUpperCase()}</div>
                        <div className="u-details">
                          <span className="u-name">{order.userFullName || 'Khách vãng lai'}</span>
                          <span className="u-mail">{order.userEmail}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="time-cell">
                        <Calendar size={14} />
                        {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td><span className="price-text">{formatPrice(order.totalAmount)}</span></td>
                    <td>
                      <div className="status-col">
                        <select 
                          className="quick-status-select-modern"
                          value={order.paymentStatus}
                          onChange={(e) => handlePaymentStatusChange(order.id, e.target.value)}
                          style={{ 
                            background: isPaid ? '#dcfce7' : isRefunded ? '#fee2e2' : '#f1f5f9',
                            color: isPaid ? '#166534' : isRefunded ? '#991b1b' : '#475569'
                          }}
                        >
                          <option value="Unpaid">Chờ thanh toán</option>
                          <option value="Paid">Đã thanh toán</option>
                          <option value="Refunded">Hoàn tiền</option>
                        </select>
                        <span className="sub-text">{order.paymentMethod}</span>
                      </div>
                    </td>
                    <td>
                      <select 
                        className="quick-status-select-modern"
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        style={{ background: status.bg, color: status.color }}
                      >
                        <option value="Pending">Chờ xác nhận</option>
                        <option value="Confirmed">Đã xác nhận</option>
                        <option value="Processing">Đang xử lý</option>
                        <option value="Shipping">Đang giao hàng</option>
                        <option value="Delivered">Đã hoàn thành</option>
                        <option value="Cancelled">Đã hủy đơn</option>
                      </select>
                    </td>
                    <td className="text-right">
                      <div className="action-btns">
                        <button className="a-btn view" onClick={() => handleViewDetail(order.id)}><Eye size={18} /></button>
                        <button className="a-btn delete" onClick={() => handleDeleteOrder(order.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mobile-only orders-stack">
            {orders.map((order) => {
              const status = getStatusConfig(order.status);
              return (
                <div key={order.id} className="order-card-m">
                  <div className="oc-header" onClick={() => handleViewDetail(order.id)}>
                    <span className="oc-id">#GT-{order.id}</span>
                    <span className="oc-price">{formatPrice(order.totalAmount)}</span>
                  </div>
                  <div className="oc-body">
                    <div className="oc-user">
                      <div className="oc-avatar">{(order.userFullName || 'G').charAt(0).toUpperCase()}</div>
                      <div className="oc-meta">
                        <span className="oc-name">{order.userFullName || 'Khách vãng lai'}</span>
                        <span className="oc-email">{order.userEmail}</span>
                      </div>
                    </div>
                    <div className="oc-statuses">
                       <select 
                         value={order.status}
                         onChange={(e) => handleStatusChange(order.id, e.target.value)}
                         style={{ background: status.bg, color: status.color }}
                       >
                         <option value="Pending">Chờ xác nhận</option>
                         <option value="Confirmed">Xác nhận</option>
                         <option value="Processing">Xử lý</option>
                         <option value="Shipping">Giao hàng</option>
                         <option value="Delivered">Hoàn thành</option>
                         <option value="Cancelled">Hủy</option>
                       </select>
                       <select 
                         value={order.paymentStatus}
                         onChange={(e) => handlePaymentStatusChange(order.id, e.target.value)}
                         className="m-pay-sel"
                         style={{ 
                            background: order.paymentStatus === 'Paid' ? '#dcfce7' : '#f1f5f9',
                            color: order.paymentStatus === 'Paid' ? '#166534' : '#475569'
                         }}
                       >
                         <option value="Unpaid">Chờ TT</option>
                         <option value="Paid">Đã TT</option>
                         <option value="Refunded">Hoàn tiền</option>
                       </select>
                    </div>
                    <button className="oc-detail-btn" onClick={() => handleViewDetail(order.id)}>Xem chi tiết</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="admin-pagination">
            <div className="page-info">Trang {currentPage} / {totalPages}</div>
            <div className="pagination-controls">
              <button
                className="p-btn"
                disabled={currentPage === 1}
                onClick={() => fetchOrders(currentPage - 1)}
              >
                <ChevronLeft size={18} />
              </button>
              {renderPagination()}
              <button
                className="p-btn"
                disabled={currentPage === totalPages}
                onClick={() => fetchOrders(currentPage + 1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal - Matching AdminProducts Style */}
      {selectedOrder && createPortal(
        <div className="detail-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="detail-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header-pd">
              <h3 style={{ fontWeight: 900, fontSize: '1.4rem' }}>Chi tiết đơn hàng #GT-{selectedOrder.id}</h3>
              <button onClick={() => setSelectedOrder(null)} className="m-close-btn-pd">
                <X size={24} color="#64748b" />
              </button>
            </div>

            <div className="modal-tabs">
              <div className={`modal-tab ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>THÔNG TIN CHUNG</div>
              <div className={`modal-tab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>SẢN PHẨM ({selectedOrder.items?.length || 0})</div>
              <div className={`modal-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>LỊCH SỬ ĐƠN HÀNG</div>
            </div>

            <div className="modal-body-pd">
              {detailLoading ? (
                 <div style={{ textAlign: 'center', padding: '60px' }}><div className="loader"></div><p style={{ marginTop: '20px', fontWeight: 700, color: '#64748b' }}>Đang tải dữ liệu chi tiết...</p></div>
              ) : (
                <>
                {activeTab === 'info' && (
                  <div className="pd-grid">
                    <div className="pd-image-section">
                       <div className="info-card-m">
                          <span className="pd-label-tag"><User size={14} /> TÀI KHOẢN ĐẶT HÀNG</span>
                          <div className="u-profile-m">
                             <div className="u-avatar-lg">{(selectedOrder.userFullName || 'G').charAt(0).toUpperCase()}</div>
                             <div className="u-meta-lg">
                                <span className="u-name-lg">{selectedOrder.userFullName || 'Khách vãng lai'}</span>
                                <span className="u-mail-lg">{selectedOrder.userEmail}</span>
                             </div>
                          </div>
                       </div>

                       <div className="info-card-m mt-24">
                          <span className="pd-label-tag"><MapPin size={14} /> THÔNG TIN GIAO HÀNG</span>
                          <div className="shipping-info-box">
                             <div className="s-row"><strong>Người nhận:</strong> <span>{selectedOrder.receiverName || selectedOrder.userFullName}</span></div>
                             <div className="s-row"><strong>Điện thoại:</strong> <span style={{ color: '#2563eb', fontWeight: 800 }}>{selectedOrder.phone || 'Chưa cập nhật'}</span></div>
                             <div className="s-row"><strong>Địa chỉ:</strong> <span>{selectedOrder.shippingAddress}</span></div>
                          </div>
                          {selectedOrder.note && (
                            <div className="note-p-m">
                              <span className="pd-label-tag" style={{ color: '#d97706', marginBottom: '8px' }}>GHI CHÚ</span>
                              <p>{selectedOrder.note}</p>
                            </div>
                          )}
                       </div>
                    </div>

                    <div className="pd-info-section">
                      <div className="tech-stats-grid">
                         <div className="t-stat">
                            <span className="pd-label-tag">TỔNG THANH TOÁN</span>
                            <span className="pd-value-text" style={{ fontSize: '1.8rem', color: '#0f172a' }}>{formatPrice(selectedOrder.totalAmount)}</span>
                         </div>
                         <div className="t-stat">
                            <span className="pd-label-tag">PHƯƠNG THỨC</span>
                            <span className="method-pill">{selectedOrder.paymentMethod}</span>
                         </div>
                      </div>

                      <div className="status-management-m">
                         <div className="sm-item">
                            <span className="pd-label-tag">TRẠNG THÁI THANH TOÁN</span>
                            <select 
                              className="pay-status-sel-lg"
                              value={selectedOrder.paymentStatus}
                              onChange={(e) => handlePaymentStatusChange(selectedOrder.id, e.target.value)}
                            >
                              <option value="Unpaid">CHỜ THANH TOÁN</option>
                              <option value="Paid">ĐÃ THANH TOÁN</option>
                              <option value="Refunded">ĐÃ HOÀN TIỀN</option>
                            </select>
                         </div>
                         <div className="sm-item">
                            <span className="pd-label-tag">TRẠNG THÁI ĐƠN HÀNG</span>
                            <select 
                              className="order-status-sel-lg"
                              value={selectedOrder.status}
                              onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                            >
                              <option value="Pending">CHỜ XÁC NHẬN</option>
                              <option value="Confirmed">ĐÃ XÁC NHẬN</option>
                              <option value="Processing">ĐANG XỬ LÝ</option>
                              <option value="Shipping">ĐANG GIAO HÀNG</option>
                              <option value="Delivered">ĐÃ HOÀN THÀNH</option>
                              <option value="Cancelled">ĐÃ HỦY ĐƠN</option>
                            </select>
                         </div>
                      </div>

                      <div className="bill-detail-m">
                         <div className="b-row"><span>Tạm tính</span><span>{formatPrice(selectedOrder.totalAmount - selectedOrder.shippingFee + selectedOrder.discountAmount)}</span></div>
                         <div className="b-row"><span>Phí vận chuyển</span><span>{formatPrice(selectedOrder.shippingFee)}</span></div>
                         {selectedOrder.discountAmount > 0 && <div className="b-row discount"><span>Giảm giá</span><span>-{formatPrice(selectedOrder.discountAmount)}</span></div>}
                         <div className="b-total"><span>TỔNG CỘNG</span><span>{formatPrice(selectedOrder.totalAmount)}</span></div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'products' && (
                  <div className="pd-items-view animate-fade">
                     <div className="hide-mobile">
                       <table className="variant-summary-table">
                          <thead>
                             <tr>
                                <th>SẢN PHẨM</th>
                                <th>SIZE</th>
                                <th>ĐƠN GIÁ</th>
                                <th>SỐ LƯỢNG</th>
                                <th className="text-right">THÀNH TIỀN</th>
                             </tr>
                          </thead>
                          <tbody>
                             {selectedOrder.items && selectedOrder.items.length > 0 ? selectedOrder.items.map((item, idx) => (
                               <tr key={idx}>
                                  <td>
                                     <div className="p-cell-lg">
                                        <img src={item.productImage || 'https://via.placeholder.com/60'} alt="" />
                                        <span>{item.productName}</span>
                                     </div>
                                  </td>
                                  <td><span className="size-badge">{item.size}</span></td>
                                  <td>{formatPrice(item.unitPrice)}</td>
                                  <td><span className="qty-badge">x{item.quantity}</span></td>
                                  <td className="text-right" style={{ fontWeight: 800 }}>{formatPrice(item.unitPrice * item.quantity)}</td>
                               </tr>
                             )) : (
                               <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Không có dữ liệu sản phẩm.</td></tr>
                             )}
                          </tbody>
                       </table>
                     </div>

                     <div className="show-mobile">
                        {selectedOrder.items && selectedOrder.items.length > 0 ? selectedOrder.items.map((item, idx) => (
                           <div key={idx} className="order-item-card-m">
                              <div className="o-item-img">
                                 <img src={item.productImage || 'https://via.placeholder.com/60'} alt="" />
                              </div>
                              <div className="o-item-info">
                                 <div className="o-item-name">{item.productName}</div>
                                 <div className="o-item-meta">
                                    <span className="size-badge">{item.size}</span>
                                    <span className="qty-badge">x{item.quantity}</span>
                                 </div>
                                 <div className="o-item-price">
                                    <span className="unit-p">{formatPrice(item.unitPrice)}</span>
                                    <span className="total-p">{formatPrice(item.unitPrice * item.quantity)}</span>
                                 </div>
                              </div>
                           </div>
                        )) : (
                           <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Không có dữ liệu sản phẩm.</div>
                        )}
                     </div>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="pd-history-view animate-fade">
                     <div className="timeline-m-v2">
                        {selectedOrder.timeline && selectedOrder.timeline.length > 0 ? selectedOrder.timeline.map((event, idx) => (
                          <div key={idx} className="t-step">
                             <div className="t-marker"></div>
                             <div className="t-content">
                                <div className="t-header">
                                   <span className="t-st">{event.status}</span>
                                   <span className="t-time">{new Date(event.createdAt).toLocaleString('vi-VN')}</span>
                                </div>
                                <p className="t-note">{event.note || 'Cập nhật trạng thái hệ thống'}</p>
                             </div>
                          </div>
                        )) : (
                          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Chưa có lịch sử cập nhật.</div>
                        )}
                     </div>
                  </div>
                )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-orders-page { padding: 40px; background: #f8fafc; min-height: 100vh; font-family: 'Inter', sans-serif; }
        .loader-container { display: flex; height: 300px; align-items: center; justify-content: center; width: 100%; }
        
        .admin-page-header { margin-bottom: 32px; }
        .admin-page-header .title { font-size: 2.2rem; font-weight: 800; color: #0f172a; margin-bottom: 8px; letter-spacing: -0.03em; }
        .admin-page-header .subtitle { color: #64748b; font-size: 1rem; font-weight: 500; }
        
        .stat-pill { background: white; padding: 12px 24px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .s-label { font-size: 0.65rem; font-weight: 800; color: #94a3b8; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }
        .s-value { font-size: 1.5rem; font-weight: 900; color: #0f172a; }

        .filters-container { background: white; border-radius: 24px; border: 1px solid #e2e8f0; margin-bottom: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); }
        .filters-bar { padding: 20px 24px; display: flex; gap: 20px; align-items: center; border-bottom: 1px solid #f1f5f9; }
        .search-box { position: relative; flex: 1; min-width: 300px; }
        .search-box input { width: 100%; padding: 12px 16px 12px 48px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 0.95rem; font-weight: 600; transition: all 0.2s; background: #f8fafc; }
        .search-box input:focus { border-color: #0f172a; outline: none; background: white; }
        .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        
        .filter-actions { display: flex; gap: 12px; }
        .advanced-toggle { display: flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 12px; border: 1px solid #e2e8f0; background: white; font-size: 0.9rem; font-weight: 700; color: #475569; cursor: pointer; transition: all 0.2s; position: relative; }
        .advanced-toggle.active { background: #0f172a; color: white; border-color: #0f172a; }
        .filter-dot { position: absolute; top: -4px; right: -4px; width: 10px; height: 10px; background: #ef4444; border-radius: 50%; border: 2px solid white; }
        
        .sort-select { padding: 12px 16px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 0.9rem; font-weight: 700; color: #0f172a; background: white; cursor: pointer; display: flex; align-items: center; gap: 8px; }

        .advanced-filters-panel { padding: 24px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; animation: slideDown 0.3s ease; }
        .filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; }
        .filter-item label { display: block; font-size: 0.7rem; font-weight: 800; color: #94a3b8; margin-bottom: 8px; letter-spacing: 0.05em; }
        .filter-item select, .filter-item input { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 0.9rem; font-weight: 600; background: white; outline: none; }
        .panel-footer { margin-top: 24px; display: flex; justify-content: flex-end; }
        .clear-all-btn { background: none; border: none; font-size: 0.85rem; font-weight: 800; color: #ef4444; cursor: pointer; padding: 4px 8px; border-radius: 6px; }

        .admin-table-wrapper { background: white; border-radius: 28px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .admin-modern-table { width: 100%; border-collapse: collapse; }
        .admin-modern-table th { padding: 20px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
        .admin-modern-table td { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        
        .order-id-badge { font-weight: 900; color: #2563eb; background: #eff6ff; padding: 6px 12px; border-radius: 10px; font-size: 0.8rem; }
        .user-info-cell { display: flex; align-items: center; gap: 14px; }
        .u-avatar { width: 40px; height: 40px; border-radius: 12px; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; }
        .u-name { display: block; font-weight: 700; font-size: 0.95rem; color: #0f172a; margin-bottom: 2px; }
        .u-mail { display: block; font-size: 0.75rem; color: #94a3b8; font-weight: 500; }
        
        .price-text { font-weight: 900; color: #0f172a; font-size: 1rem; }
        .status-col { display: flex; flex-direction: column; gap: 4px; }
        .quick-status-select-modern { border: none; padding: 10px 16px; border-radius: 12px; font-size: 0.75rem; font-weight: 900; text-transform: uppercase; cursor: pointer; outline: none; width: fit-content; min-width: 150px; transition: all 0.2s; }
        .sub-text { font-size: 0.65rem; font-weight: 800; color: #94a3b8; padding-left: 4px; text-transform: uppercase; }

        .action-btns { display: flex; gap: 10px; justify-content: flex-end; }
        .a-btn { width: 40px; height: 40px; border-radius: 14px; border: 1.5px solid #e2e8f0; background: white; color: #64748b; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .a-btn:hover { border-color: #0f172a; color: #0f172a; transform: translateY(-2px); }
        .a-btn.delete:hover { border-color: #ef4444; color: #ef4444; }

        /* Detail Modal Styles - REPLICATING ADMINPRODUCTS */
        .detail-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 9999; padding: 20px; animation: fadeIn 0.3s; }
        .detail-modal-content { background: white; width: 100%; max-width: 1000px; max-height: 90vh; border-radius: 32px; overflow: hidden; display: flex; flex-direction: column; position: relative; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .modal-header-pd { padding: 24px 32px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: white; }
        .m-close-btn-pd { background: #f1f5f9; border: none; border-radius: 50%; padding: 8px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .m-close-btn-pd:hover { background: #fee2e2; transform: rotate(90deg); }

        .modal-tabs { display: flex; gap: 4px; padding: 0 32px; background: white; border-bottom: 1px solid #f1f5f9; }
        .modal-tab { padding: 16px 24px; font-size: 0.85rem; font-weight: 800; color: #64748b; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s; text-transform: uppercase; }
        .modal-tab.active { color: #0f172a; border-bottom-color: #0f172a; }
        .modal-tab:hover:not(.active) { color: #0f172a; background: #f8fafc; }

        .modal-body-pd { padding: 32px; overflow-y: auto; flex: 1; }
        .pd-grid { display: grid; grid-template-columns: 350px 1fr; gap: 40px; }
        
        .info-card-m { background: #f8fafc; padding: 24px; border-radius: 24px; border: 1px solid #e2e8f0; }
        .pd-label-tag { font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        
        .u-profile-m { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
        .u-avatar-lg { width: 64px; height: 64px; border-radius: 20px; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.5rem; }
        .u-name-lg { display: block; font-size: 1.2rem; font-weight: 800; color: #0f172a; }
        .u-mail-lg { font-size: 0.9rem; color: #64748b; font-weight: 500; }
        
        .shipping-info-box { display: flex; flex-direction: column; gap: 12px; }
        .s-row { font-size: 0.95rem; color: #1e293b; line-height: 1.4; display: flex; gap: 8px; }
        .s-row strong { color: #64748b; font-weight: 800; font-size: 0.75rem; text-transform: uppercase; min-width: 90px; }
        
        .note-p-m { margin-top: 20px; background: #fff; padding: 16px; border-radius: 16px; border: 1px solid #fef3c7; }
        .note-p-m p { margin: 0; font-size: 0.9rem; color: #d97706; font-weight: 600; }

        .tech-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
        .t-stat { background: white; border: 1px solid #e2e8f0; padding: 20px; border-radius: 20px; }
        .method-pill { background: #0f172a; color: white; padding: 4px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 800; }

        .status-management-m { display: grid; gap: 24px; margin-bottom: 32px; }
        .sm-item select { width: 100%; padding: 12px 16px; border-radius: 14px; border: 2px solid #e2e8f0; font-size: 0.9rem; font-weight: 800; outline: none; background: white; transition: border-color 0.2s; }
        .sm-item select:focus { border-color: #0f172a; }

        .bill-detail-m { background: #f8fafc; padding: 24px; border-radius: 24px; border: 1px solid #e2e8f0; }
        .b-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.95rem; font-weight: 700; color: #64748b; }
        .b-row.discount span:last-child { color: #ef4444; }
        .b-total { display: flex; justify-content: space-between; align-items: center; border-top: 2px dashed #e2e8f0; margin-top: 16px; padding-top: 16px; }
        .b-total span:first-child { font-weight: 900; color: #0f172a; font-size: 1.1rem; }
        .b-total span:last-child { font-size: 1.8rem; font-weight: 900; color: #0f172a; }

        .variant-summary-table { width: 100%; border-collapse: collapse; border: 1px solid #f1f5f9; border-radius: 16px; overflow: hidden; }
        .variant-summary-table th { background: #f8fafc; padding: 16px; text-align: left; font-size: 0.75rem; font-weight: 800; color: #64748b; }
        .variant-summary-table td { padding: 16px; border-top: 1px solid #f1f5f9; font-size: 0.95rem; font-weight: 600; }
        .p-cell-lg { display: flex; align-items: center; gap: 16px; }
        .p-cell-lg img { width: 60px; height: 80px; object-fit: cover; border-radius: 12px; border: 1px solid #f1f5f9; }
        .size-badge { background: #f1f5f9; padding: 4px 12px; border-radius: 8px; font-weight: 800; font-size: 0.85rem; }
        .qty-badge { font-weight: 900; color: #0f172a; font-size: 1rem; }

        .timeline-m-v2 { position: relative; padding-left: 24px; border-left: 3px solid #f1f5f9; }
        .t-step { position: relative; margin-bottom: 40px; }
        .t-marker { position: absolute; left: -34px; top: 6px; width: 16px; height: 16px; border-radius: 50%; background: #0f172a; border: 4px solid white; }
        .t-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .t-st { font-size: 1rem; font-weight: 900; color: #0f172a; }
        .t-time { font-size: 0.8rem; color: #94a3b8; font-weight: 700; }
        .t-note { font-size: 0.95rem; color: #475569; line-height: 1.6; margin: 0; }

        .admin-pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding: 16px 24px; }
        .page-info { font-size: 0.9rem; font-weight: 700; color: #64748b; }
        .pagination-controls { display: flex; gap: 8px; }
        .p-btn { padding: 10px 20px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: white; font-size: 0.85rem; font-weight: 800; cursor: pointer; transition: all 0.2s; }
        .p-btn.active { background: #0f172a; color: white; border-color: #0f172a; }
        .p-dots { display: flex; align-items: center; justify-content: center; width: 32px; color: #94a3b8; font-weight: 800; }

        .animate-fade { animation: fadeIn 0.4s ease; }
        @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .show-mobile { display: none; }
        .hide-mobile { display: block; }

        @media (max-width: 1024px) {
          .show-mobile { display: block; }
          .hide-mobile { display: none; }
          .admin-orders-page { padding: 15px; }
          .pc-view { display: none; }
          .mobile-only { display: block; }
          .admin-page-header .header-flex { flex-direction: column; align-items: center; gap: 20px; text-align: center; }
          .filters-bar { flex-direction: column; align-items: stretch; gap: 12px; padding: 15px; }
          .filter-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .filter-actions > select.sort-select { grid-column: span 2; height: 48px; font-size: 0.9rem; padding: 0 16px; border-radius: 12px; flex-direction: row; }
          .advanced-toggle, button.sort-select { width: 100%; justify-content: center; height: 64px; font-size: 0.8rem; text-align: center; flex-direction: column; gap: 6px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
          .advanced-toggle svg, button.sort-select svg { width: 18px; height: 18px; }
          
          .order-card-m { background: white; border-radius: 24px; margin-bottom: 20px; border: 1px solid #e2e8f0; overflow: hidden; }
          .oc-header { padding: 16px 20px; background: #f8fafc; display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; }
          .oc-id { font-weight: 900; color: #2563eb; }
          .oc-price { font-weight: 900; color: #0f172a; }
          .oc-body { padding: 20px; }
          .oc-user { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
          .oc-avatar { width: 44px; height: 44px; background: #0f172a; color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; }
          .oc-name { display: block; font-weight: 800; font-size: 0.95rem; }
          .oc-email { font-size: 0.75rem; color: #94a3b8; }
          .oc-statuses { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
          .oc-statuses select { padding: 12px; border-radius: 12px; font-size: 11px; font-weight: 900; text-transform: uppercase; border: none; }
          .oc-detail-btn { width: 100%; padding: 14px; background: #0f172a; color: white; border: none; border-radius: 16px; font-weight: 800; }
          
          .pd-grid { grid-template-columns: 1fr; gap: 24px; }
          .detail-modal-content { border-radius: 28px; max-height: 95vh; }
          .modal-header-pd { padding: 20px 24px; }
          .modal-tabs { padding: 0 24px; }
          .modal-tab { padding: 12px 16px; font-size: 0.75rem; }
          .modal-body-pd { padding: 20px; }
          .u-avatar-lg { width: 50px; height: 50px; font-size: 1.2rem; }
          .b-total span:last-child { font-size: 1.4rem; }
          .admin-pagination { flex-direction: column; gap: 12px; align-items: center; padding: 12px; }
          .pagination-controls { gap: 4px; }
          .p-btn { padding: 0; width: 36px; height: 36px; font-size: 0.8rem; border-radius: 8px; }
          .p-dots { width: 24px; font-size: 0.8rem; }
          
          .order-item-card-m { display: flex; gap: 12px; padding: 12px; background: #f8fafc; border-radius: 20px; margin-bottom: 12px; border: 1px solid #f1f5f9; }
          .o-item-img img { width: 64px; height: 80px; }
          .o-item-info { flex: 1; }
          .o-item-name { font-size: 0.8rem; color: #0f172a; line-height: 1.4; margin-bottom: 8px; }
          .o-item-meta { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
          .o-item-price { display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #e2e8f0; padding-top: 8px; margin-top: 4px; }
          .unit-p { font-size: 0.7rem; color: #94a3b8; font-weight: 700; }
          .total-p { font-size: 0.9rem; font-weight: 900; color: #0f172a; }
        }
      `}} />
    </div>
  );
};

export default AdminOrders;
