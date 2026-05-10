import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Trash2, Palette, Hash, Edit3, Check, X, AlertCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const AdminColors = () => {
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    hexCode: '#000000',
    isActive: true
  });

  const fetchColors = async () => {
    try {
      const response = await api.get('/colors');
      setColors(response.data);
    } catch (error) {
      addToast('Không thể tải danh sách màu sắc', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColors();
  }, []);

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addToast('Vui lòng nhập tên màu', 'warning');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/colors/${editingId}`, formData);
        addToast('Đã cập nhật màu sắc!', 'success');
      } else {
        await api.post('/colors', formData);
        addToast('Đã thêm màu mới!', 'success');
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ name: '', hexCode: '#000000', isActive: true });
      fetchColors();
    } catch (error) {
      addToast('Lỗi khi lưu màu sắc', 'error');
    }
  };

  const handleEdit = (color) => {
    setEditingId(color.id);
    setFormData({
      name: color.name,
      hexCode: color.hexCode,
      isActive: color.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa màu này?')) {
      try {
        const response = await api.delete(`/colors/${id}`);
        if (response.data && response.data.message) {
          addToast(response.data.message, 'info');
        } else {
          addToast('Đã xóa màu sắc', 'success');
        }
        fetchColors();
      } catch (error) {
        addToast('Lỗi khi xóa màu sắc', 'error');
      }
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
      <div className="loader"></div>
    </div>
  );

  return (
    <div className="admin-colors-page">
      <div className="admin-page-header">
        <div className="header-content">
          <div>
            <h2 className="title">Quản lý Màu sắc</h2>
            <p className="subtitle">Thiết lập danh mục màu sắc cho sản phẩm và biến thể.</p>
          </div>
          <button className="add-new-btn" onClick={() => { setEditingId(null); setFormData({ name: '', hexCode: '#000000', isActive: true }); setShowModal(true); }}>
            <Plus size={20} /> Thêm màu mới
          </button>
        </div>
      </div>

      <div className="admin-table-card">
        <div className="table-responsive desktop-only">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Màu sắc</th>
                <th>Tên màu</th>
                <th>Mã Hex</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {colors.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="color-preview-circle" style={{ background: c.hexCode, border: c.hexCode.toLowerCase() === '#ffffff' ? '1px solid #ddd' : 'none' }}></div>
                  </td>
                  <td><span className="color-name-text">{c.name}</span></td>
                  <td><code className="hex-code-pill">{c.hexCode}</code></td>
                  <td>
                    <span className={`status-badge ${c.isActive ? 'green' : 'gray'}`}>
                      {c.isActive ? 'Hoạt động' : 'Đang ẩn'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button onClick={() => handleEdit(c)} className="action-btn edit" title="Sửa">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="action-btn delete" title="Xóa">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-color-list mobile-only">
          {colors.map((c) => (
            <div key={c.id} className="color-mobile-card">
              <div className="c-m-header">
                <div className="c-m-info">
                  <div className="color-preview-circle small" style={{ background: c.hexCode, border: c.hexCode.toLowerCase() === '#ffffff' ? '1px solid #ddd' : 'none' }}></div>
                  <span className="color-name-text">{c.name}</span>
                </div>
                <div className={`status-badge ${c.isActive ? 'green' : 'gray'}`}>
                  {c.isActive ? 'Bật' : 'Tắt'}
                </div>
              </div>
              <div className="c-m-body">
                <code className="hex-code-pill">{c.hexCode}</code>
              </div>
              <div className="c-m-actions">
                <button onClick={() => handleEdit(c)} className="c-m-btn edit">Sửa</button>
                <button onClick={() => handleDelete(c.id)} className="c-m-btn delete">Xóa</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content small">
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Chỉnh sửa Màu' : 'Thêm Màu mới'}</h3>
              <button className="close-modal" onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateOrUpdate}>
                <div className="form-group">
                  <label><Palette size={14} /> Tên màu sắc</label>
                  <input
                    type="text"
                    placeholder="VD: Đen Carbon, Trắng Sữa..."
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label><Hash size={14} /> Mã màu (Hex)</label>
                  <div className="color-input-wrapper">
                    <input
                      type="color"
                      value={formData.hexCode}
                      onChange={e => setFormData({ ...formData, hexCode: e.target.value.toUpperCase() })}
                      className="color-picker-input"
                    />
                    <input
                      type="text"
                      value={formData.hexCode}
                      onChange={e => setFormData({ ...formData, hexCode: e.target.value.toUpperCase() })}
                      placeholder="#000000"
                      maxLength={7}
                    />
                  </div>
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
                    <span className="switch-label">Kích hoạt màu này</span>
                  </label>
                </div>
                <button type="submit" className="create-voucher-btn">
                  {editingId ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-colors-page { padding: 32px; }
        .color-preview-circle { width: 32px; height: 32px; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .color-name-text { font-weight: 700; color: #0f172a; }
        .hex-code-pill { background: #f1f5f9; padding: 4px 10px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: #475569; }
        .color-input-wrapper { display: flex; gap: 12px; }
        .color-picker-input { width: 60px; height: 50px; padding: 0; border: none; background: none; cursor: pointer; border-radius: 12px; overflow: hidden; }
        .modal-content.small { max-width: 500px; }
        
        /* Reuse Admin Vouchers styles but localized */
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
        .modal-content { background: white; border-radius: 28px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .modal-header { padding: 24px 32px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .modal-body { padding: 32px; }
        
        .form-group { margin-bottom: 20px; }
        .form-group label { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 8px; }
        .form-group input[type="text"] { width: 100%; padding: 14px 20px; border: 2px solid #f1f5f9; border-radius: 14px; font-size: 1rem; transition: all 0.2s; outline: none; }
        .form-group input[type="text"]:focus { border-color: #0f172a; }

        .switch-container { display: flex; align-items: center; gap: 12px; cursor: pointer; }
        .switch { position: relative; width: 44px; height: 24px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; inset: 0; background: #e2e8f0; border-radius: 34px; transition: 0.3s; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
        input:checked + .slider { background: #10b981; }
        input:checked + .slider:before { transform: translateX(20px); }
        
        .create-voucher-btn { width: 100%; padding: 16px; background: #0f172a; color: white; border: none; border-radius: 16px; font-weight: 800; font-size: 1rem; cursor: pointer; transition: all 0.2s; margin-top: 12px; }
        .create-voucher-btn:hover { background: #1e293b; transform: translateY(-2px); }

        .desktop-only { display: block; }
        .mobile-only { display: none; }

        @media (max-width: 768px) {
          .admin-colors-page { padding: 16px; }
          .header-content { flex-direction: column; align-items: flex-start; gap: 12px; }
          .add-new-btn { width: 100%; justify-content: center; }
          
          .desktop-only { display: none; }
          .mobile-only { display: block; }
          
          .color-mobile-card { background: #fff; border: 1px solid #f1f5f9; border-radius: 16px; padding: 16px; margin-bottom: 12px; }
          .c-m-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
          .c-m-info { display: flex; align-items: center; gap: 10px; }
          .color-preview-circle.small { width: 24px; height: 24px; }
          .c-m-body { margin-bottom: 16px; }
          .c-m-actions { display: flex; gap: 8px; border-top: 1px solid #f1f5f9; padding-top: 12px; }
          .c-m-btn { flex: 1; padding: 10px; border-radius: 10px; border: none; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
          .c-m-btn.edit { background: #f1f5f9; color: #475569; }
          .c-m-btn.delete { background: #fee2e2; color: #ef4444; }
          
          .modal-overlay { padding: 16px; }
          .modal-content.small { width: 100%; border-radius: 20px; }
          .modal-body { padding: 20px; }
        }
      ` }} />
    </div>
  );
};

export default AdminColors;
