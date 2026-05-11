import React, { useState, useEffect } from 'react';
import topBarService from '../../services/topBarService';
import { Plus, Trash2, Type, Hash, Edit3, X, AlertCircle, GripVertical } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const AdminTopBar = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    content: '',
    displayOrder: 0,
    isActive: true
  });

  const fetchPromos = async () => {
    try {
      const data = await topBarService.getPromosAdmin();
      setPromos(data);
    } catch (error) {
      addToast('Không thể tải danh sách khuyến mãi', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    if (!formData.content.trim()) {
      addToast('Vui lòng nhập nội dung khuyến mãi', 'warning');
      return;
    }

    try {
      if (editingId) {
        await topBarService.updatePromo(editingId, formData);
        addToast('Đã cập nhật khuyến mãi!', 'success');
      } else {
        await topBarService.createPromo(formData);
        addToast('Đã thêm khuyến mãi mới!', 'success');
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ content: '', displayOrder: promos.length + 1, isActive: true });
      fetchPromos();
    } catch (error) {
      addToast('Lỗi khi lưu khuyến mãi', 'error');
    }
  };

  const handleEdit = (promo) => {
    setEditingId(promo.id);
    setFormData({
      content: promo.content,
      displayOrder: promo.displayOrder,
      isActive: promo.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa dòng khuyến mãi này?')) {
      try {
        await topBarService.deletePromo(id);
        addToast('Đã xóa khuyến mãi', 'success');
        fetchPromos();
      } catch (error) {
        addToast('Lỗi khi xóa khuyến mãi', 'error');
      }
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
      <div className="loader"></div>
    </div>
  );

  return (
    <div className="admin-topbar-page">
      <div className="admin-page-header">
        <div className="header-content">
          <div>
            <h2 className="title">Quản lý Top Bar</h2>
            <p className="subtitle">Thiết lập các dòng chữ chạy khuyến mãi ở đầu trang.</p>
          </div>
          <button className="add-new-btn" onClick={() => { setEditingId(null); setFormData({ content: '', displayOrder: promos.length + 1, isActive: true }); setShowModal(true); }}>
            <Plus size={20} /> Thêm dòng mới
          </button>
        </div>
      </div>

      <div className="admin-table-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Thứ tự</th>
                <th>Nội dung khuyến mãi</th>
                <th style={{ width: '150px' }}>Trạng thái</th>
                <th style={{ textAlign: 'right', width: '120px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {promos.length > 0 ? promos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="order-badge">#{p.displayOrder}</div>
                  </td>
                  <td>
                    <span className="promo-content-text">{p.content}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${p.isActive ? 'green' : 'gray'}`}>
                      {p.isActive ? 'Đang hiển thị' : 'Đang ẩn'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button onClick={() => handleEdit(p)} className="action-btn edit" title="Sửa">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="action-btn delete" title="Xóa">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Chưa có dòng khuyến mãi nào. Hãy thêm mới!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content small">
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Chỉnh sửa dòng chữ' : 'Thêm dòng chữ mới'}</h3>
              <button className="close-modal" onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateOrUpdate}>
                <div className="form-group">
                  <label><Type size={14} /> Nội dung khuyến mãi</label>
                  <input
                    type="text"
                    placeholder="VD: Freeship cho đơn hàng từ 500K..."
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label><Hash size={14} /> Thứ tự hiển thị</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={e => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="switch-container">
                    <div className="switch">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      />
                      <span className="slider"></span>
                    </div>
                    <span className="switch-label">Kích hoạt hiển thị</span>
                  </label>
                </div>
                <button type="submit" className="save-btn">
                  {editingId ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-topbar-page { padding: 32px; }
        .order-badge { background: #f1f5f9; color: #475569; font-weight: 800; font-size: 0.8rem; padding: 4px 10px; border-radius: 8px; display: inline-block; }
        .promo-content-text { font-weight: 600; color: #0f172a; }
        
        .admin-page-header { margin-bottom: 32px; }
        .header-content { display: flex; justify-content: space-between; align-items: center; }
        .admin-page-header .title { font-size: 1.8rem; font-weight: 800; margin-bottom: 4px; }
        .admin-page-header .subtitle { color: #64748b; font-size: 0.95rem; }
        .add-new-btn { background: #0f172a; color: white; border: none; padding: 12px 24px; border-radius: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .add-new-btn:hover { background: #1e293b; transform: translateY(-2px); }
        
        .admin-table-card { background: white; border-radius: 24px; padding: 24px; border: 1px solid #f1f5f9; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
        .admin-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
        .admin-table th { padding: 16px; color: #94a3b8; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; text-align: left; }
        .admin-table tbody tr { background: white; transition: all 0.2s; }
        .admin-table tbody tr:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.05); }
        .admin-table td { padding: 20px 16px; border-top: 1px solid #f8fafc; border-bottom: 1px solid #f8fafc; }
        .admin-table td:first-child { border-left: 1px solid #f8fafc; border-top-left-radius: 16px; border-bottom-left-radius: 16px; }
        .admin-table td:last-child { border-right: 1px solid #f8fafc; border-top-right-radius: 16px; border-bottom-right-radius: 16px; }
        
        .status-badge { font-size: 0.7rem; font-weight: 800; padding: 4px 10px; border-radius: 8px; }
        .status-badge.green { background: #f0fdf4; color: #16a34a; }
        .status-badge.gray { background: #f1f5f9; color: #64748b; }
        
        .action-btn { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 1px solid #f1f5f9; background: white; cursor: pointer; transition: all 0.2s; color: #64748b; }
        .action-btn:hover { background: #0f172a; color: white; border-color: #0f172a; }
        .action-btn.delete:hover { background: #ef4444; border-color: #ef4444; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: white; border-radius: 28px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; }
        .modal-content.small { max-width: 500px; }
        .modal-header { padding: 24px 32px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .modal-body { padding: 32px; }
        
        .form-group { margin-bottom: 20px; }
        .form-group label { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 8px; }
        .form-group input { width: 100%; padding: 14px 20px; border: 2px solid #f1f5f9; border-radius: 14px; font-size: 1rem; transition: all 0.2s; outline: none; }
        .form-group input:focus { border-color: #0f172a; }

        .switch-container { display: flex; align-items: center; gap: 12px; cursor: pointer; }
        .switch { position: relative; width: 44px; height: 24px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; inset: 0; background: #e2e8f0; border-radius: 34px; transition: 0.3s; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
        input:checked + .slider { background: #10b981; }
        input:checked + .slider:before { transform: translateX(20px); }
        
        .save-btn { width: 100%; padding: 16px; background: #0f172a; color: white; border: none; border-radius: 16px; font-weight: 800; font-size: 1rem; cursor: pointer; transition: all 0.2s; margin-top: 12px; }
        .save-btn:hover { background: #1e293b; transform: translateY(-2px); }

        @media (max-width: 768px) {
          .admin-topbar-page { padding: 16px; }
          .header-content { flex-direction: column; align-items: flex-start; gap: 12px; }
          .add-new-btn { width: 100%; justify-content: center; }
        }
      ` }} />
    </div>
  );
};

export default AdminTopBar;
