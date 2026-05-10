import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGlobalContext } from '../context/GlobalContext';
import { orderService } from '../services/orderService';
import { voucherService } from '../services/voucherService';
import { useToast } from '../context/ToastContext';
import { ChevronRight, ShoppingBag, CreditCard, MapPin, Truck, AlertCircle, Check, Ticket, X, Percent, Banknote } from 'lucide-react';
import axios from 'axios';
import ColorTag from '../components/common/ColorTag';

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
              {[...vouchers]
                .sort((a, b) => {
                  // Put used or exhausted vouchers at the very bottom
                  const aFinished = a.isUsed || a.remainingCount === 0;
                  const bFinished = b.isUsed || b.remainingCount === 0;
                  if (aFinished !== bFinished) return aFinished ? 1 : -1;

                  // Then put non-applicable vouchers below applicable ones
                  const isAApplicable = subtotal >= a.minOrderAmount;
                  const isBApplicable = subtotal >= b.minOrderAmount;
                  if (isAApplicable !== isBApplicable) return isAApplicable ? -1 : 1;
                  return 0;
                })
                .map(v => {
                  const isExhausted = v.remainingCount === 0;
                  const isApplicable = subtotal >= v.minOrderAmount && !v.isUsed && !isExhausted;
                  const isSelected = currentVoucher?.code === v.code;
                  const isAlreadyUsed = v.isUsed;

                  return (
                    <div key={v.code} className={`voucher-item-brutal ${(!isApplicable && !isSelected) ? 'disabled' : ''} ${isSelected ? 'selected' : ''} ${isAlreadyUsed || isExhausted ? 'used' : ''}`}>
                      <div className="v-mid">
                        <div className="v-code">{v.code}</div>
                        <div className="v-desc">{v.description}</div>
                        <div className="v-condition">Đơn tối thiểu {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v.minOrderAmount)}</div>
                        
                        {!isApplicable && !isAlreadyUsed && !isExhausted && <div className="v-error">Chưa đủ điều kiện đơn hàng</div>}
                        {isAlreadyUsed && <div className="v-error" style={{color: '#94a3b8', fontSize: '0.75rem'}}>BẠN ĐÃ SỬ DỤNG MÃ NÀY</div>}
                        {isExhausted && !isAlreadyUsed && <div className="v-error" style={{color: '#ef4444', fontSize: '0.75rem'}}>MÃ ĐÃ HẾT LƯỢT SỬ DỤNG</div>}
                      </div>
                      <div className="v-right">
                        <button 
                          disabled={!isApplicable || isAlreadyUsed || isExhausted} 
                          onClick={() => { onSelect(v); onClose(); }}
                          className={isSelected ? 'applied' : (isAlreadyUsed || isExhausted) ? 'used' : ''}
                        >
                          {isSelected ? 'ĐÃ CHỌN' : isAlreadyUsed ? 'ĐÃ DÙNG' : isExhausted ? 'HẾT MÃ' : 'ÁP DỤNG'}
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
        .voucher-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(4px); }
        .voucher-modal-content { background: white; width: 100%; max-width: 480px; border: 3px solid #000; box-shadow: 12px 12px 0px #000; overflow: hidden; display: flex; flex-direction: column; max-height: 80vh; }
        .voucher-modal-header { padding: 20px; border-bottom: 2px solid #000; display: flex; align-items: center; justify-content: space-between; background: #fafafa; }
        .voucher-modal-header h3 { margin: 0; font-size: 1.2rem; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; }
        .close-btn { background: none; border: none; cursor: pointer; color: #000; }
        
        .voucher-modal-body { flex: 1; overflow-y: auto; padding: 24px; }
        .voucher-list { display: flex; flex-direction: column; gap: 16px; }
        
        .voucher-item-brutal { display: flex; background: #000; border: 1px solid #333; padding: 16px 20px; gap: 12px; position: relative; transition: all 0.2s; box-shadow: 4px 4px 0px #eee; }
        .voucher-item-brutal.selected { border-color: #fff; box-shadow: 8px 8px 0px #000; transform: translate(-2px, -2px); }
        .voucher-item-brutal.disabled { opacity: 0.4; pointer-events: none; }
        
        .v-mid { flex: 1; display: flex; flex-direction: column; justify-content: center; border-right: 1px dashed #333; padding-right: 15px; }
        .v-mid .v-code { font-weight: 900; font-size: 1.1rem; color: #fff; text-transform: uppercase; line-height: 1.2; }
        .v-mid .v-desc { font-size: 0.8rem; color: #888; font-weight: 600; margin: 4px 0; }
        .v-mid .v-condition { font-size: 0.7rem; color: #666; font-weight: 700; text-transform: uppercase; }
        .v-error { font-size: 0.65rem; color: #ff4d4d; font-weight: 800; margin-top: 5px; text-transform: uppercase; }
        
        .v-right { width: 80px; display: flex; align-items: center; justify-content: center; }
        .v-right button { width: 100%; padding: 10px 0; border: none; background: #fff; color: #000; font-size: 0.75rem; font-weight: 900; cursor: pointer; transition: all 0.2s; }
        .v-right button:hover { background: #eee; }
        .v-right button.applied { background: #10b981; color: #fff; }
        .v-right button.used { background: #cbd5e1; color: #94a3b8; cursor: not-allowed; }
        .voucher-item-brutal.used { opacity: 0.6; border-style: dashed; }
        
        .loading-state, .empty-state { text-align: center; padding: 60px 0; color: #64748b; font-weight: 800; text-transform: uppercase; }
        .empty-state p { margin-top: 12px; font-size: 0.9rem; }
      `}} />
    </div>
  );
};

const CheckoutErrorModal = ({ error, onClose, cartItems }) => {
  if (!error) return null;

  const affectedItems = error.variantIds 
    ? cartItems.filter(item => error.variantIds.includes(item.variantId))
    : [];

  return (
    <div className="voucher-modal-overlay">
      <div className="voucher-modal-content error-modal">
        <div className="voucher-modal-header error-header">
          <div className="header-title">
            <div className="alert-icon-wrapper">
              <AlertCircle size={20} />
            </div>
            <h3>Thông báo đặt hàng</h3>
          </div>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        
        <div className="voucher-modal-body">
          <div className="error-message-box">
            <p className="main-msg">{error.message}</p>
            
            {affectedItems.length > 0 && (
              <div className="affected-items">
                <p className="sub-msg">Các sản phẩm sau đã hết hàng hoặc không đủ số lượng:</p>
                <div className="error-item-list">
                  {affectedItems.map(item => (
                    <div key={item.variantId} className="error-item">
                      <img src={item.mainImageUrl} alt={item.name} />
                      <div className="ei-details">
                        <div className="ei-name">{item.name}</div>
                        <div className="ei-meta">{item.color} | {item.size}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <p className="action-hint">
              {error.variantIds 
                ? "Vui lòng cập nhật giỏ hàng và thử lại." 
                : "Vui lòng kiểm tra lại thông tin hoặc thử lại sau giây lát."}
            </p>
          </div>
          
          <button className="error-close-btn" onClick={onClose}>
            {error.variantIds ? "QUAY LẠI GIỎ HÀNG" : "ĐÃ HIỂU"}
          </button>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .error-modal { max-width: 480px; border: 4px solid #000; box-shadow: 16px 16px 0px #000; }
        .error-header { 
          background: #ef4444; 
          border-bottom: 4px solid #000; 
          padding: 16px 20px; 
          display: flex; 
          align-items: center; 
          justify-content: space-between;
          position: relative;
        }
        .error-header::after {
          content: "";
          position: absolute;
          bottom: -8px;
          left: 0;
          width: 100%;
          height: 4px;
          background: repeating-linear-gradient(
            45deg,
            #000,
            #000 10px,
            #ef4444 10px,
            #ef4444 20px
          );
        }
        .header-title { display: flex; align-items: center; gap: 12px; }
        .header-title h3 { color: #fff; text-transform: uppercase; letter-spacing: 1px; font-weight: 900; font-size: 1.1rem; margin: 0; }
        .header-title .alert-icon-wrapper { background: #fff; color: #ef4444; border-radius: 50%; padding: 4px; display: flex; align-items: center; justify-content: center; border: 2px solid #000; }
        
        .error-header .close-btn { 
          background: #fff; 
          border: 3px solid #000; 
          width: 32px; 
          height: 32px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          box-shadow: 3px 3px 0px #000;
          transition: all 0.1s;
        }
        .error-header .close-btn:active { box-shadow: 0 0 0 #000; transform: translate(3px, 3px); }
        
        .voucher-modal-body { padding: 30px 24px; background: #fff; }
        .error-message-box { text-align: center; }
        .main-msg { 
          font-size: 1.3rem; 
          font-weight: 900; 
          color: #000; 
          margin-bottom: 24px; 
          line-height: 1.2; 
          text-transform: uppercase;
          letter-spacing: -0.5px;
        }
        .sub-msg { font-size: 0.75rem; color: #64748b; font-weight: 800; margin-bottom: 12px; text-align: left; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .affected-items { background: #f1f5f9; border: 2px solid #000; padding: 16px; margin-bottom: 24px; box-shadow: 4px 4px 0px #cbd5e1; }
        .error-item-list { display: flex; flex-direction: column; gap: 12px; }
        .error-item { display: flex; gap: 16px; align-items: center; text-align: left; background: #fff; padding: 10px; border: 2px solid #000; }
        .error-item img { width: 50px; height: 60px; border: 1px solid #000; object-fit: cover; }
        .ei-name { font-size: 0.9rem; font-weight: 900; color: #000; text-transform: uppercase; line-height: 1.2; }
        .ei-meta { font-size: 0.7rem; color: #64748b; font-weight: 700; margin-top: 4px; }
        
        .action-hint { font-size: 0.8rem; color: #94a3b8; margin-top: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .error-close-btn { 
          width: 100%; 
          padding: 16px; 
          background: #000; 
          color: white; 
          border: 3px solid #000; 
          font-weight: 900; 
          font-size: 1rem;
          cursor: pointer; 
          margin-top: 15px; 
          box-shadow: 6px 6px 0px #ef4444;
          transition: all 0.1s;
          letter-spacing: 1px;
        }
        .error-close-btn:hover { transform: translate(-2px, -2px); box-shadow: 8px 8px 0px #ef4444; }
        .error-close-btn:active { transform: translate(6px, 6px); box-shadow: 0 0 0 #ef4444; }
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
  const [checkoutError, setCheckoutError] = useState(null); // { message, variantIds }

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

  const calculateItemSubtotal = (item) => {
    return item.price * item.quantity;
  };

  const subtotal = cartItems.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);

  // Auto-revalidate voucher when subtotal changes
  useEffect(() => {
    if (voucher && subtotal > 0) {
      const revalidate = async () => {
        try {
          const result = await voucherService.validateVoucher(voucher.code, subtotal);
          setVoucher(result);
        } catch (err) {
          // If no longer valid, clear it
          setVoucher(null);
          setVoucherCode('');
          addToast('Mã giảm giá đã bị hủy do đơn hàng không còn đủ điều kiện.', 'warning');
        }
      };
      revalidate();
    }
  }, [subtotal]);
  const shipping = subtotal >= 500000 ? 0 : 30000;
  
  // Logic: Nếu là mã Freeship thì chỉ giảm trên phí vận chuyển
  // Nếu là mã General thì giảm trên tiền hàng (subtotal)
  let discount = 0;
  let shippingDiscount = 0;
  let generalDiscount = 0;

  if (voucher) {
    const rawDiscount = voucher.discountType === 'Percent' 
      ? Math.min(subtotal * voucher.discountValue / 100, voucher.maxDiscountAmount > 0 ? voucher.maxDiscountAmount : 999999999) 
      : voucher.discountValue;

    if (voucher.category === 'Shipping') {
      shippingDiscount = Math.min(rawDiscount, shipping);
      discount = shippingDiscount; // For backward compatibility or general display
    } else {
      generalDiscount = Math.min(rawDiscount, subtotal);
      discount = generalDiscount;
    }
  }

  const total = subtotal - generalDiscount + (shipping - shippingDiscount);

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

  const handleSelectVoucher = async (v) => {
    try {
      const result = await voucherService.validateVoucher(v.code, subtotal);
      setVoucher(result);
      setVoucherCode(result.code);
      addToast('Áp dụng mã giảm giá thành công!', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Mã giảm giá không hợp lệ';
      addToast(msg, 'error');
      setVoucher(null);
    }
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
        receiverName: fullName,
        phone: phone,
        paymentMethod: paymentMethod,
        note: note,
        voucherCode: voucher?.code || null
      };

      const response = await orderService.createOrder(orderData);
      addToast('Đặt hàng thành công!', 'success');
      clearCart();
      navigate(`/account/order/${response.id}`);
    } catch (error) {
      const errorData = error.response?.data;
      if (error.response?.status === 409 || error.response?.status === 400) {
        // Handle Concurrency (409) or Validation (400) errors with detailed info
        setCheckoutError({
          message: errorData?.message || 'Không thể hoàn tất đặt hàng.',
          variantIds: errorData?.variantIds || null
        });
      } else {
        const msg = errorData?.message || 'Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.';
        addToast(msg, 'error');
      }
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
                {Object.values(cartItems.reduce((groups, item) => {
                  if (!groups[item.productId]) groups[item.productId] = { ...item, variants: [], groupSubtotal: 0, totalQty: 0 };
                  groups[item.productId].variants.push(item);
                  groups[item.productId].groupSubtotal += calculateItemSubtotal(item);
                  groups[item.productId].totalQty += item.quantity;
                  return groups;
                }, {})).map(group => (
                  <div key={group.productId} className="summary-group">
                    <div className="summary-item">
                      <div className="item-img"><img src={group.mainImageUrl} alt={group.name} /></div>
                      <div className="item-details">
                        <div className="item-name">{group.name}</div>
                        {group.variants.map(v => (
                          <div key={v.variantId} className="item-meta" style={{marginBottom: '4px'}}>
                            <span>Size: <strong>{v.size}</strong></span>
                            <span className="meta-sep">|</span>
                            <span>Màu: <ColorTag name={typeof v.color === 'object' ? v.color.name : v.color} hex={v.colorHex} size="sm" /></span>
                            <span className="meta-sep">|</span>
                            <span>SL: <strong>{v.quantity}</strong></span>
                          </div>
                        ))}
                        <div className="item-price">{formatPrice(group.groupSubtotal)}</div>
                      </div>
                    </div>
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
                  <div className={`total-row discount ${voucher.category === 'Shipping' ? 'shipping' : ''}`}>
                    <div className="d-label">
                      <span>{voucher.category === 'Shipping' ? 'Giảm phí vận chuyển' : 'Giảm giá'} ({voucher.code})</span>
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
      <CheckoutErrorModal 
        error={checkoutError} 
        onClose={() => {
          if (checkoutError?.variantIds) navigate('/cart');
          setCheckoutError(null);
        }}
        cartItems={cartItems}
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
        .summary-items { 
          max-height: 280px; 
          overflow-y: auto; 
          margin-bottom: 24px; 
          border-bottom: 1px dashed #e2e8f0; 
          padding-bottom: 16px;
          padding-right: 10px;
          /* Custom Scrollbar */
          scrollbar-width: thin;
          scrollbar-color: #0f172a transparent;
        }
        .summary-items::-webkit-scrollbar {
          width: 5px;
        }
        .summary-items::-webkit-scrollbar-track {
          background: transparent;
        }
        .summary-items::-webkit-scrollbar-thumb {
          background-color: #0f172a;
          border-radius: 20px;
        }
        
        /* Optional: Masking effect to show more items */
        .summary-items {
          mask-image: linear-gradient(to bottom, black 90%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, black 90%, transparent 100%);
        }
        .summary-items:hover {
          mask-image: none;
          -webkit-mask-image: none;
        }

        .summary-item { display: flex; gap: 12px; margin-bottom: 16px; align-items: flex-start; }
        .item-img { width: 64px; height: 64px; background: #f1f5f9; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
        .item-img img { width: 100%; height: 100%; object-fit: cover; }
        .item-details { flex: 1; }
        .item-name { font-weight: 800; font-size: 0.85rem; margin-bottom: 2px; color: #0f172a; line-height: 1.2; }
        .item-meta { font-size: 0.75rem; color: #64748b; font-weight: 500; margin-bottom: 4px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
        .meta-sep { color: #e2e8f0; margin: 0 2px; }
        .color-info { display: flex; align-items: center; gap: 4px; }
        .color-swatch-wrapper { display: inline-flex; align-items: center; gap: 4px; font-family: monospace; font-size: 0.7rem; color: #94a3b8; }
        .color-swatch { width: 12px; height: 12px; border-radius: 50%; border: 1px solid #e2e8f0; display: inline-block; }
        .item-price { font-weight: 900; font-size: 0.9rem; color: #0f172a; margin-top: 4px; }

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
