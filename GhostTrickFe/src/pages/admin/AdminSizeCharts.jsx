import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Trash2, Edit, X, Save, Upload, Image as ImageIcon, AlertCircle, Eye } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { createPortal } from 'react-dom';

const AdminSizeCharts = () => {
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingChart, setEditingChart] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    imageUrl: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    fetchCharts();
  }, []);

  const fetchCharts = async () => {
    try {
      const res = await api.get('/sizecharts');
      setCharts(res.data);
    } catch (err) {
      addToast('Không thể tải danh sách bảng size', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (chart = null) => {
    if (chart) {
      setEditingChart(chart);
      setFormData({ name: chart.name, imageUrl: chart.imageUrl });
      setImagePreview(chart.imageUrl);
    } else {
      setEditingChart(null);
      setFormData({ name: '', imageUrl: '' });
      setImagePreview('');
    }
    setImageFile(null);
    setShowModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast('File quá lớn, tối đa 5MB', 'error');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addToast('Vui lòng nhập tên bảng size', 'warning');
      return;
    }
    if (!imageFile && !formData.imageUrl) {
      addToast('Vui lòng tải lên ảnh bảng size', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalImageUrl = formData.imageUrl;

      if (imageFile) {
        const imageFormData = new FormData();
        imageFormData.append('file', imageFile);
        const uploadRes = await api.post('/photos/upload', imageFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalImageUrl = uploadRes.data.url;
      }

      const payload = { ...formData, imageUrl: finalImageUrl };

      if (editingChart) {
        await api.put(`/sizecharts/${editingChart.id}`, payload);
        addToast('Cập nhật thành công', 'success');
      } else {
        await api.post('/sizecharts', payload);
        addToast('Thêm bảng size thành công', 'success');
      }

      setShowModal(false);
      fetchCharts();
    } catch (err) {
      addToast('Có lỗi xảy ra khi lưu', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bảng size này?')) return;
    try {
      await api.delete(`/sizecharts/${id}`);
      addToast('Đã xóa bảng size', 'success');
      fetchCharts();
    } catch (err) {
      addToast('Không thể xóa bảng size này', 'error');
    }
  };

  return (
    <div className="admin-size-charts-page animate-up">
      <div className="admin-page-header">
        <div className="header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="title">Quản lý Bảng Size</h2>
            <p className="subtitle">Thêm và quản lý các bảng kích cỡ quy đổi cho từng loại sản phẩm.</p>
          </div>
          <button className="add-new-btn" onClick={() => handleOpenModal()}>
            <Plus size={20} /> Thêm Bảng Size
          </button>
        </div>
      </div>



      <div className="admin-table-card">
        {loading ? (
          <div style={{ padding: '80px', textAlign: 'center' }}><div className="loader"></div></div>
        ) : charts.length === 0 ? (
          <div style={{ padding: '80px 40px', textAlign: 'center', color: '#94a3b8' }}>
            <ImageIcon size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <p style={{ fontWeight: 600 }}>Chưa có bảng size nào. Bấm "Thêm Bảng Size" để bắt đầu.</p>
          </div>
        ) : (
          <>
            <div className="desktop-only">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tên Bảng Size</th>
                    <th>Hình ảnh</th>
                    <th style={{ textAlign: 'right' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {charts.map(chart => (
                    <tr key={chart.id}>
                      <td style={{ color: '#64748b', fontWeight: '600' }}>#{chart.id}</td>
                      <td>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>{chart.name}</div>
                      </td>
                      <td>
                        <div className="chart-preview-cell">
                          <img src={chart.imageUrl} alt={chart.name} />
                          <div className="zoom-hint"><Eye size={12} /></div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="action-btn edit" onClick={() => handleOpenModal(chart)} title="Sửa">
                            <Edit size={18} />
                          </button>
                          <button className="action-btn delete" onClick={() => handleDelete(chart.id)} title="Xóa">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-only">
              <div className="mobile-chart-list">
                {charts.map(chart => (
                  <div key={chart.id} className="mobile-chart-card">
                    <div className="m-chart-img">
                      <img src={chart.imageUrl} alt={chart.name} />
                    </div>
                    <div className="m-chart-info">
                      <div className="m-chart-name">{chart.name}</div>
                      <div className="m-chart-id">ID: #{chart.id}</div>
                      <div className="m-chart-actions">
                        <button className="m-btn edit" onClick={() => handleOpenModal(chart)}>
                          <Edit size={16} /> Sửa
                        </button>
                        <button className="m-btn delete" onClick={() => handleDelete(chart.id)}>
                          <Trash2 size={16} /> Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-size-charts-page { padding: 0; }
        .admin-page-header { margin-bottom: 32px; }
        .admin-page-header .title { font-size: 2.2rem; font-weight: 800; color: #0f172a; margin-bottom: 8px; letter-spacing: -0.03em; }
        .admin-page-header .subtitle { color: #64748b; font-size: 1rem; font-weight: 500; }
        
        .add-new-btn { 
          background: #0f172a; 
          color: white; 
          border: none; 
          padding: 14px 28px; 
          border-radius: 16px; 
          font-weight: 700; 
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          gap: 10px; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
          white-space: nowrap; 
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12); 
        }
        
        .add-new-btn:hover { 
          background: #1e293b; 
          transform: translateY(-2px); 
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.2); 
        }

        .add-new-btn:active {
          transform: translateY(0);
        }
        
        .admin-stats-overview { display: flex; gap: 16px; margin-bottom: 32px; }
        .stat-card-mini { background: white; padding: 20px 24px; border-radius: 20px; border: 1px solid #f1f5f9; flex: 1; max-width: 240px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .s-label { font-size: 0.65rem; font-weight: 800; color: #94a3b8; letter-spacing: 0.05em; margin-bottom: 4px; }
        .s-value { font-size: 1.8rem; font-weight: 900; color: #0f172a; }

        .admin-table-card { background: white; border-radius: 24px; border: 1px solid #f1f5f9; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); }
        .admin-table { width: 100%; border-collapse: collapse; }
        .admin-table th { background: #f8fafc; padding: 16px 24px; text-align: left; font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #f1f5f9; }
        .admin-table td { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; transition: all 0.2s; }
        .admin-table tr:hover td { background: #f8fafc; }
        
        .action-btn {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          background: #f8fafc;
          color: #64748b;
        }

        .action-btn:hover {
          transform: scale(1.08);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .action-btn.edit:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .action-btn.delete:hover {
          background: #fee2e2;
          color: #ef4444;
        }
        
        .chart-preview-cell { width: 80px; height: 80px; border-radius: 12px; overflow: hidden; border: 1px solid #f1f5f9; background: #f8fafc; position: relative; cursor: pointer; }
        .chart-preview-cell img { width: 100%; height: 100%; object-fit: contain; }
        .zoom-hint { position: absolute; inset: 0; background: rgba(0,0,0,0.2); display: flex; alignItems: center; justifyContent: center; opacity: 0; transition: 0.2s; color: white; }
        .chart-preview-cell:hover .zoom-hint { opacity: 1; }

        .desktop-only { display: block; }
        .mobile-only { display: none; }

        .mobile-chart-list { display: flex; flex-direction: column; gap: 16px; padding: 16px; }
        .mobile-chart-card { background: white; border: 1px solid #f1f5f9; border-radius: 20px; overflow: hidden; display: flex; gap: 16px; padding: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); }
        .m-chart-img { width: 100px; height: 100px; border-radius: 12px; overflow: hidden; background: #f8fafc; border: 1px solid #f1f5f9; flex-shrink: 0; }
        .m-chart-img img { width: 100%; height: 100%; object-fit: contain; }
        .m-chart-info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .m-chart-name { font-weight: 800; color: #0f172a; font-size: 1rem; margin-bottom: 4px; }
        .m-chart-id { font-size: 0.75rem; color: #94a3b8; font-weight: 600; margin-bottom: 12px; }
        .m-chart-actions { display: flex; gap: 8px; }
        .m-btn { flex: 1; display: flex; alignItems: center; justifyContent: center; gap: 6px; padding: 8px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; border: none; cursor: pointer; }
        .m-btn.edit { background: #f1f5f9; color: #475569; }
        .m-btn.delete { background: #fee2e2; color: #ef4444; }

        @media (max-width: 768px) {
          .desktop-only { display: none; }
          .mobile-only { display: block; }
          .admin-page-header .header-flex { flex-direction: column; align-items: stretch; gap: 20px; }
          .add-new-btn { width: 100%; justify-content: center; }
          .admin-stats-overview { margin-bottom: 20px; }
        .stat-card-mini { max-width: none; }
        }

        .form-control {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 16px;
          font-weight: 600;
          color: #0f172a;
          transition: all 0.2s;
        }

        .form-control:focus {
          outline: none;
          border-color: #0f172a;
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.05);
        }

        .form-label {
          font-size: 0.75rem;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          margin-bottom: 8px;
          display: block;
          letter-spacing: 0.05em;
        }

        /* Modal Styles */
        .detail-modal-overlay { 
          position: fixed; 
          top: 0; 
          left: 0; 
          right: 0; 
          bottom: 0; 
          background: rgba(15, 23, 42, 0.6); 
          backdrop-filter: blur(8px); 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          z-index: 9999; 
          padding: 20px; 
          animation: fadeIn 0.3s ease; 
        }
        .detail-modal-content { 
          background: white; 
          width: 100%; 
          max-width: 500px; 
          max-height: 90vh; 
          border-radius: 32px; 
          overflow-y: auto; 
          position: relative; 
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); 
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); 
        }
        
        .modal-header-pd { 
          padding: 24px 32px; 
          border-bottom: 1px solid #f1f5f9; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          background: white; 
          position: sticky; 
          top: 0; 
          z-index: 10; 
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}} />

      {showModal && createPortal(
        <div className="detail-modal-overlay" onClick={() => !isSubmitting && setShowModal(false)}>
          <div className="detail-modal-content" style={{ maxWidth: '500px', borderRadius: '32px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header-pd">
              <h3 style={{ fontWeight: 900, fontSize: '1.25rem' }}>{editingChart ? 'Sửa Bảng Size' : 'Thêm Bảng Size Mới'}</h3>
              <button onClick={() => setShowModal(false)} disabled={isSubmitting} className="action-btn">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Tên phân loại bảng size</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="VD: Bảng size Áo thun, Bảng size Đầm..."
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hình ảnh bảng size</label>
                <div 
                  className="size-chart-upload-box" 
                  onClick={() => document.getElementById('chart-upload').click()}
                  style={{ 
                    border: '2px dashed #e2e8f0', 
                    borderRadius: '20px', 
                    padding: '24px', 
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: '#f8fafc',
                    minHeight: '220px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#0f172a'}
                  onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px' }} />
                  ) : (
                    <>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <Upload size={24} color="#0f172a" />
                      </div>
                      <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Tải ảnh lên</p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Hỗ trợ JPG, PNG. Tối đa 5MB.</p>
                    </>
                  )}
                  <input 
                    id="chart-upload"
                    type="file" 
                    onChange={handleImageChange} 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                  />
                </div>
              </div>

              <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
                <button 
                  type="button" 
                  className="admin-btn-secondary" 
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  style={{ flex: 1, padding: '14px', borderRadius: '14px', fontWeight: 700, background: '#f1f5f9', color: '#475569', border: 'none' }}
                >
                  HỦY BỎ
                </button>
                <button 
                  type="submit" 
                  className="admin-btn-primary" 
                  disabled={isSubmitting}
                  style={{ flex: 1, padding: '14px', borderRadius: '14px', fontWeight: 700 }}
                >
                  {isSubmitting ? <div className="loader" style={{ width: '18px', height: '18px' }}></div> : <Save size={20} />}
                  LƯU LẠI
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminSizeCharts;
