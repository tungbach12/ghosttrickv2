import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Trash2, Ticket, Percent, Banknote, AlertCircle, Info, Hash, FileText, ShoppingBag, Target, Users } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const AdminVouchers = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const { addToast } = useToast();
  const [newVoucher, setNewVoucher] = useState({
    code: '',
    description: '',
    discountType: 'Percent',
    discountValue: 0,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    usageLimit: 0,
    limitPerUser: 1,
    isActive: true
  });

  const fetchVouchers = async () => {
    try {
      const response = await api.get('/vouchers');
      setVouchers(response.data);
    } catch (error) {
      addToast('Không thể tải danh sách mã giảm giá', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!newVoucher.code.trim()) newErrors.code = 'Mã voucher không được để trống';
    if (newVoucher.discountValue <= 0) newErrors.discountValue = 'Giá trị phải lớn hơn 0';
    if (newVoucher.discountType === 'Percent' && newVoucher.discountValue > 100) {
      newErrors.discountValue = 'Phần trăm không được quá 100%';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validate()) {
      addToast('Vui lòng điền đủ các thông tin cần thiết', 'error');
      return;
    }

    try {
      await api.post('/vouchers', newVoucher);
      setNewVoucher({
        code: '', description: '', discountType: 'Percent', discountValue: 0,
        minOrderAmount: 0, maxDiscountAmount: 0, usageLimit: 0, limitPerUser: 1, isActive: true
      });
      fetchVouchers();
      addToast('Đã tạo mã giảm giá mới!', 'success');
      setErrors({});
    } catch (error) {
      console.error('Error creating voucher:', error);
      let msg = 'Lỗi tạo mã giảm giá';
      if (error.response?.data?.errors) {
        const firstError = Object.values(error.response.data.errors)[0];
        msg = Array.isArray(firstError) ? firstError[0] : firstError;
      } else if (error.response?.data?.message) {
        msg = error.response.data.message;
      }
      addToast(msg, 'error');
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

  const handleInputChange = (field, value) => {
    setNewVoucher({ ...newVoucher, [field]: value });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
      <div className="loader"></div>
    </div>
  );

  return (
    <div className="admin-vouchers-page">
      <div className="admin-page-header">
        <div>
          <h2 className="title">Vouchers & Khuyến mãi</h2>
          <p className="subtitle">Thiết kế các chiến dịch giảm giá chuyên nghiệp cho khách hàng.</p>
        </div>
      </div>

      <div className="voucher-dashboard-grid">
        {/* Left: Form */}
        <div className="form-column">
          <div className="admin-card">
            <h3 className="card-title">Cấu hình Voucher mới</h3>
            <form onSubmit={handleCreate} noValidate>
              <div className="form-section">
                <h4 className="section-label">1. Thông tin định danh</h4>
                <div className="input-row">
                  <div className="form-group flex-1">
                    <label><Hash size={14} /> Mã Voucher</label>
                    <input
                      type="text" placeholder="VD: GHOSTTRICK20" value={newVoucher.code}
                      onChange={e => handleInputChange('code', e.target.value.toUpperCase())}
                      className={errors.code ? 'is-invalid' : ''}
                    />
                    {errors.code && <div className="error-message">{errors.code}</div>}
                  </div>
                </div>
                <div className="form-group">
                  <label><FileText size={14} /> Mô tả hiển thị</label>
                  <input
                    type="text" placeholder="VD: Giảm 20k cho đơn từ 200k" value={newVoucher.description}
                    onChange={e => handleInputChange('description', e.target.value)}
                  />
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
                        className={errors.discountValue ? 'is-invalid' : ''}
                      />
                      <span className="suffix">{newVoucher.discountType === 'Percent' ? '%' : 'đ'}</span>
                    </div>
                    {errors.discountValue && <div className="error-message">{errors.discountValue}</div>}
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
                      onChange={e => handleInputChange('minOrderAmount', Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label><Users size={14} /> Lượt dùng / 1 user</label>
                    <input
                      type="number" value={newVoucher.limitPerUser}
                      onChange={e => handleInputChange('limitPerUser', Number(e.target.value))}
                      placeholder="0 = Vô hạn"
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label><Users size={14} /> Tổng số lượng mã</label>
                    <input
                      type="number" value={newVoucher.usageLimit}
                      onChange={e => handleInputChange('usageLimit', Number(e.target.value))}
                      placeholder="0 = Vô hạn"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="create-voucher-btn">
                <Plus size={18} /> Tạo mã ngay
              </button>
            </form>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="preview-column">
          <div className="sticky-preview">
            <h3 className="card-title">Xem trước hiển thị</h3>
            <div className="voucher-preview-card">
              <div className="voucher-left">
                <div className="voucher-icon-box">
                  <Ticket size={24} />
                </div>
              </div>
              <div className="voucher-main">
                <div className="v-tag">OFFICIAL VOUCHER</div>
                <div className="v-code">{newVoucher.code || 'CODE_HERE'}</div>
                <div className="v-desc">{newVoucher.description || 'Chưa có mô tả chi tiết'}</div>
                <div className="v-details">
                  {newVoucher.discountType === 'Percent' 
                    ? `Giảm ${newVoucher.discountValue}% đơn từ ${formatPrice(newVoucher.minOrderAmount)}`
                    : `Giảm ${formatPrice(newVoucher.discountValue)} đơn từ ${formatPrice(newVoucher.minOrderAmount)}`
                  }
                </div>
              </div>
              <div className="voucher-right">
                <div className="v-circle top"></div>
                <div className="v-circle bottom"></div>
              </div>
            </div>
            
            <div className="pro-tip">
              <Info size={16} />
              <span>Gợi ý: Mã in hoa, ngắn gọn sẽ giúp khách hàng dễ ghi nhớ hơn.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-table-card mt-32">
        <h3 className="card-title mb-20">Danh sách Voucher đang chạy</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Voucher</th>
              <th>Loại & Giá trị</th>
              <th>Điều kiện đơn</th>
              <th>Đã dùng / Giới hạn</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((v) => (
              <tr key={v.id || v.code}>
                <td>
                  <div className="v-table-info">
                    <span className="v-table-code">{v.code}</span>
                    <span className="v-table-desc">{v.description}</span>
                  </div>
                </td>
                <td>
                  <div className="v-table-discount">
                    <span className={`disc-pill ${v.discountType === 'Percent' ? 'blue' : 'green'}`}>
                      {v.discountType === 'Percent' ? <Percent size={12}/> : <Banknote size={12}/>}
                      {v.discountType === 'Percent' ? `${v.discountValue}%` : formatPrice(v.discountValue)}
                    </span>
                  </div>
                </td>
                <td>
                  <span className="v-table-min">Từ {formatPrice(v.minOrderAmount)}</span>
                </td>
                <td>
                  <div className="usage-stat">
                    <div className="usage-text">
                      <span title="Đã dùng / Tổng số lượng">{v.usedCount} / {v.usageLimit === 0 ? '∞' : v.usageLimit}</span>
                      <span style={{ margin: '0 4px', color: '#cbd5e1' }}>|</span>
                      <span title="Giới hạn mỗi user" style={{ color: '#6366f1' }}>Max {v.limitPerUser === 0 ? '∞' : v.limitPerUser}/u</span>
                    </div>
                    <div className="usage-bar-container">
                       <div 
                        className="usage-bar" 
                        style={{ width: v.usageLimit === 0 ? '5%' : `${Math.min((v.usedCount / v.usageLimit) * 100, 100)}%` }}
                       ></div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => handleDelete(v.id || v.code)} className="action-btn delete" title="Xóa">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .admin-vouchers-page { padding: 32px; font-family: 'Inter', sans-serif; }
        .admin-page-header .title { font-size: 1.8rem; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
        .admin-page-header .subtitle { color: #64748b; font-size: 0.95rem; margin-bottom: 32px; }
        
        .voucher-dashboard-grid { display: grid; grid-template-columns: 1fr 380px; gap: 32px; align-items: flex-start; }
        .admin-card { background: white; border-radius: 24px; padding: 24px; border: 1px solid #f1f5f9; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
        .card-title { font-size: 1.1rem; font-weight: 800; color: #1e293b; margin-bottom: 24px; }
        
        .form-section { margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #f8fafc; }
        .form-section:last-of-type { border-bottom: none; }
        .section-label { font-size: 0.8rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
        
        .form-group { margin-bottom: 16px; }
        .form-group label { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 8px; }
        .form-group input { width: 100%; padding: 12px 16px; border: 2px solid #f1f5f9; border-radius: 12px; font-size: 0.95rem; transition: all 0.2s; outline: none; background: #f8fafc; }
        .form-group input:focus { border-color: #0f172a; background: white; }
        
        .input-row { display: flex; gap: 16px; }
        .flex-1 { flex: 1; }
        .mt-16 { margin-top: 16px; }
        .mb-20 { margin-bottom: 20px; }
        .mt-32 { margin-top: 32px; }

        .discount-type-selector { display: flex; gap: 12px; background: #f1f5f9; padding: 6px; border-radius: 14px; }
        .type-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; border: none; border-radius: 10px; cursor: pointer; font-size: 0.85rem; font-weight: 700; color: #64748b; background: transparent; transition: all 0.2s; }
        .type-btn.active { background: white; color: #0f172a; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        
        .input-with-suffix { position: relative; }
        .input-with-suffix .suffix { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-weight: 800; color: #94a3b8; }
        
        .create-voucher-btn { width: 100%; padding: 14px; border-radius: 14px; border: none; background: #0f172a; color: white; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.2s; }
        .create-voucher-btn:hover { background: #1e293b; transform: translateY(-2px); }

        .sticky-preview { position: sticky; top: 32px; }
        .voucher-preview-card { background: #0f172a; color: white; border-radius: 20px; height: 160px; display: flex; position: relative; overflow: hidden; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15); animation: float 3s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        
        .voucher-left { width: 80px; display: flex; align-items: center; justify-content: center; border-right: 2px dashed rgba(255,255,255,0.2); }
        .voucher-icon-box { background: rgba(255,255,255,0.1); padding: 12px; border-radius: 15px; }
        .voucher-main { flex: 1; padding: 20px; display: flex; flex-direction: column; justify-content: center; }
        .v-tag { font-size: 0.6rem; font-weight: 900; letter-spacing: 0.1em; color: rgba(255,255,255,0.5); margin-bottom: 4px; }
        .v-code { font-size: 1.5rem; font-weight: 900; letter-spacing: 2px; margin-bottom: 4px; }
        .v-desc { font-size: 0.8rem; color: rgba(255,255,255,0.8); margin-bottom: 8px; font-weight: 500; }
        .v-details { font-size: 0.7rem; font-weight: 700; background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 6px; width: fit-content; }
        .voucher-right { width: 10px; background: #0f172a; position: relative; }
        .v-circle { width: 20px; height: 20px; background: white; border-radius: 50%; position: absolute; left: -10px; }
        .v-circle.top { top: -10px; }
        .v-circle.bottom { bottom: -10px; }
        
        .pro-tip { margin-top: 24px; background: #f0f9ff; padding: 16px; border-radius: 16px; display: flex; gap: 12px; color: #0369a1; font-size: 0.85rem; font-weight: 600; line-height: 1.4; }
        
        .v-table-info { display: flex; flex-direction: column; }
        .v-table-code { font-weight: 800; color: #0f172a; font-size: 1rem; }
        .v-table-desc { font-size: 0.75rem; color: #64748b; }
        
        .disc-pill { padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 800; display: flex; align-items: center; gap: 4px; width: fit-content; }
        .disc-pill.blue { background: #eff6ff; color: #2563eb; }
        .disc-pill.green { background: #f0fdf4; color: #16a34a; }
        
        .v-table-min { font-size: 0.85rem; color: #475569; font-weight: 600; }
        .usage-stat { width: 120px; }
        .usage-text { font-size: 0.75rem; font-weight: 800; color: #1e293b; margin-bottom: 6px; }
        .usage-bar-container { height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
        .usage-bar { height: 100%; background: #0f172a; border-radius: 3px; }
        `
      }} />
    </div>
  );
};

export default AdminVouchers;
