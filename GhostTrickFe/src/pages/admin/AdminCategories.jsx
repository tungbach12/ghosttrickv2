import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Trash2, Tag, AlertCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: '', slug: '' });
  const [errors, setErrors] = useState({});
  const { addToast } = useToast();

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      addToast('Không thể tải danh sách danh mục', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!newCategory.name.trim()) newErrors.name = 'Tên không được để trống';
    if (!newCategory.slug.trim()) newErrors.slug = 'Slug không được để trống';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    try {
      await api.post('/categories', newCategory);
      setNewCategory({ name: '', slug: '' });
      fetchCategories();
      addToast('Đã thêm danh mục mới!', 'success');
    } catch (error) {
      const msg = error.response?.data?.message || 'Lỗi tạo danh mục';
      addToast(msg, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa danh mục này?')) {
      try {
        await api.delete(`/categories/${id}`);
        fetchCategories();
        addToast('Đã xóa danh mục', 'success');
      } catch (error) {
        addToast('Lỗi xóa danh mục. Danh mục này có thể đang chứa sản phẩm.', 'error');
      }
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
      <div className="loader"></div>
    </div>
  );

  return (
    <div className="animate-up">
      <div className="admin-page-header" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>Quản lý Danh mục</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Quản lý các loại sản phẩm trong cửa hàng của bạn.</p>
      </div>

      <div className="admin-card">
        <h3 className="admin-section-title">Thêm danh mục mới</h3>
        <form onSubmit={handleCreate} noValidate>
          <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr auto', alignItems: 'flex-start', gap: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tên danh mục</label>
              <input
                type="text"
                placeholder="VD: Tops"
                value={newCategory.name}
                onChange={e => {
                  setNewCategory({ ...newCategory, name: e.target.value });
                  if (errors.name) setErrors({...errors, name: null});
                }}
                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
              />
              {errors.name && <div className="error-message"><AlertCircle size={12}/> {errors.name}</div>}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Đường dẫn (Slug)</label>
              <input
                type="text"
                placeholder="VD: tops"
                value={newCategory.slug}
                onChange={e => {
                  setNewCategory({ ...newCategory, slug: e.target.value });
                  if (errors.slug) setErrors({...errors, slug: null});
                }}
                className={`form-control ${errors.slug ? 'is-invalid' : ''}`}
              />
              {errors.slug && <div className="error-message"><AlertCircle size={12}/> {errors.slug}</div>}
            </div>
            <button type="submit" className="admin-btn-primary" style={{ marginTop: '28px' }}>
              <Plus size={20} />
              Thêm mới
            </button>
          </div>
        </form>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên Danh mục</th>
              <th>Đường dẫn (Slug)</th>
              <th style={{ textAlign: 'right' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td style={{ color: '#64748b', fontWeight: '600' }}>#{cat.id}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                      <Tag size={16} />
                    </div>
                    <span style={{ fontWeight: '700' }}>{cat.name}</span>
                  </div>
                </td>
                <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>/{cat.slug}</code></td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={() => handleDelete(cat.id)} className="action-btn delete" title="Xóa">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminCategories;
