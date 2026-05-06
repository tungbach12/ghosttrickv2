import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useGlobalContext } from '../context/GlobalContext';
import { orderService } from '../services/orderService';
import { voucherService } from '../services/voucherService';
import { User, ShoppingBag, LogOut, ChevronRight, Camera, Ticket, Tag, Plus, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

export default function AccountPage() {
  const { user, logout } = useGlobalContext();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'vouchers'
  const [orders, setOrders] = useState([]);
  const [myVouchers, setMyVouchers] = useState([]);
  const [publicVouchers, setPublicVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (activeTab === 'orders') {
        const data = await orderService.getUserOrders();
        setOrders(data);
      } else {
        const [wallet, publics] = await Promise.all([
          voucherService.getMyWallet(),
          voucherService.getPublicVouchers()
        ]);
        setMyVouchers(wallet);
        setPublicVouchers(publics.filter(pv => !wallet.some(wv => wv.code === pv.code)));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, activeTab]);

  const handleSaveVoucher = async (code) => {
    try {
      await voucherService.saveToWallet(code);
      addToast('Đã lưu mã vào ví của bạn!', 'success');
      fetchData(); // Refresh lists
    } catch (error) {
      addToast(error.response?.data?.message || 'Không thể lưu mã', 'error');
    }
  };

  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="account-page">
      <div className="container">
        <div className="breadcrumb-bar-alt">
          <nav className="breadcrumb">
            <Link to="/"><span>Trang</span> chủ</Link>
            <ChevronRight size={14} />
            <Link to="/profile">Tài khoản</Link>
            <ChevronRight size={14} />
            <span className="breadcrumb-current">
              {activeTab === 'orders' ? 'Đơn hàng của tôi' : 'Ví Voucher'}
            </span>
          </nav>
        </div>

        <div className="account-layout">
          {/* Sidebar */}
          <div className="account-sidebar">
            <div className="account-user-card">
              <div className="account-avatar-wrapper">
                <div className="account-avatar">
                  {(user.fullName || user.name || '?').charAt(0)}
                </div>
                <button className="avatar-edit-btn">
                  <Camera size={14} />
                </button>
              </div>
              <div className="account-user-details">
                <h3 className="account-user-name">{user.fullName || user.name}</h3>
              </div>
            </div>
            
            <ul className="account-menu">
              <li>
                <Link to="/profile" className="account-menu-item">
                  <User size={18} /> Thông tin tài khoản
                </Link>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab('orders')} 
                  className={`account-menu-item ${activeTab === 'orders' ? 'active' : ''}`}
                >
                  <ShoppingBag size={18} /> Đơn hàng của tôi
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab('vouchers')} 
                  className={`account-menu-item ${activeTab === 'vouchers' ? 'active' : ''}`}
                >
                  <Ticket size={18} /> Ví Voucher
                </button>
              </li>
              <li className="menu-divider"></li>
              <li>
                <button onClick={logout} className="account-menu-item logout">
                  <LogOut size={18} /> Đăng xuất
                </button>
              </li>
            </ul>
          </div>

          {/* Main Content */}
          <div className="account-main">
            {activeTab === 'orders' ? (
              <>
                <div className="section-header">
                  <h2 className="account-section-title">Đơn hàng của tôi</h2>
                </div>

                {loading ? (
                  <div className="no-orders"><p>Đang tải đơn hàng...</p></div>
                ) : orders.length === 0 ? (
                  <div className="no-orders">
                    <ShoppingBag size={48} />
                    <p>Bạn chưa có đơn hàng nào.</p>
                    <Link to="/product" className="btn-solid mt-4">Mua sắm ngay</Link>
                  </div>
                ) : (
                  <div className="orders-list">
                    {orders.map(order => (
                      <div key={order.id} className="order-card-brutal">
                        <div className="order-header-brutal">
                          <div className="order-info-group">
                            <span className="order-id-brutal">ĐƠN HÀNG #{order.id}</span>
                            <span className="order-date-brutal">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                          <div className={`order-status-badge-brutal ${order.status?.toLowerCase()}`}>
                            {order.status?.toUpperCase()}
                          </div>
                        </div>
                        <div className="order-body-brutal">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="order-item-brutal">
                              <div className="item-img-brutal">
                                <img src={item.productImage || 'https://via.placeholder.com/100'} alt={item.productName} />
                              </div>
                              <div className="item-details-brutal">
                                <div className="item-title-brutal">{item.productName}</div>
                                <div className="item-meta-brutal">
                                  <span>Size: <strong>{item.size}</strong></span>
                                  <span className="meta-sep">|</span>
                                  <span>SL: <strong>{item.quantity}</strong></span>
                                </div>
                                <div className="item-price-brutal">{formatPrice(item.price)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="order-footer-brutal">
                          <div className="order-total-brutal">
                            <span className="total-label">TỔNG THANH TOÁN:</span>
                            <span className="total-price">{formatPrice(order.totalAmount)}</span>
                          </div>
                          <Link to={`/account/order/${order.id}`} className="view-detail-btn-brutal">
                            CHI TIẾT <ChevronRight size={16} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="section-header">
                  <h2 className="account-section-title">Ví Voucher của bạn</h2>
                  <p className="section-subtitle">Lưu trữ và quản lý các mã giảm giá dành riêng cho bạn.</p>
                </div>

                <div className="voucher-wallet-grid">
                  <div className="wallet-section">
                    <h3 className="sub-section-title">Mã đã lưu ({myVouchers.length})</h3>
                    {myVouchers.length === 0 ? (
                      <div className="empty-wallet">Bạn chưa lưu mã nào.</div>
                    ) : (
                      <div className="voucher-grid">
                        {myVouchers.map(v => (
                          <div key={v.code} className="voucher-card-ui">
                            <div className="v-card-top">
                              <Tag size={20} />
                              <span className="v-card-code">{v.code}</span>
                            </div>
                            <div className="v-card-body">
                              <div className="v-card-desc">{v.description}</div>
                              <div className="v-card-min">Đơn tối thiểu {formatPrice(v.minOrderAmount)}</div>
                            </div>
                            <div className="v-card-footer">
                               <span className="v-status saved">Đã trong ví</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="wallet-section mt-32">
                    <h3 className="sub-section-title">Có thể bạn quan tâm</h3>
                    {publicVouchers.length === 0 ? (
                      <div className="empty-wallet">Không có mã mới nào.</div>
                    ) : (
                      <div className="voucher-grid">
                        {publicVouchers.map(v => (
                          <div key={v.code} className="voucher-card-ui public">
                            <div className="v-card-top">
                              <Tag size={20} />
                              <span className="v-card-code">{v.code}</span>
                            </div>
                            <div className="v-card-body">
                              <div className="v-card-desc">{v.description}</div>
                              <div className="v-card-min">Đơn tối thiểu {formatPrice(v.minOrderAmount)}</div>
                            </div>
                            <div className="v-card-footer">
                               <button onClick={() => handleSaveVoucher(v.code)} className="save-v-btn">
                                 <Plus size={14} /> LƯU MÃ
                               </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .account-page { padding: 40px 0; background: #f8fafc; min-height: 100vh; }
        .account-layout { display: grid; grid-template-columns: 280px 1fr; gap: 32px; margin-top: 24px; }
        
        .account-sidebar { background: white; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; height: fit-content; }
        .account-user-card { display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 32px; }
        .account-avatar { width: 80px; height: 80px; background: #0f172a; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 800; margin-bottom: 16px; }
        .account-user-name { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin: 0; }
        
        .account-menu { list-style: none; padding: 0; margin: 0; }
        .account-menu-item { width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 10px; color: #64748b; font-weight: 700; text-decoration: none; border: none; background: none; cursor: pointer; transition: all 0.2s; text-align: left; }
        .account-menu-item:hover, .account-menu-item.active { background: #f1f5f9; color: #0f172a; }
        .account-menu-item.logout { color: #ef4444; margin-top: 8px; }
        .menu-divider { height: 1px; background: #f1f5f9; margin: 16px 0; }

        .account-main { background: white; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; }
        .account-section-title { font-size: 1.5rem; font-weight: 900; color: #0f172a; margin-bottom: 8px; }
        .section-subtitle { color: #64748b; font-size: 0.95rem; margin-bottom: 32px; }
        
        .voucher-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
        .voucher-card-ui { border: 2px solid #0f172a; border-radius: 16px; padding: 20px; background: white; position: relative; }
        .voucher-card-ui.public { border-style: dashed; border-color: #cbd5e1; }
        
        .v-card-top { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .v-card-code { font-weight: 900; letter-spacing: 1px; font-size: 1.1rem; }
        .v-card-desc { font-size: 0.85rem; color: #475569; font-weight: 600; margin-bottom: 4px; }
        .v-card-min { font-size: 0.75rem; color: #94a3b8; margin-bottom: 16px; }
        
        .v-card-footer { display: flex; justify-content: flex-end; border-top: 1px solid #f1f5f9; padding-top: 12px; }
        .v-status.saved { font-size: 0.75rem; font-weight: 800; color: #10b981; display: flex; align-items: center; gap: 4px; }
        .save-v-btn { background: #0f172a; color: white; border: none; padding: 6px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        
        .no-orders, .empty-wallet { text-align: center; padding: 60px 0; color: #94a3b8; font-weight: 600; }
        .sub-section-title { font-size: 1rem; font-weight: 800; margin-bottom: 16px; color: #475569; }
      `}} />
    </div>
  );
}
