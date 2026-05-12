import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderService } from '../services/orderService';
import settingsService from '../services/settingsService';
import { ChevronLeft, Package, MapPin, CreditCard, Clock, CheckCircle, Truck, XCircle, QrCode } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function OrderDetailPage() {
  const { id } = useParams();
  const { addToast } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await orderService.getOrderDetails(id);
        setOrder(data);
      } catch (error) {
        addToast('Không thể tải chi tiết đơn hàng', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  useEffect(() => {
    const fetchQr = async () => {
      try {
        const pubSettings = await settingsService.getPublicSettings();
        setQrCodeUrl(pubSettings.PaymentQRCodeUrl || '');
      } catch (e) { /* ignore */ }
    };
    fetchQr();
  }, []);

  const formatPrice = (price) => {
    if (price === null || price === undefined || isNaN(price)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return <Clock size={20} className="text-warning" />;
      case 'confirmed': return <CheckCircle size={20} className="text-primary" />;
      case 'processing': return <Package size={20} className="text-info" />;
      case 'shipping': return <Truck size={20} className="text-info" />;
      case 'delivered': return <CheckCircle size={20} className="text-success" />;
      case 'cancelled': return <XCircle size={20} className="text-danger" />;
      default: return <Clock size={20} />;
    }
  };

  if (loading) return <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>Đang tải...</div>;
  if (!order) return <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>Không tìm thấy đơn hàng.</div>;

  return (
    <div className="order-detail-page animate-up">
      <div className="container">
        <div className="detail-header">
          <Link to="/account" className="back-link">
            <ChevronLeft size={20} /> Quay lại Tài khoản
          </Link>
          <div className="header-main">
            <h1 className="page-title">Chi tiết đơn hàng #{order.id}</h1>
            <div className={`status-badge ${order.status?.toLowerCase()}`}>
              {getStatusIcon(order.status)}
              <span>{order.status?.toUpperCase()}</span>
            </div>
          </div>
          <p className="order-date">Ngày đặt: {new Date(order.createdAt).toLocaleString('vi-VN')}</p>
        </div>

        <div className="order-grid">
          <div className="main-info">
            {/* Items List */}
            <div className="detail-card">
              <h3 className="card-title"><Package size={18} /> Sản phẩm đã đặt</h3>
              <div className="order-items-list">
                {order.items.map((item, idx) => (
                  <div key={idx} className="detail-item-row">
                    <div className="item-img">
                      <img src={item.productImage || 'https://via.placeholder.com/100'} alt={item.productName} />
                    </div>
                    <div className="item-info">
                      <h4 className="item-name">{item.productName}</h4>
                      <div className="item-meta">
                        <span>Size: <strong>{item.size}</strong></span>
                        <span className="sep">|</span>
                        <span>Màu: <strong>{item.color}</strong></span>
                      </div>
                      <div className="item-pricing">
                        <span className="unit-price">{formatPrice(item.unitPrice)}</span>
                        <span className="qty">x {item.quantity}</span>
                      </div>
                    </div>
                    <div className="item-subtotal">
                      {formatPrice(item.subtotal)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Note */}
            {order.note && (
              <div className="detail-card mt-20">
                <h3 className="card-title">Ghi chú</h3>
                <p className="order-note-text">{order.note}</p>
              </div>
            )}
          </div>

          <div className="sidebar-info">
            {/* Summary */}
            <div className="detail-card summary-card">
              <h3 className="card-title">Tóm tắt đơn hàng</h3>
              <div className="summary-rows">
                <div className="summary-row">
                  <span>Tạm tính</span>
                  <span>{formatPrice(order.items.reduce((sum, i) => sum + i.subtotal, 0))}</span>
                </div>
                <div className="summary-row">
                  <span>Phí vận chuyển</span>
                  <span>{order.shippingFee > 0 ? formatPrice(order.shippingFee) : 'Miễn phí'}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="summary-row discount">
                    <span>Giảm giá</span>
                    <span>-{formatPrice(order.discountAmount)}</span>
                  </div>
                )}
                <div className="summary-row total">
                  <span>Tổng cộng</span>
                  <span className="total-val">{formatPrice(order.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Delivery & Payment */}
            <div className="detail-card mt-20">
              <h3 className="card-title"><MapPin size={18} /> Thông tin giao hàng</h3>
              <div className="info-content">
                <p className="info-label">Người nhận:</p>
                <p className="info-val">{order.receiverName || order.userFullName || 'Khách hàng'}</p>
                <p className="info-label mt-10">Địa chỉ:</p>
                <p className="info-val">{order.shippingAddress}</p>
                <p className="info-label mt-10">Số điện thoại:</p>
                <p className="info-val">{order.phone || 'Chưa cập nhật'}</p>
              </div>
            </div>

            <div className="detail-card mt-20">
              <h3 className="card-title"><CreditCard size={18} /> Thanh toán</h3>
              <div className="info-content">
                <p className="info-val">{order.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : order.paymentMethod === 'BankTransfer' ? 'Chuyển khoản ngân hàng' : order.paymentMethod}</p>
                <div className={`payment-status-tag ${order.paymentStatus?.toLowerCase() === 'paid' ? 'paid' : 'unpaid'}`}>
                  {order.paymentStatus?.toLowerCase() === 'paid' ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}
                </div>
                {order.paymentMethod === 'BankTransfer' && order.paymentStatus?.toLowerCase() !== 'paid' && qrCodeUrl && (
                  <div className="qr-order-display">
                    <div className="qr-order-img">
                      <img src={qrCodeUrl} alt="QR Thanh toán" />
                    </div>
                    <div className="qr-order-hint">
                      <QrCode size={16} />
                      <p>Quét QR để thanh toán đơn hàng.<br /><strong>Nội dung CK:</strong> Tên + SĐT của bạn.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .order-detail-page { padding: 40px 0 80px; background: #f8fafc; min-height: 100vh; }
        .detail-header { margin-bottom: 30px; }
        .back-link { display: flex; align-items: center; gap: 4px; font-size: 0.9rem; font-weight: 500; color: #64748b; margin-bottom: 20px; text-decoration: none; transition: color 0.2s; }
        .back-link:hover { color: #0f172a; }
        
        .header-main { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .page-title { font-size: 1.8rem; font-weight: 600; color: #0f172a; margin: 0; }
        .order-date { color: #64748b; font-size: 0.9rem; font-weight: 400; margin: 0; }

        .status-badge { display: flex; align-items: center; gap: 6px; padding: 6px 16px; border-radius: 100px; font-weight: 600; font-size: 0.85rem; background: #f1f5f9; color: #475569; }
        .status-badge.pending { background: #fefce8; color: #ca8a04; }
        .status-badge.delivered { background: #f0fdf4; color: #16a34a; }
        .status-badge.processing, .status-badge.shipping { background: #eff6ff; color: #2563eb; }
        .status-badge.cancelled { background: #fef2f2; color: #dc2626; }

        .order-grid { display: grid; grid-template-columns: 1fr 380px; gap: 30px; }
        
        .detail-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); padding: 24px; }
        .card-title { display: flex; align-items: center; gap: 10px; font-size: 1.1rem; font-weight: 600; color: #0f172a; margin: 0 0 20px 0; padding-bottom: 15px; border-bottom: 1px solid #f1f5f9; }
        
        .detail-item-row { display: flex; align-items: center; gap: 20px; padding: 15px 0; border-bottom: 1px solid #f1f5f9; }
        .detail-item-row:last-child { border-bottom: none; padding-bottom: 0; }
        .item-img { width: 80px; height: 100px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
        .item-img img { width: 100%; height: 100%; object-fit: cover; }
        
        .item-info { flex: 1; }
        .item-name { font-size: 1rem; font-weight: 500; color: #0f172a; margin: 0 0 5px 0; }
        .item-meta { font-size: 0.85rem; color: #64748b; margin-bottom: 8px; }
        .item-meta strong { color: #0f172a; font-weight: 500; }
        .sep { margin: 0 8px; color: #cbd5e1; }
        
        .item-pricing { font-size: 0.9rem; }
        .unit-price { font-weight: 500; color: #0f172a; }
        .qty { color: #64748b; margin-left: 8px; }
        .item-subtotal { font-weight: 600; font-size: 1.05rem; color: #0f172a; }

        .summary-rows { display: flex; flex-direction: column; gap: 12px; }
        .summary-row { display: flex; justify-content: space-between; font-weight: 500; color: #475569; }
        .summary-row.total { margin-top: 15px; padding-top: 15px; border-top: 1px dashed #cbd5e1; color: #0f172a; font-size: 1.2rem; font-weight: 600; }
        .total-val { color: #0f172a; }
        .discount { color: #ef4444; }

        .info-label { font-size: 0.8rem; font-weight: 500; color: #64748b; margin-bottom: 4px; }
        .info-val { font-size: 0.95rem; font-weight: 500; line-height: 1.5; color: #0f172a; margin: 0; }
        
        .payment-status-tag { display: inline-block; margin-top: 12px; font-size: 0.75rem; font-weight: 600; padding: 6px 12px; border-radius: 6px; }
        .payment-status-tag.paid { background: #dcfce7; color: #166534; }
        .payment-status-tag.unpaid { background: #fee2e2; color: #991b1b; }

        /* QR in Order Detail */
        .qr-order-display { margin-top: 16px; padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
        .qr-order-img { width: 200px; border-radius: 14px; overflow: hidden; border: 2px solid #e2e8f0; background: white; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .qr-order-img img { width: 100%; height: auto; display: block; }
        .qr-order-hint { display: flex; align-items: flex-start; gap: 8px; color: #475569; }
        .qr-order-hint p { font-size: 0.8rem; line-height: 1.5; margin: 0; }

        .order-note-text { color: #475569; line-height: 1.5; margin: 0; }

        .mt-10 { margin-top: 10px; }
        .mt-20 { margin-top: 20px; }
        
        @media (max-width: 992px) {
          .order-grid { grid-template-columns: 1fr; }
        }
      `}} />
    </div>
  );
}
