import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGlobalContext } from '../context/GlobalContext';
import { orderService } from '../services/orderService';
import { voucherService } from '../services/voucherService';
import { useToast } from '../context/ToastContext';
import { ChevronRight, ShoppingBag, CreditCard, MapPin, Truck, AlertCircle, Check, Ticket, X, Percent, Banknote } from 'lucide-react';
import axios from 'axios';

const VoucherModal = ({ isOpen, onClose, onSelect, subtotal, currentVoucher }) => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useGlobalContext();

  useEffect(() => {
    if (isOpen) {
      const fetchVouchers = async () => {
        try {
          let available = [];
          if (user) {
            const wallet = await voucherService.getMyWallet();
            available = wallet.map(w => ({ ...w, isSaved: true }));
          } else {
            const publicVouchers = await voucherService.getPublicVouchers();
            available = publicVouchers.map(v => ({ ...v, isSaved: false }));
          }
          setVouchers(available);
        } catch (error) {
          console.error('Error fetching vouchers:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchVouchers();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  return (
    <div className="voucher-modal-overlay">
      <div className="voucher-modal-content">
        <div className="voucher-modal-header">
          <h3>Chọn mã giảm giá</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        
        <div className="voucher-modal-body">
          {loading ? (
            <div className="loading-state">Đang tải mã giảm giá...</div>
          ) : vouchers.length === 0 ? (
            <div className="empty-state">
              <Ticket size={48} />
              <p>Hiện không có mã giảm giá nào khả dụng.</p>
            </div>
          ) : (
            <div className="voucher-list">
              {vouchers.map(v => {
                const isApplicable = subtotal >= v.minOrderAmount;
                const isSelected = currentVoucher?.code === v.code;

                return (
                  <div key={v.code} className={`voucher-item ${!isApplicable ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}>
                    <div className="voucher-left">
                      {v.discountType === 'Percent' ? <Percent size={20} /> : <Banknote size={20} />}
                    </div>
                    <div className="voucher-mid">
                      <div className="v-code">{v.code}</div>
                      <div className="v-desc">{v.description}</div>
                      <div className="v-condition">Đơn tối thiểu {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v.minOrderAmount)}</div>
                      {!isApplicable && <div className="v-error">Chưa đủ điều kiện đơn hàng</div>}
                    </div>
                    <div className="voucher-right">
                      <button 
                        disabled={!isApplicable} 
                        onClick={() => { onSelect(v); onClose(); }}
                        className={isSelected ? 'applied' : ''}
                      >
                        {isSelected ? 'Đã chọn' : 'Áp dụng'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .voucher-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .voucher-modal-content { background: white; width: 100%; max-width: 500px; border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; max-height: 80vh; }
        .voucher-modal-header { padding: 20px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
        .voucher-modal-header h3 { margin: 0; font-size: 1.2rem; font-weight: 800; }
        .close-btn { background: none; border: none; cursor: pointer; color: #64748b; }
        
        .voucher-modal-body { flex: 1; overflow-y: auto; padding: 20px; }
        .voucher-list { display: flex; flex-direction: column; gap: 12px; }
        
        .voucher-item { display: flex; border: 2px solid #f1f5f9; border-radius: 12px; padding: 12px; gap: 12px; position: relative; }
        .voucher-item.selected { border-color: #0f172a; background: #f8fafc; }
        .voucher-item.disabled { opacity: 0.6; }
        
        .voucher-left { width: 50px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #0f172a; }
        .voucher-mid { flex: 1; }
        .voucher-mid .v-code { font-weight: 800; font-size: 0.95rem; margin-bottom: 2px; }
        .voucher-mid .v-desc { font-size: 0.8rem; color: #64748b; margin-bottom: 4px; }
        .voucher-mid .v-condition { font-size: 0.7rem; color: #94a3b8; font-weight: 600; }
        .v-error { font-size: 0.7rem; color: #ef4444; font-weight: 700; margin-top: 4px; }
        
        .voucher-right { display: flex; align-items: center; }
        .voucher-right button { padding: 8px 16px; border-radius: 8px; border: none; background: #0f172a; color: white; font-size: 0.8rem; font-weight: 800; cursor: pointer; transition: all 0.2s; }
        .voucher-right button:disabled { background: #cbd5e1; cursor: not-allowed; }
        .voucher-right button.applied { background: #10b981; }
        
        .loading-state, .empty-state { text-align: center; padding: 40px 0; color: #64748b; }
        .empty-state p { margin-top: 12px; font-weight: 600; }
      `}} />
    </div>
  );
};

export default function CheckoutPage() {
  const { cartItems, clearCart, user } = useGlobalContext();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [streetAddress, setStreetAddress] = useState('');
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [note, setNote] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  // Fetch Provinces on mount
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const res = await axios.get('https://provinces.open-api.vn/api/p/');
        setProvinces(res.data);
      } catch (err) {
        console.error('Lỗi tải tỉnh thành:', err);
      }
    };
    fetchProvinces();
  }, []);

  // Fetch Districts when Province changes
  useEffect(() => {
    if (!selectedProvince) {
      setDistricts([]);
      return;
    }
    const fetchDistricts = async () => {
      try {
        const res = await axios.get(`https://provinces.open-api.vn/api/p/${selectedProvince}?depth=2`);
        setDistricts(res.data.districts);
        setSelectedDistrict('');
        setWards([]);
      } catch (err) {
        console.error('Lỗi tải quận huyện:', err);
      }
    };
    fetchDistricts();
  }, [selectedProvince]);

  // Fetch Wards when District changes
  useEffect(() => {
    if (!selectedDistrict) {
      setWards([]);
      return;
    }
    const fetchWards = async () => {
      try {
        const res = await axios.get(`https://provinces.open-api.vn/api/d/${selectedDistrict}?depth=2`);
        setWards(res.data.wards);
        setSelectedWard('');
      } catch (err) {
        console.error('Lỗi tải phường xã:', err);
      }
    };
    fetchWards();
  }, [selectedDistrict]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = voucher ? (voucher.discountType === 'Percent' ? Math.min(subtotal * voucher.discountValue / 100, voucher.maxDiscountAmount > 0 ? voucher.maxDiscountAmount : 999999999) : voucher.discountValue) : 0;
  const shipping = subtotal >= 500000 ? 0 : 30000;
  const total = subtotal - discount + shipping;

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;
    try {
      const result = await voucherService.validateVoucher(voucherCode, subtotal);
      setVoucher(result);
      addToast('Áp dụng mã giảm giá thành công!', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Mã giảm giá không hợp lệ';
      addToast(msg, 'error');
      setVoucher(null);
    }
  };

  const handleSelectVoucher = (v) => {
    setVoucher(v);
    setVoucherCode(v.code);
    addToast('Áp dụng mã giảm giá thành công!', 'success');
  };

  const validate = () => {
    const newErrors = {};
    if (!fullName.trim()) newErrors.fullName = 'Vui lòng nhập họ tên';
    if (!phone.trim()) newErrors.phone = 'Vui lòng nhập số điện thoại';
    if (!streetAddress.trim()) newErrors.streetAddress = 'Vui lòng nhập địa chỉ';
    if (!selectedProvince) newErrors.province = 'Vui lòng chọn tỉnh/thành';
    if (!selectedDistrict) newErrors.district = 'Vui lòng chọn quận/huyện';
    if (!selectedWard) newErrors.ward = 'Vui lòng chọn phường/xã';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (!validate()) {
      addToast('Vui lòng nhập đầy đủ thông tin giao hàng', 'error');
      return;
    }

    setLoading(true);
    try {
      const provinceName = provinces.find(p => p.code == selectedProvince)?.name || '';
      const districtName = districts.find(d => d.code == selectedDistrict)?.name || '';
      const wardName = wards.find(w => w.code == selectedWard)?.name || '';
      const fullAddress = `${streetAddress}, ${wardName}, ${districtName}, ${provinceName}`;
      
      const orderData = {
        items: cartItems.map(item => ({ variantId: item.variantId, quantity: item.quantity })),
        shippingAddress: fullAddress,
        paymentMethod: paymentMethod,
        note: note,
        voucherCode: voucher?.code || null
      };

      const response = await orderService.createOrder(orderData);
      addToast('Đặt hàng thành công!', 'success');
      clearCart();
      navigate(`/account/order/${response.id}`);
    } catch (error) {
      const msg = error.response?.data?.message || 'Có lỗi xảy ra khi đặt hàng';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  if (cartItems.length === 0) {
    return (
      <div className="container" style={{padding: '80px 0', textAlign: 'center'}}>
        <h2>Giỏ hàng của bạn đang trống</h2>
        <Link to="/product" className="btn-outline" style={{marginTop: '20px', display: 'inline-block'}}>Mua sắm ngay</Link>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <div className="breadcrumb-bar">
          <nav className="breadcrumb">
            <Link to="/">Trang chủ</Link>
            <ChevronRight size={14} />
            <Link to="/cart">Giỏ hàng</Link>
            <ChevronRight size={14} />
            <span className="breadcrumb-current">Thanh toán</span>
          </nav>
        </div>

        <div className="checkout-grid">
          <div className="checkout-form-section">
            <div className="checkout-card">
              <h3 className="section-title"><MapPin size={20} /> Thông tin giao hàng</h3>
              <div className="form-group">
                <label>Họ tên</label>
                <input 
                  type="text" 
                  className={`form-control ${errors.fullName ? 'is-invalid' : ''}`}
                  value={fullName} 
                  onChange={e => handleFieldChange('fullName', e.target.value, setFullName)}
                />
                {errors.fullName && <div className="error-message">{errors.fullName}</div>}
              </div>
              <div className="form-row">
                <div className="form-group half">
                  <label>Email</label>
                  <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="form-group half">
                  <label>Số điện thoại</label>
                  <input 
                    type="tel" 
                    className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                    value={phone} 
                    onChange={e => handleFieldChange('phone', e.target.value, setPhone)}
                  />
                   {errors.phone && <div className="error-message">{errors.phone}</div>}
                </div>
              </div>
              
              <div className="form-group">
                <label>Địa chỉ cụ thể</label>
                <input 
                  type="text" 
                  className={`form-control ${errors.streetAddress ? 'is-invalid' : ''}`}
                  placeholder="Nhập địa chỉ chi tiết của bạn"
                  value={streetAddress}
                  onChange={e => handleFieldChange('streetAddress', e.target.value, setStreetAddress)}
                />
                {errors.streetAddress && <div className="error-message">{errors.streetAddress}</div>}
              </div>

              <div className="form-row">
                <div className="form-group third">
                  <label>Tỉnh/Thành</label>
                  <select className="form-control" value={selectedProvince} onChange={e => setSelectedProvince(e.target.value)}>
                    <option value="">Chọn tỉnh/thành</option>
                    {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group third">
                  <label>Quận/Huyện</label>
                  <select className="form-control" value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)} disabled={!selectedProvince}>
                    <option value="">Chọn quận/huyện</option>
                    {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group third">
                  <label>Phường/Xã</label>
                  <select className="form-control" value={selectedWard} onChange={e => setSelectedWard(e.target.value)} disabled={!selectedDistrict}>
                    <option value="">Chọn phường/xã</option>
                    {wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Ghi chú đơn hàng</label>
                <textarea className="form-control" rows="3" value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú về thời gian giao hàng hoặc chỉ dẫn địa chỉ..."></textarea>
              </div>
            </div>

            <div className="checkout-card mt-24">
              <h3 className="section-title"><Truck size={20} /> Phương thức thanh toán</h3>
              <div className="payment-options">
                <label className={`payment-option ${paymentMethod === 'COD' ? 'active' : ''}`}>
                  <input type="radio" name="payment" value="COD" checked={paymentMethod === 'COD'} onChange={e => setPaymentMethod(e.target.value)} />
                  <div className="payment-info">
                    <span className="payment-name">Thanh toán khi nhận hàng (COD)</span>
                    <span className="payment-desc">Thanh toán bằng tiền mặt khi shipper giao hàng tới.</span>
                  </div>
                  {paymentMethod === 'COD' && <Check size={18} className="check-icon" />}
                </label>
                <label className={`payment-option ${paymentMethod === 'BANK' ? 'active' : ''}`}>
                  <input type="radio" name="payment" value="BANK" checked={paymentMethod === 'BANK'} onChange={e => setPaymentMethod(e.target.value)} />
                  <div className="payment-info">
                    <span className="payment-name">Chuyển khoản ngân hàng</span>
                    <span className="payment-desc">Vui lòng chuyển khoản vào số tài khoản của chúng tôi.</span>
                  </div>
                  {paymentMethod === 'BANK' && <Check size={18} className="check-icon" />}
                </label>
              </div>
            </div>
          </div>

          <div className="checkout-summary-section">
            <div className="order-summary-card sticky-summary">
              <h3 className="section-title"><ShoppingBag size={20} /> Đơn hàng của bạn</h3>
              <div className="summary-items">
                {cartItems.map(item => (
                  <div key={item.variantId} className="summary-item">
                    <div className="item-img"><img src={item.image} alt={item.name} /></div>
                    <div className="item-details">
                      <div className="item-name">{item.name}</div>
                      <div className="item-meta">Size: {item.size} | Màu: {item.color} | SL: {item.quantity}</div>
                    </div>
                    <div className="item-price">{formatPrice(item.price * item.quantity)}</div>
                  </div>
                ))}
              </div>

              <div className="summary-voucher">
                <div className="voucher-input-group">
                  <input 
                    type="text" 
                    placeholder="Mã giảm giá" 
                    value={voucherCode} 
                    onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                  />
                  <button onClick={handleApplyVoucher}>ÁP DỤNG</button>
                </div>
                <button className="select-voucher-btn" onClick={() => setIsVoucherModalOpen(true)}>
                  <Ticket size={16} /> Chọn hoặc nhập mã khác
                </button>
              </div>

              <div className="summary-totals">
                <div className="total-row"><span>Tạm tính</span><span>{formatPrice(subtotal)}</span></div>
                {voucher && (
                  <div className="total-row discount">
                    <div className="d-label">
                      <span>Giảm giá ({voucher.code})</span>
                      {voucher.limitPerUser > 0 && <span className="l-limit">* Giới hạn {voucher.limitPerUser} lần/khách</span>}
                    </div>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="total-row"><span>Phí vận chuyển</span><span>{shipping === 0 ? 'Miễn phí' : formatPrice(shipping)}</span></div>
                <div className="total-row grand-total"><span>Tổng cộng</span><span>{formatPrice(total)}</span></div>
              </div>

              <button className="place-order-btn" onClick={handlePlaceOrder} disabled={loading}>
                {loading ? 'ĐANG XỬ LÝ...' : 'ĐẶT HÀNG NGAY'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <VoucherModal 
        isOpen={isVoucherModalOpen} 
        onClose={() => setIsVoucherModalOpen(false)} 
        onSelect={handleSelectVoucher}
        subtotal={subtotal}
        currentVoucher={voucher}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .checkout-page { padding: 40px 0; background: #f8fafc; min-height: 100vh; }
        .checkout-grid { display: grid; grid-template-columns: 1fr 400px; gap: 32px; margin-top: 24px; }
        .checkout-card { background: white; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; }
        .section-title { font-size: 1.1rem; font-weight: 800; display: flex; align-items: center; gap: 10px; margin-bottom: 20px; color: #0f172a; }
        
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 8px; color: #475569; }
        .form-control { width: 100%; padding: 12px 16px; border: 2px solid #f1f5f9; border-radius: 12px; font-size: 0.95rem; outline: none; transition: all 0.2s; background: #f8fafc; }
        .form-control:focus { border-color: #0f172a; background: white; }
        .form-row { display: flex; gap: 16px; }
        .half { width: 50%; }
        .third { width: 33.33%; }
        
        .payment-options { display: flex; flex-direction: column; gap: 12px; }
        .payment-option { display: flex; align-items: center; padding: 16px; border: 2px solid #f1f5f9; border-radius: 12px; cursor: pointer; transition: all 0.2s; position: relative; }
        .payment-option.active { border-color: #0f172a; background: #f8fafc; }
        .payment-option input { display: none; }
        .payment-info { flex: 1; display: flex; flex-direction: column; }
        .payment-name { font-weight: 800; font-size: 0.95rem; color: #0f172a; }
        .payment-desc { font-size: 0.75rem; color: #64748b; }
        .check-icon { color: #0f172a; }

        .order-summary-card { background: white; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; }
        .summary-items { max-height: 300px; overflow-y: auto; margin-bottom: 24px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 16px; }
        .summary-item { display: flex; gap: 12px; margin-bottom: 16px; }
        .item-img img { width: 60px; height: 60px; border-radius: 8px; object-fit: cover; }
        .item-details { flex: 1; }
        .item-name { font-weight: 700; font-size: 0.85rem; margin-bottom: 4px; }
        .item-meta { font-size: 0.7rem; color: #64748b; }
        .item-price { font-weight: 800; font-size: 0.85rem; }

        .summary-voucher { margin-bottom: 24px; }
        .voucher-input-group { display: flex; gap: 8px; margin-bottom: 8px; }
        .voucher-input-group input { flex: 1; padding: 10px 14px; border: 2px solid #f1f5f9; border-radius: 10px; font-size: 0.85rem; font-weight: 800; text-transform: uppercase; }
        .voucher-input-group button { padding: 10px 16px; border-radius: 10px; border: none; background: #0f172a; color: white; font-weight: 800; cursor: pointer; font-size: 0.8rem; }
        .select-voucher-btn { width: 100%; background: none; border: 2px dashed #cbd5e1; padding: 10px; border-radius: 10px; color: #64748b; font-weight: 700; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .select-voucher-btn:hover { background: #f8fafc; border-color: #94a3b8; color: #1e293b; }

        .summary-totals { margin-bottom: 24px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.9rem; color: #475569; font-weight: 600; }
        .total-row.discount { color: #ef4444; }
        .d-label { display: flex; flex-direction: column; }
        .l-limit { font-size: 0.7rem; color: #94a3b8; }
        .grand-total { border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 16px; color: #0f172a; font-size: 1.2rem; font-weight: 900; }
        
        .place-order-btn { width: 100%; padding: 16px; border-radius: 14px; border: none; background: #0f172a; color: white; font-weight: 900; font-size: 1rem; cursor: pointer; transition: all 0.2s; }
        .place-order-btn:hover { background: #1e293b; transform: translateY(-2px); }
        .sticky-summary { position: sticky; top: 24px; }
      `}} />
    </div>
  );
}

function handleFieldChange(field, value, setter) {
  setter(value);
}
