import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useGlobalContext } from '../context/GlobalContext';
import { orderService } from '../services/orderService';
import { voucherService } from '../services/voucherService';
import { User, ShoppingBag, LogOut, ChevronRight, Camera, Ticket, Tag, Plus, Mail, Phone, MapPin, Save, Loader2, Key, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import ReviewModal from '../components/ReviewModal';
import { Star } from 'lucide-react';

export default function AccountPage() {
  const { user, logout, updateUser } = useGlobalContext();
  const { addToast } = useToast();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'orders', 'vouchers'
  const [orders, setOrders] = useState([]);
  const [orderPagination, setOrderPagination] = useState({ page: 1, totalPages: 1 });
  const [myVouchers, setMyVouchers] = useState([]);
  const [publicVouchers, setPublicVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile specific state
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || ''
  });

  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    productId: null,
    productName: '',
    orderId: null,
    existingReview: null
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [profileError, setProfileError] = useState('');

  const location = useLocation();

  // Sync tab with URL query
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['profile', 'orders', 'vouchers', 'password'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]);


  // Update formData when user object changes
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || ''
      });
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (activeTab === 'orders') {
        const data = await orderService.getUserOrders(orderPagination.page);
        setOrders(data.items);
        setOrderPagination(prev => ({ ...prev, totalPages: data.totalPages }));
      } else if (activeTab === 'vouchers') {
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
  }, [user, activeTab, orderPagination.page]);

  const handleSaveVoucher = async (code) => {
    try {
      await voucherService.saveToWallet(code);
      addToast('Đã lưu mã vào ví của bạn!', 'success');
      fetchData(); // Refresh lists
    } catch (error) {
      addToast(error.response?.data?.message || 'Không thể lưu mã', 'error');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    try {
      const response = await api.put('/account/profile', formData);
      updateUser(response.data);
      setIsEditing(false);
      addToast('Cập nhật thông tin thành công', 'success');
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Không thể cập nhật thông tin');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.post('/account/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
      });
      addToast('Đổi mật khẩu thành công', 'success');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Mật khẩu hiện tại không chính xác.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('File', file);

    setUploading(true);
    try {
      const response = await api.post('/account/avatar', formDataUpload);
      updateUser({ avatarUrl: response.data.avatarUrl });
      addToast('Cập nhật ảnh đại diện thành công', 'success');
    } catch (err) {
      addToast('Không thể tải ảnh lên', 'error');
    } finally {
      setUploading(false);
    }
  };

  const openReviewModal = (productId, productName, isReviewed, reviewId, orderId) => {
    setReviewModal({
      isOpen: true,
      productId,
      productName,
      orderId,
      existingReview: isReviewed ? { id: reviewId, productId, rating: 5, comment: '' } : null
    });


    // If it's an existing review, we should probably fetch the details or we already have them if we update the API
    // For now, if existing, the modal will fetch it or we can just pass basic info.
    // Actually, let's fetch the user's review for this product if existing.
    if (isReviewed && reviewId) {
      // We can just find it in the user reviews list if we had one, 
      // but for now the modal handles it by taking existingReview.
      // Let's refine this: the modal should probably fetch the review details by ID if we want to be clean.
      // Or the service can provide it.
    }
  };

  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }

  const formatPrice = (price) => {
    if (price === null || price === undefined || isNaN(price)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <>
      <div className="account-page animate-up">
        <div className="container">
          <div className="breadcrumb-bar-alt">
            <nav className="breadcrumb">
              <Link to="/"><span>Trang</span> chủ</Link>
              <ChevronRight size={14} />
              <Link to="/account">Tài khoản</Link>
              <ChevronRight size={14} />
              <span className="breadcrumb-current">
                {activeTab === 'profile' ? 'Thông tin cá nhân' :
                  activeTab === 'orders' ? 'Đơn hàng của tôi' : 'Ví Voucher'}
              </span>
            </nav>
          </div>

          <div className="account-layout">
            {/* Sidebar */}
            <div className="account-sidebar">
              <div className="account-user-card">
                <div className="account-avatar-wrapper">
                  <div className="account-avatar" onClick={handleAvatarClick} style={{ cursor: 'pointer', overflow: 'hidden' }}>
                    {uploading ? (
                      <Loader2 size={24} className="animate-spin" />
                    ) : user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (user.fullName || user.name || '?').charAt(0)
                    )}
                  </div>
                  <button className="avatar-edit-btn" onClick={handleAvatarClick} disabled={uploading}>
                    <Camera size={14} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                    accept="image/*"
                  />
                </div>
                <div className="account-user-details">
                  <h3 className="account-user-name">{user.fullName || user.name}</h3>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>Thành viên Ghosttrick</p>
                </div>
              </div>

              <ul className="account-menu">
                <li>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`account-menu-item ${activeTab === 'profile' ? 'active' : ''}`}
                  >
                    <User size={18} /> Thông tin tài khoản
                  </button>
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
                <li>
                  <button
                    onClick={() => setActiveTab('password')}
                    className={`account-menu-item ${activeTab === 'password' ? 'active' : ''}`}
                  >
                    <Key size={18} /> Đổi mật khẩu
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
              {activeTab === 'profile' && (
                <>
                  <div className="section-header">
                    <h2 className="account-section-title">Thông tin tài khoản</h2>
                  </div>

                  <div className="account-content-card">
                    {profileError && (
                      <div className="form-alert error" style={{ marginBottom: '20px', padding: '12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={18} /> {profileError}
                      </div>
                    )}
                    <form className="profile-form" onSubmit={handleSaveProfile}>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>
                            <User size={16} /> Họ và tên
                          </label>
                          <input
                            type="text"
                            value={formData.fullName}
                            readOnly={!isEditing}
                            placeholder="Nhập họ tên"
                            onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                            className={isEditing ? 'editable' : ''}
                          />
                        </div>
                        <div className="form-group">
                          <label>
                            <Mail size={16} /> Email
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            readOnly={true}
                            className="bg-light"
                          />
                        </div>
                        <div className="form-group">
                          <label>
                            <Phone size={16} /> Số điện thoại
                          </label>
                          <input
                            type="text"
                            value={formData.phone}
                            readOnly={!isEditing}
                            placeholder="Nhập số điện thoại"
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            className={isEditing ? 'editable' : ''}
                          />
                        </div>
                        <div className="form-group full-width">
                          <label>
                            <MapPin size={16} /> Địa chỉ nhận hàng
                          </label>
                          <textarea
                            value={formData.address}
                            readOnly={!isEditing}
                            placeholder="Nhập địa chỉ"
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            className={isEditing ? 'editable' : ''}
                            rows={2}
                          />
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="form-actions">
                          <button
                            type="button"
                            className="btn-text"
                            onClick={() => {
                              setIsEditing(false);
                              setFormData({
                                fullName: user.fullName || user.name,
                                email: user.email,
                                phone: user.phone,
                                address: user.address || ''
                              });
                            }}
                          >
                            Hủy
                          </button>
                          <button type="submit" className="btn-solid">
                            <Save size={18} /> Lưu thay đổi
                          </button>
                        </div>
                      ) : (
                        <div className="form-actions">
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() => setIsEditing(true)}
                          >
                            Chỉnh sửa
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                </>
              )}

              {activeTab === 'orders' && (
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
                      <Link to="/product" className="btn-solid">Mua sắm ngay</Link>
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
                            <div className="order-status-group" style={{ display: 'flex', gap: '8px' }}>
                              <div className={`order-status-badge-brutal ${order.paymentStatus?.toLowerCase()}`}>
                                {order.paymentStatus?.toUpperCase()}
                              </div>
                              <div className={`order-status-badge-brutal ${order.status?.toLowerCase()}`}>
                                {order.status?.toUpperCase()}
                              </div>
                            </div>
                          </div>
                          <div className="order-body-brutal">
                            <div className="order-items-list">
                              {/* Group items by productId for review purposes */}
                              {Object.values(order.items.reduce((acc, item) => {
                                if (!acc[item.productId]) {
                                  acc[item.productId] = { ...item, variants: [] };
                                }
                                acc[item.productId].variants.push({ color: item.color, size: item.size, quantity: item.quantity });
                                return acc;
                              }, {})).map((productGroup, pIdx) => (
                                <div key={`${order.id}-${productGroup.productId}`} className="order-item-brutal">
                                  <Link to={`/product/${productGroup.productId}`} className="item-img-brutal">
                                    <img src={productGroup.productImage || "/placeholder-product.jpg"} alt={productGroup.productName} />
                                  </Link>
                                  <div className="item-details-brutal">
                                    <Link to={`/product/${productGroup.productId}`} className="item-title-link">
                                      <h4 className="item-title-brutal">{productGroup.productName}</h4>
                                    </Link>

                                    <div className="item-variants-summary" style={{ marginBottom: '8px' }}>
                                      {productGroup.variants.map((v, vIdx) => (
                                        <div key={vIdx} className="item-meta-brutal" style={{ marginBottom: '2px', fontSize: '0.8rem' }}>
                                          {v.color && <span>Màu: <strong>{v.color}</strong></span>}
                                          {v.size && <span>Size: <strong>{v.size}</strong></span>}
                                          <span>SL: <strong>{v.quantity}</strong></span>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="item-price-brutal">{formatPrice(productGroup.unitPrice)}</div>

                                    {order.status?.toLowerCase() === 'delivered' && (
                                      <button
                                        className={`item-review-btn ${productGroup.isReviewed ? 'reviewed' : ''}`}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          openReviewModal(productGroup.productId, productGroup.productName, productGroup.isReviewed, productGroup.reviewId, order.id);

                                        }}
                                      >
                                        {productGroup.isReviewed ? (
                                          <><Star size={14} fill="#000" /> SỬA ĐÁNH GIÁ</>
                                        ) : (
                                          <><Star size={14} /> ĐÁNH GIÁ</>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
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

                      {/* Pagination */}
                      {orderPagination.totalPages > 1 && (
                        <div className="pagination-brutal">
                          <button
                            className="p-btn"
                            disabled={orderPagination.page === 1}
                            onClick={() => setOrderPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                          >
                            Trước
                          </button>
                          <div className="p-info">Trang {orderPagination.page} / {orderPagination.totalPages}</div>
                          <button
                            className="p-btn"
                            disabled={orderPagination.page === orderPagination.totalPages}
                            onClick={() => setOrderPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                          >
                            Sau
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'vouchers' && (
                <>
                  <div className="section-header">
                    <h2 className="account-section-title">Ví Voucher của bạn</h2>
                  </div>

                  <div className="voucher-wallet-grid">
                    <div className="wallet-section">
                      <h3 className="sub-section-title">Mã đã lưu ({myVouchers.length})</h3>
                      {myVouchers.length === 0 ? (
                        <div className="empty-wallet">Bạn chưa lưu mã nào.</div>
                      ) : (
                        <div className="voucher-grid">
                          {[...myVouchers]
                            .map(v => ({ ...v, isExpired: v.endDate && new Date(v.endDate) < new Date() }))
                            .sort((a, b) => {
                              // Both used/expired items go to bottom
                              const aInactive = a.isUsed || a.isExpired;
                              const bInactive = b.isUsed || b.isExpired;
                              if (aInactive !== bInactive) return aInactive ? 1 : -1;
                              return 0;
                            })
                            .map(v => (
                              <div key={v.code} className={`voucher-card-ui ${(v.isUsed || v.isExpired) ? 'used-v' : ''}`}>
                                <div className="v-card-top">
                                  <span className="v-card-code">{v.code}</span>
                                  <div className="v-card-desc">{v.description}</div>
                                  <div className="v-card-min">Đơn tối thiểu {formatPrice(v.minOrderAmount)}</div>
                                  <div className="v-card-validity">
                                    HSD: {new Date(v.startDate).toLocaleDateString('vi-VN')} - {v.endDate ? new Date(v.endDate).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                                  </div>
                                </div>
                                <div className="v-card-footer">
                                  <span className={`v-status ${v.isUsed ? 'used' : v.isExpired ? 'expired' : 'saved'}`}>
                                    {v.isUsed ? 'Đã sử dụng' : v.isExpired ? 'Đã hết hạn' : 'Đã lưu'}
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="wallet-section" style={{ marginTop: '40px' }}>
                      <h3 className="sub-section-title">Có thể bạn quan tâm</h3>
                      {publicVouchers.length === 0 ? (
                        <div className="empty-wallet">Không có mã mới nào.</div>
                      ) : (
                        <div className="voucher-grid">
                          {publicVouchers.map(v => (
                            <div key={v.code} className="voucher-card-ui public">
                              <div className="v-card-top">
                                <span className="v-card-code">{v.code}</span>
                                <div className="v-card-desc">{v.description}</div>
                                <div className="v-card-min">Đơn tối thiểu {formatPrice(v.minOrderAmount)}</div>
                                <div className="v-card-validity">
                                  HSD: {new Date(v.startDate).toLocaleDateString('vi-VN')} - {v.endDate ? new Date(v.endDate).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                                </div>
                              </div>
                              <div className="v-card-footer">
                                <button onClick={() => handleSaveVoucher(v.code)} className="save-v-btn">
                                  LƯU MÃ
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

              {activeTab === 'password' && (
                <>
                  <div className="section-header">
                    <h2 className="account-section-title">Đổi mật khẩu</h2>
                  </div>

                  <div className="account-content-card">
                    {passwordError && (
                      <div className="form-alert error" style={{ marginBottom: '20px', padding: '12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={18} /> {passwordError}
                      </div>
                    )}
                    <form className="profile-form" onSubmit={handlePasswordChange}>
                      <div className="form-grid">
                        <div className="form-group full-width">
                          <label>
                            <Key size={16} /> Mật khẩu hiện tại
                          </label>
                          <input
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            placeholder="Nhập mật khẩu hiện tại"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>
                            <Key size={16} /> Mật khẩu mới
                          </label>
                          <input
                            type="password"
                            value={passwordData.newPassword}
                            onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            placeholder="Tối thiểu 8 ký tự"
                            required
                            minLength={8}
                          />
                        </div>
                        <div className="form-group">
                          <label>
                            <Key size={16} /> Xác nhận mật khẩu mới
                          </label>
                          <input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            placeholder="Nhập lại mật khẩu mới"
                            required
                          />
                        </div>
                      </div>

                      <div className="form-actions">
                        <button
                          type="submit"
                          className={`btn-solid ${passwordLoading ? 'loading' : ''}`}
                          disabled={passwordLoading}
                        >
                          {passwordLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                          {passwordLoading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                        </button>
                      </div>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      </div>
      <ReviewModal
        isOpen={reviewModal.isOpen}
        productId={reviewModal.productId}
        productName={reviewModal.productName}
        orderId={reviewModal.orderId}
        existingReview={reviewModal.existingReview}
        onClose={() => setReviewModal({ ...reviewModal, isOpen: false })}

        onSuccess={() => {
          setReviewModal({ ...reviewModal, isOpen: false });
          fetchData();
        }}
      />

      <style>{`
      .item-review-btn {
        margin-top: 10px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: #0f172a;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-weight: 500;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.2s;
      }
      .item-review-btn:hover { background: #1e293b; transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
      .item-review-btn.reviewed { background: #fff; color: #0f172a; border: 1px solid #cbd5e1; }
      .item-review-btn.reviewed:hover { background: #f8fafc; border-color: #94a3b8; }

      .item-title-link {
        text-decoration: none;
        color: inherit;
        display: block;
      }
      .item-title-link:hover .item-title-brutal {
        color: #3b82f6;
      }
      .item-img-brutal {
        transition: all 0.2s;
        cursor: pointer;
      }
      .item-img-brutal:hover {
        opacity: 0.9;
        transform: scale(1.02);
      }
    `}</style>

    </>
  );
}

