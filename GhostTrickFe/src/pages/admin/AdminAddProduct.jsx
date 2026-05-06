import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { Save, X, Plus, Trash2, Upload, AlertCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const AdminAddProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const isEdit = !!id;

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    price: 0,
    originalPrice: 0,
    categoryId: '',
    subcategory: '',
    isOnSale: false,
    isNewArrival: false,
    isTrending: false,
    status: 'Active',
  });

  const [variants, setVariants] = useState([{ color: '', size: '', stock: 0, lowStockThreshold: 5 }]);
  const [mainImage, setMainImage] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState(null);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/categories');
        setCategories(res.data);
      } catch (err) {
        addToast('Không thể tải danh mục', 'error');
      }
    };
    fetchCats();

    if (isEdit) {
      const fetchProduct = async () => {
        try {
          const res = await api.get(`/products/${id}`);
          const p = res.data;
          setFormData({
            name: p.name,
            sku: p.sku,
            description: p.description,
            price: p.price,
            originalPrice: p.originalPrice || 0,
            categoryId: categories.find(c => c.slug === p.categorySlug)?.id || '',
            subcategory: p.subcategory || '',
            isOnSale: p.isOnSale,
            isNewArrival: p.isNewArrival,
            isTrending: p.isTrending,
            status: p.status,
          });
          setVariants(p.variants.map(v => ({ 
            color: v.color, 
            size: v.size, 
            stock: v.stock,
            lowStockThreshold: v.lowStockThreshold || 5
          })));
          setMainImagePreview(p.mainImageUrl);
        } catch (err) {
          addToast('Không thể tải thông tin sản phẩm', 'error');
        }
      };
      fetchProduct();
    }
  }, [id, isEdit, categories.length]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleVariantChange = (index, field, value) => {
    const newVariants = [...variants];
    newVariants[index][field] = (field === 'stock' || field === 'lowStockThreshold') ? Number(value) : value;
    setVariants(newVariants);
  };

  const addVariant = () => setVariants([...variants, { color: '', size: '', stock: 0, lowStockThreshold: 5 }]);
  const removeVariant = (index) => setVariants(variants.filter((_, i) => i !== index));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast('File quá lớn, tối đa 5MB', 'error');
        return;
      }
      setMainImage(file);
      setMainImagePreview(URL.createObjectURL(file));
      setErrors(prev => ({ ...prev, mainImage: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Tên sản phẩm không được để trống';
    if (!formData.sku.trim()) newErrors.sku = 'SKU không được để trống';
    if (!formData.categoryId) newErrors.categoryId = 'Vui lòng chọn danh mục';
    if (formData.price <= 0) newErrors.price = 'Giá phải lớn hơn 0';
    if (!isEdit && !mainImage) newErrors.mainImage = 'Vui lòng chọn ảnh đại diện';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      addToast('Vui lòng kiểm tra lại thông tin nhập vào', 'error');
      // Scroll to first error
      const firstError = Object.keys(errors)[0];
      const el = document.getElementsByName(firstError)[0];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      
      variants.forEach((v, index) => {
        data.append(`Variants[${index}].Color`, v.color || '');
        data.append(`Variants[${index}].Size`, v.size || '');
        data.append(`Variants[${index}].Stock`, v.stock);
        data.append(`Variants[${index}].LowStockThreshold`, v.lowStockThreshold);
      });

      if (mainImage) {
        data.append('MainImage', mainImage);
      }

      if (isEdit) {
        await api.put(`/products/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        addToast('Cập nhật sản phẩm thành công', 'success');
      } else {
        await api.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } });
        addToast('Thêm sản phẩm thành công', 'success');
      }

      navigate('/admin/products');
    } catch (error) {
      console.error('Submit failed:', error);
      const msg = error.response?.data?.message || 'Có lỗi xảy ra khi lưu sản phẩm';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container-narrow animate-up">
      <div className="admin-header-flex">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>
            {isEdit ? 'Chỉnh sửa Sản phẩm' : 'Thêm Sản phẩm Mới'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Vui lòng điền đầy đủ thông tin bên dưới.</p>
        </div>
        <button onClick={() => navigate('/admin/products')} className="action-btn">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Basic Info */}
        <div className="admin-card">
          <h3 className="admin-section-title">Thông tin cơ bản</h3>
          <div className="admin-form-grid">
            <div className="form-group full-width">
              <label className="form-label">Tên sản phẩm</label>
              <input
                type="text" name="name" value={formData.name} onChange={handleInputChange}
                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                placeholder="VD: Áo thun Ghosttrick Signature"
              />
              {errors.name && <div className="error-message"><AlertCircle size={14}/> {errors.name}</div>}
            </div>
            
            <div className="form-group">
              <label className="form-label">SKU</label>
              <input
                type="text" name="sku" value={formData.sku} onChange={handleInputChange}
                className={`form-control ${errors.sku ? 'is-invalid' : ''}`}
                placeholder="VD: GT-001"
              />
              {errors.sku && <div className="error-message"><AlertCircle size={14}/> {errors.sku}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Danh mục</label>
              <select
                name="categoryId" value={formData.categoryId} onChange={handleInputChange}
                className={`form-control ${errors.categoryId ? 'is-invalid' : ''}`}
              >
                <option value="">Chọn danh mục</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.categoryId && <div className="error-message"><AlertCircle size={14}/> {errors.categoryId}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Giá bán (VND)</label>
              <input
                type="number" name="price" value={formData.price} onChange={handleInputChange}
                className={`form-control ${errors.price ? 'is-invalid' : ''}`}
              />
              {errors.price && <div className="error-message"><AlertCircle size={14}/> {errors.price}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Giá gốc (nếu có giảm giá)</label>
              <input
                type="number" name="originalPrice" value={formData.originalPrice} onChange={handleInputChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Trạng thái hiển thị</label>
              <select
                name="status" value={formData.status} onChange={handleInputChange}
                className="form-control"
              >
                <option value="Active">Hoạt động (Active)</option>
                <option value="Draft">Bản nháp (Draft)</option>
                <option value="Archived">Lưu trữ (Archived)</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Mô tả sản phẩm</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleInputChange}
                className="form-control"
                rows="4"
                placeholder="Mô tả chi tiết về sản phẩm..."
              ></textarea>
            </div>
          </div>
        </div>

        {/* Image */}
        <div className={`admin-card ${errors.mainImage ? 'is-invalid-card' : ''}`} style={errors.mainImage ? {borderColor: '#ef4444'} : {}}>
          <h3 className="admin-section-title">Hình ảnh sản phẩm</h3>
          <div className="upload-area">
            <div className={`preview-box ${errors.mainImage ? 'is-invalid' : ''}`}>
              {mainImagePreview ? (
                <img src={mainImagePreview} alt="Preview" />
              ) : (
                <Upload size={32} color={errors.mainImage ? '#ef4444' : '#cbd5e1'} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '8px' }}>Ảnh đại diện sản phẩm</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '12px' }}>Hỗ trợ JPG, PNG. Tối đa 5MB.</p>
              <input type="file" onChange={handleImageChange} accept="image/*" name="mainImage" />
              {errors.mainImage && <div className="error-message"><AlertCircle size={14}/> {errors.mainImage}</div>}
            </div>
          </div>
        </div>

        {/* Variants */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="admin-section-title" style={{ marginBottom: 0, border: 'none' }}>Biến thể sản phẩm</h3>
            <button type="button" onClick={addVariant} className="admin-btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <Plus size={16} /> Thêm biến thể
            </button>
          </div>
          
          <div className="variants-list">
            {variants.map((v, index) => (
              <div key={index} className="variant-row">
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '10px' }}>Màu sắc</label>
                  <input type="text" value={v.color} onChange={e => handleVariantChange(index, 'color', e.target.value)} className="form-control" placeholder="VD: Black" />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '10px' }}>Kích thước</label>
                  <input type="text" value={v.size} onChange={e => handleVariantChange(index, 'size', e.target.value)} className="form-control" placeholder="VD: L" />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '10px' }}>Kho</label>
                  <input type="number" value={v.stock} onChange={e => handleVariantChange(index, 'stock', e.target.value)} className="form-control" />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '10px' }}>Ngưỡng thấp</label>
                  <input type="number" value={v.lowStockThreshold} onChange={e => handleVariantChange(index, 'lowStockThreshold', e.target.value)} className="form-control" />
                </div>
                <button type="button" onClick={() => removeVariant(index)} className="action-btn delete">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Flags */}
        <div className="admin-card">
          <h3 className="admin-section-title">Nhãn sản phẩm</h3>
          <div className="form-checkbox-group">
            <label className="form-checkbox">
              <input type="checkbox" name="isOnSale" checked={formData.isOnSale} onChange={handleInputChange} />
              Đang giảm giá (Sale)
            </label>
            <label className="form-checkbox">
              <input type="checkbox" name="isNewArrival" checked={formData.isNewArrival} onChange={handleInputChange} />
              Hàng mới (New)
            </label>
            <label className="form-checkbox">
              <input type="checkbox" name="isTrending" checked={formData.isTrending} onChange={handleInputChange} />
              Xu hướng (Trending)
            </label>
          </div>
        </div>

        <div className="admin-form-actions">
          <button type="button" onClick={() => navigate('/admin/products')} className="admin-btn-primary" style={{ background: '#f1f5f9', color: '#475569' }}>
            Hủy bỏ
          </button>
          <button type="submit" disabled={loading} className="admin-btn-primary">
            {loading ? <div className="loader" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div> : <Save size={18} />}
            {isEdit ? 'Cập nhật Sản phẩm' : 'Lưu sản phẩm'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminAddProduct;
