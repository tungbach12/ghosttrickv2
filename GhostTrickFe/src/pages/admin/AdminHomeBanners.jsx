import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Play, 
  AlertCircle, RefreshCw, Image as ImageIcon, ExternalLink
} from 'lucide-react';
import homeBannerService from '../../services/homeBannerService';

const AdminHomeBanners = () => {
  const navigate = useNavigate();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const response = await homeBannerService.getAdminBanners();
      setBanners(response.data);
    } catch (error) {
      addToast('Lỗi khi tải danh sách banner', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa banner này?')) {
      try {
        await homeBannerService.deleteBanner(id);
        addToast('Đã xóa banner thành công');
        fetchBanners();
      } catch (error) {
        addToast('Lỗi khi xóa banner', 'error');
      }
    }
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

      <div className="admin-header-main">
        <div>
          <h1 className="admin-title">Quản lý Banner Trang chủ</h1>
          <p className="admin-subtitle">Tạo và quản lý các banner quảng bá ở đầu trang chủ.</p>
        </div>
        <button
          className="admin-btn-primary"
          onClick={() => navigate('/admin/home-banners/add')}
        >
          <Plus size={20} /> Thêm Banner mới
        </button>
      </div>

      <div className="admin-table-card">
        <div className="desktop-only">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Hình ảnh & Tiêu đề</th>
                <th>Thứ tự</th>
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
              ) : banners.length > 0 ? (
                banners.map((banner) => (
                  <tr key={banner.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ 
                          width: '120px', height: '60px', borderRadius: '12px', 
                          overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc'
                        }}>
                          <img 
                            src={banner.imageUrl} 
                            alt="" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', color: '#1e293b' }}>{banner.title}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{banner.subtitle || 'Không có phụ đề'}</div>
                          {banner.linkUrl && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#3b82f6', marginTop: '4px' }}>
                              <ExternalLink size={12} /> {banner.linkUrl}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: '700', color: '#64748b' }}>#{banner.displayOrder}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-badge ${banner.isActive ? 'status-success' : ''}`} style={{
                        padding: '6px 16px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800',
                        background: banner.isActive ? '#dcfce7' : '#f1f5f9',
                        color: banner.isActive ? '#15803d' : '#64748b'
                      }}>
                        {banner.isActive ? 'HIỂN THỊ' : 'ẨN'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button onClick={() => navigate(`/admin/home-banners/edit/${banner.id}`)} className="action-btn">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(banner.id)} className="action-btn delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
                    Chưa có banner nào được tạo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mobile-banner-list mobile-only">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}><div className="loader"></div></div>
          ) : banners.length > 0 ? (
            banners.map((banner) => (
              <div key={banner.id} className="banner-mobile-card">
                <div className="banner-m-img">
                  <img src={banner.imageUrl} alt="" />
                  <div className="banner-m-badge">
                    <span className={`m-badge ${banner.isActive ? 'success' : 'info'}`}>
                      {banner.isActive ? 'HIỂN THỊ' : 'ẨN'}
                    </span>
                  </div>
                </div>
                <div className="banner-m-info">
                  <div className="banner-m-header">
                    <h3 className="banner-m-title">{banner.title}</h3>
                    <span className="banner-m-order">#{banner.displayOrder}</span>
                  </div>
                  <p className="banner-m-subtitle">{banner.subtitle}</p>
                  {banner.linkUrl && (
                    <div className="banner-m-link">
                      <ExternalLink size={12} /> {banner.linkUrl}
                    </div>
                  )}
                </div>
                <div className="banner-m-actions">
                  <button onClick={() => navigate(`/admin/home-banners/edit/${banner.id}`)} className="banner-m-btn edit">Sửa</button>
                  <button onClick={() => handleDelete(banner.id)} className="banner-m-btn delete">Xóa</button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Chưa có banner nào.</div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .desktop-only { display: block; }
        .mobile-only { display: none; }

        @media (max-width: 768px) {
          .admin-container { padding: 16px; }
          .admin-header-main { flex-direction: column; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
          .admin-btn-primary { width: 100%; justify-content: center; }
          
          .desktop-only { display: none; }
          .mobile-only { display: block; }
          
          .banner-mobile-card { background: white; border-radius: 16px; overflow: hidden; margin-bottom: 16px; border: 1px solid #f1f5f9; }
          .banner-m-img { height: 160px; position: relative; }
          .banner-m-img img { width: 100%; height: 100%; object-fit: cover; }
          .banner-m-badge { position: absolute; top: 12px; right: 12px; }
          .m-badge { padding: 6px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: 800; }
          .m-badge.success { background: #dcfce7; color: #15803d; }
          .m-badge.info { background: #f1f5f9; color: #64748b; }
          
          .banner-m-info { padding: 16px; }
          .banner-m-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
          .banner-m-title { font-size: 1.1rem; font-weight: 800; color: #1e293b; margin: 0; }
          .banner-m-order { font-size: 0.8rem; font-weight: 700; color: #94a3b8; }
          .banner-m-subtitle { font-size: 0.85rem; color: #64748b; margin-bottom: 12px; }
          .banner-m-link { font-size: 0.75rem; color: #3b82f6; display: flex; align-items: center; gap: 6px; }
          
          .banner-m-actions { display: flex; gap: 8px; padding: 12px 16px; background: #f8fafc; border-top: 1px solid #f1f5f9; }
          .banner-m-btn { flex: 1; padding: 10px; border-radius: 10px; border: none; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
          .banner-m-btn.edit { background: #f1f5f9; color: #475569; }
          .banner-m-btn.delete { background: #fee2e2; color: #ef4444; }
        }
        .admin-container { padding: 32px; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        .admin-header-main { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
        .admin-title { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0; }
        .admin-subtitle { color: #64748b; margin: 4px 0 0 0; }
        
        .admin-btn-primary {
          background: #0f172a; color: white; border: none; padding: 12px 24px; 
          border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px;
          transition: all 0.2s; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
        }
        .admin-btn-primary:hover { transform: translateY(-2px); background: #000; }
        
        .admin-table-card { background: white; border-radius: 24px; border: 1px solid #f1f5f9; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
        .admin-table { width: 100%; border-collapse: collapse; }
        .admin-table th { background: #f8fafc; padding: 16px 24px; text-align: left; font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #f1f5f9; }
        .admin-table td { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; font-size: 0.95rem; }
        
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
        
        .loader { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #0f172a; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `
      }} />
    </div>
  );
};

export default AdminHomeBanners;
