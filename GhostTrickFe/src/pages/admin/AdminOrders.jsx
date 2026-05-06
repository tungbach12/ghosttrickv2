import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const { addToast } = useToast();

  const getStatusBg = (status) => {
    switch (status) {
      case 'Delivered': return '#dcfce7';
      case 'Cancelled': case 'Failed': return '#fee2e2';
      case 'Confirmed': case 'Processing': return '#e0f2fe';
      case 'Shipping': return '#fef9c3';
      case 'Refunded': return '#f3e8ff';
      default: return '#f1f5f9';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered': return '#166534';
      case 'Cancelled': case 'Failed': return '#991b1b';
      case 'Confirmed': case 'Processing': return '#0369a1';
      case 'Shipping': return '#854d0e';
      case 'Refunded': return '#6b21a8';
      default: return '#475569';
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders/all');
      setOrders(response.data);
    } catch (error) {
      addToast('Không thể tải danh sách đơn hàng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      fetchOrders(); 
      addToast(`Đã cập nhật trạng thái đơn hàng #${orderId}`, 'success');
    } catch (error) {
      addToast('Không thể cập nhật trạng thái đơn hàng', 'error');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '200px', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loader"></div>
    </div>
  );

  return (
    <>
      <div className="admin-header-flex">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>Quản lý Đơn hàng</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Theo dõi và cập nhật trạng thái đơn hàng.</p>
        </div>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Mã ĐH</th>
              <th>Ngày đặt</th>
              <th>Tổng tiền</th>
              <th>Thanh toán</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <React.Fragment key={order.id}>
                <tr>
                  <td style={{ fontWeight: '700', color: '#3b82f6' }}>#GT-{order.id}</td>
                  <td style={{ color: '#64748b' }}>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td style={{ fontWeight: '800', color: '#0f172a' }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{order.paymentMethod}</span>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: '700',
                        color: order.paymentStatus === 'Paid' ? '#166534' : '#94a3b8'
                      }}>
                        {order.paymentStatus === 'Paid' ? '● Đã thanh toán' : '○ Chưa thanh toán'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="status-select"
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        background: getStatusBg(order.status),
                        color: getStatusColor(order.status)
                      }}
                    >
                      <option value="Pending">Chờ xác nhận</option>
                      <option value="Confirmed">Đã xác nhận</option>
                      <option value="Processing">Đang xử lý</option>
                      <option value="Shipping">Đang giao</option>
                      <option value="Delivered">Đã giao</option>
                      <option value="Cancelled">Đã hủy</option>
                      <option value="Refunded">Đã hoàn tiền</option>
                      <option value="Failed">Thất bại</option>
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                        className="admin-btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem', background: expandedOrder === order.id ? '#1e293b' : '#3b82f6' }}
                      >
                        {expandedOrder === order.id ? 'Đóng' : 'Timeline'}
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedOrder === order.id && (
                  <tr>
                    <td colSpan="6" style={{ padding: '20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: '800', marginBottom: '16px', color: '#1e293b' }}>Lịch sử đơn hàng</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {order.timeline && order.timeline.length > 0 ? order.timeline.map((t, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '12px', fontSize: '0.85rem' }}>
                              <div style={{ minWidth: '140px', color: '#64748b' }}>
                                {new Date(t.createdAt).toLocaleString('vi-VN')}
                              </div>
                              <div style={{ fontWeight: '700', color: '#0f172a', minWidth: '100px' }}>{t.status}</div>
                              <div style={{ color: '#475569' }}>{t.note}</div>
                              <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#94a3b8' }}>bởi {t.actor}</div>
                            </div>
                          )) : <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Chưa có dữ liệu timeline.</p>}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default AdminOrders;
