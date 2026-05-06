import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products?pageSize=100');
      setProducts(response.data.items || response.data);
    } catch (error) {
      addToast('Không thể tải danh sách sản phẩm', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa sản phẩm này? (Soft Delete)')) {
      try {
        await api.delete(`/products/${id}`);
        setProducts(products.filter(p => p.id !== id));
        addToast('Đã xóa sản phẩm thành công', 'success');
      } catch (error) {
        addToast('Lỗi khi xóa sản phẩm', 'error');
      }
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '200px', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loader"></div>
    </div>
  );

  return (
    <>
      <div className="admin-header-flex">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>Quản lý Sản phẩm</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Danh sách sản phẩm hiện có trong hệ thống.</p>
        </div>
        <Link to="/admin/products/add" className="admin-btn-primary">
          <Plus size={18} />
          Thêm Sản phẩm
        </Link>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>SKU</th>
              <th>Giá</th>
              <th>Kho</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: 'right' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={product.mainImageUrl}
                      alt={product.name}
                      style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                    />
                    <div>
                      <div style={{ fontWeight: '700', color: '#1e293b' }}>{product.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: '600', textTransform: 'uppercase' }}>{product.categorySlug}</div>
                    </div>
                  </div>
                </td>
                <td style={{ color: '#64748b', fontWeight: '500' }}>{product.sku}</td>
                <td style={{ fontWeight: '800', color: '#0f172a' }}>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                </td>
                <td>
                  <div style={{
                    fontWeight: '700',
                    color: product.totalStock <= 5 ? '#ef4444' : '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {product.totalStock}
                    {product.totalStock <= 5 && <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#ef4444', padding: '1px 4px', borderRadius: '4px' }}>LOW</span>}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: product.status === 'Active' ? '#dcfce7' : product.status === 'Draft' ? '#f1f5f9' : '#fee2e2',
                      color: product.status === 'Active' ? '#166534' : product.status === 'Draft' ? '#475569' : '#991b1b',
                      fontWeight: '800'
                    }}>
                      {product.status === 'Active' ? 'Hoạt động' : product.status === 'Draft' ? 'Nháp' : 'Lưu trữ'}
                    </span>
                    {product.isOnSale && <span className="status-badge status-error">Sale</span>}
                    {product.isNewArrival && <span className="status-badge status-info">New</span>}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <Link to={`/admin/products/edit/${product.id}`} className="action-btn">
                      <Edit size={16} />
                    </Link>
                    <button onClick={() => handleDelete(product.id)} className="action-btn delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default AdminProducts;
