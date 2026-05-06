import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Calendar, Play, Package,
  Search, SlidersHorizontal, AlertCircle, RefreshCw, Image as ImageIcon
} from 'lucide-react';
import saleService from '../../services/saleService';

const AdminSales = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const response = await saleService.getAdminSales();
      setSales(response.data);
    } catch (error) {
      addToast('Lỗi khi tải danh sách đợt sale', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa đợt sale này?')) {
      try {
        await saleService.deleteSale(id);
        addToast('Đã xóa đợt sale thành công');
        fetchSales();
      } catch (error) {
        addToast('Lỗi khi xóa đợt sale', 'error');
      }
    }
  };

  const handleActivate = async (id) => {
    if (window.confirm('Bạn muốn kích hoạt đợt Sale này và tạm dừng các đợt khác?')) {
      try {
        await saleService.activateSale(id);
        addToast('Đã kích hoạt đợt Sale!', 'success');
        fetchSales();
      } catch (error) {
        addToast('Lỗi khi kích hoạt', 'error');
      }
    }
  };

  const getStatusBadge = (start, end) => {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (now < startDate) return 'SẮP DIỄN RA';
    if (now > endDate) return 'ĐÃ KẾT THÚC';
    return 'ĐANG DIỄN RA';
  };

  return (
    <div className="admin-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          {toast.type === 'success' ? <RefreshCw size={20} /> : <AlertCircle size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="admin-header-flex">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>Quản lý Đợt Sale</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Quản lý các chương trình khuyến mãi và sản phẩm áp dụng.</p>
        </div>
        <button
          className="admin-btn-primary"
          onClick={() => navigate('/admin/sales/add')}
        >
          <Plus size={20} /> Tạo đợt Sale mới
        </button>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tên chương trình</th>
              <th>Thời gian</th>
              <th style={{ textAlign: 'center' }}>Trạng thái</th>
              <th style={{ textAlign: 'right' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '100px 0' }}>
                  <div className="loader"></div>
                  <p style={{ marginTop: '16px', color: '#64748b' }}>Đang tải dữ liệu...</p>
                </td>
              </tr>
            ) : sales.length > 0 ? (
              sales.map((sale) => (
                <tr key={sale.id} style={{
                  background: sale.isActive ? '#f0f9ff' : 'transparent',
                  borderLeft: sale.isActive ? '4px solid #3b82f6' : 'none'
                }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {sale.bannerUrl ? (
                        <div style={{ 
                          width: '80px', height: '45px', borderRadius: '8px', 
                          overflow: 'hidden', border: '1px solid #e2e8f0'
                        }}>
                          <img 
                            src={sale.bannerUrl} 
                            alt="" 
                            style={{ 
                              width: '100%', height: '100%', objectFit: 'cover'
                            }} 
                          />
                        </div>
                      ) : (
                        <div style={{ 
                          width: '80px', height: '45px', borderRadius: '8px', 
                          background: '#f1f5f9', display: 'flex', alignItems: 'center', 
                          justifyContent: 'center', color: '#94a3b8' 
                        }}>
                          <ImageIcon size={20} />
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: '700', color: '#1e293b' }}>{sale.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>slug: {sale.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>
                      <div>Bắt đầu: <span style={{ fontWeight: '600' }}>{new Date(sale.startTime).toLocaleString('vi-VN')}</span></div>
                      <div>Kết thúc: <span style={{ fontWeight: '600' }}>{new Date(sale.endTime).toLocaleString('vi-VN')}</span></div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      {!sale.isActive ? (
                        <span className="status-badge status-info" style={{ background: '#f1f5f9', color: '#64748b', padding: '4px 12px', borderRadius: '20px' }}>TẠM DỪNG</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <span className="status-badge status-success" style={{ padding: '4px 12px', borderRadius: '20px' }}>ĐANG CHẠY</span>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>
                            {getStatusBadge(sale.startTime, sale.endTime)}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      {!sale.isActive && (
                        <button onClick={() => handleActivate(sale.id)} className="action-btn" style={{ color: '#3b82f6', background: '#eff6ff' }} title="Kích hoạt">
                          <Play size={16} fill="currentColor" />
                        </button>
                      )}
                      <button onClick={() => navigate(`/admin/sales/edit/${sale.id}`)} className="action-btn">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(sale.id)} className="action-btn delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
                  Chưa có đợt sale nào được tạo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .admin-container { padding: 32px; font-family: 'Inter', sans-serif; }
        .admin-header-main { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
        .admin-title { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0; }
        .admin-subtitle { color: #64748b; margin: 4px 0 0 0; }
        
        .admin-btn-primary {
          background: #3b82f6; color: white; border: none; padding: 12px 24px; 
          border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px;
          transition: all 0.2s; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        .admin-btn-primary:hover { transform: translateY(-2px); background: #2563eb; }
        
        .admin-table-card { background: white; border-radius: 24px; border: 1px solid #f1f5f9; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
        .admin-table { width: 100%; border-collapse: collapse; }
        .admin-table th { background: #f8fafc; padding: 16px 24px; text-align: left; font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #f1f5f9; }
        .admin-table td { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; font-size: 0.95rem; }
        .admin-table tr:last-child td { border-bottom: none; }
        
        .status-badge { font-size: 0.75rem; font-weight: 800; }
        .status-badge.status-success { background: #dcfce7; color: #15803d; }
        
        .action-btn { 
          width: 36px; height: 36px; border-radius: 10px; border: none; 
          background: #f1f5f9; color: #475569; cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .action-btn:hover { background: #e2e8f0; color: #0f172a; }
        .action-btn.delete:hover { background: #fee2e2; color: #ef4444; }
        
        .admin-toast {
          position: fixed; top: 32px; right: 32px; z-index: 9999;
          padding: 16px 24px; border-radius: 16px; background: white;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-left: 4px solid #10b981;
          display: flex; align-items: center; gap: 12px; font-weight: 700;
          animation: slideIn 0.3s ease-out;
        }
        .admin-toast.error { border-left-color: #ef4444; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        
        .loader { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `
      }} />
    </div>
  );
};

export default AdminSales;
