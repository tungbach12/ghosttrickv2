import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import saleService from '../../services/saleService';
import { productService } from '../../services/productService';
import { Save, X, Calendar, Search, Check, Package, Upload, Crop, AlertCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const ASPECT_RATIOS = [
  { label: 'Standard Banner (21:9)', value: 21 / 9 },
  { label: 'Panoramic (16:5)', value: 16 / 5 },
  { label: 'Widescreen (16:9)', value: 16 / 9 },
  { label: 'Square (1:1)', value: 1 / 1 },
];

const getCroppedImg = (imageSrc, pixelCrop) => {
  const canvas = document.createElement('canvas');
  const image = new Image();
  image.src = imageSrc;

  return new Promise((resolve, reject) => {
    image.onload = () => {
      const ctx = canvas.getContext('2d');
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Canvas is empty'));
        const file = new File([blob], 'banner-cropped.jpg', { type: 'image/jpeg' });
        resolve({ file, url: URL.createObjectURL(blob) });
      }, 'image/jpeg');
    };
    image.onerror = (e) => reject(e);
  });
};

const AdminAddSale = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]); // Array of { productId, salePrice, flashStock }
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    startTime: '',
    endTime: '',
    isActive: false
  });

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(ASPECT_RATIOS[0].value);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedImageFile, setCroppedImageFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setProductsLoading(true);
      try {
        const pResponse = await productService.getProducts({ pageSize: 1000 });
        setAllProducts(pResponse.items || []);

        if (isEdit) {
          const sResponse = await saleService.getSaleById(id);
          const s = sResponse.data;
          
          const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            return d.toISOString().slice(0, 16);
          };

          setFormData({
            name: s.name,
            slug: s.slug,
            description: s.description || '',
            startTime: formatDate(s.startTime),
            endTime: formatDate(s.endTime),
            isActive: s.isActive
          });
          setBannerPreview(s.bannerUrl);
          
          // Map existing products
          const existing = (s.products || []).map(p => ({
            productId: p.id,
            salePrice: p.price,
            flashStock: p.flashStock || 10
          }));
          setSelectedProducts(existing);
        }
      } catch (error) {
        addToast('Không thể tải dữ liệu', 'error');
      } finally {
        setProductsLoading(false);
      }
    };
    fetchData();
  }, [id, isEdit]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    if (name === 'name' && !isEdit && !formData.slug) {
      const generatedSlug = value.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
      setFormData(prev => ({ ...prev, slug: generatedSlug }));
    }
  };

  const onFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        addToast('File quá lớn, tối đa 5MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result);
        setIsCropping(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    try {
      const { file, url } = await getCroppedImg(imageSrc, croppedAreaPixels);
      setCroppedImageFile(file);
      setBannerPreview(url);
      setIsCropping(false);
      setImageSrc(null);
      if (errors.banner) {
        setErrors(prev => ({ ...prev, banner: null }));
      }
    } catch (e) {
      addToast('Lỗi khi cắt ảnh', 'error');
    }
  };

  const toggleProductSelection = (product) => {
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.productId === product.id);
      if (exists) {
        return prev.filter(p => p.productId !== product.id);
      } else {
        return [...prev, {
          productId: product.id,
          salePrice: Math.floor(product.price * 0.7), // Default 30% off
          flashStock: 10
        }];
      }
    });
  };

  const updateProductConfig = (productId, field, value) => {
    setSelectedProducts(prev => prev.map(p => 
      p.productId === productId ? { ...p, [field]: Number(value) } : p
    ));
  };

  const selectAll = () => {
    const all = allProducts.map(p => ({
      productId: p.id,
      salePrice: Math.floor(p.price * 0.7),
      flashStock: 10
    }));
    setSelectedProducts(all);
  };

  const deselectAll = () => {
    setSelectedProducts([]);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Tên chương trình không được để trống';
    if (!formData.slug.trim()) newErrors.slug = 'Slug không được để trống';
    if (!formData.startTime) newErrors.startTime = 'Vui lòng chọn thời gian bắt đầu';
    if (!formData.endTime) newErrors.endTime = 'Vui lòng chọn thời gian kết thúc';
    
    if (formData.startTime && formData.endTime) {
      if (new Date(formData.startTime) >= new Date(formData.endTime)) {
        newErrors.endTime = 'Thời gian kết thúc phải sau thời gian bắt đầu';
      }
    }

    if (!isEdit && !croppedImageFile && !bannerPreview) {
      newErrors.banner = 'Vui lòng tải lên banner cho chương trình';
    }

    if (selectedProducts.length === 0) {
      addToast('Cảnh báo: Bạn chưa chọn sản phẩm nào cho đợt sale này', 'warning');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isCropping) return;
    
    if (!validate()) {
      addToast('Vui lòng hoàn thiện các thông tin còn thiếu', 'error');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('slug', formData.slug);
      data.append('description', formData.description || '');
      data.append('startTime', formData.startTime);
      data.append('endTime', formData.endTime);
      data.append('isActive', formData.isActive);
      
      if (croppedImageFile) {
        data.append('bannerFile', croppedImageFile);
      }

      let saleId = id;
      if (isEdit) {
        await saleService.updateSale(id, data);
        addToast('Cập nhật đợt sale thành công', 'success');
      } else {
        const response = await saleService.createSale(data);
        saleId = response.data.id;
        addToast('Tạo đợt sale thành công', 'success');
      }

      // Sync products with prices and stocks
      await saleService.assignProducts(saleId, selectedProducts);
      navigate('/admin/sales');
    } catch (error) {
      console.error('Error saving sale:', error);
      const msg = error.response?.data?.message || 'Có lỗi xảy ra khi lưu đợt sale';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = allProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="admin-page-container">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">{isEdit ? 'Chỉnh sửa đợt Sale' : 'Tạo đợt Sale mới'}</h1>
          <p className="admin-subtitle">Quản lý nội dung và danh sách sản phẩm áp dụng khuyến mãi.</p>
        </div>
        <div className="admin-actions">
          <button className="gt-btn-cancel" onClick={() => navigate('/admin/sales')}>
            <X size={18} /> Hủy
          </button>
          <button className="gt-btn-submit" onClick={handleSubmit} disabled={loading || isCropping}>
            {loading ? <div className="loader" style={{ width: '18px', height: '18px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div> : <Save size={18} />}
            {loading ? 'Đang lưu...' : 'Lưu đợt Sale'}
          </button>
        </div>
      </div>

      <div className="admin-content-grid">
        <div className="admin-card main-form">
          <form id="sale-form" onSubmit={handleSubmit} noValidate>
            <div className="gt-form-section">
              <h3 className="section-title">Thông tin cơ bản</h3>
              <div className="gt-form-grid">
                <div className="gt-form-group span-2">
                  <label>Tên chương trình</label>
                  <input 
                    type="text" name="name" 
                    value={formData.name} onChange={handleInputChange} 
                    className={errors.name ? 'is-invalid' : ''}
                    placeholder="VD: Sale Hè Rực Rỡ 2026" 
                  />
                  {errors.name && <div className="error-message"><AlertCircle size={14}/> {errors.name}</div>}
                </div>
                <div className="gt-form-group">
                  <label>Slug (Đường dẫn)</label>
                  <input 
                    type="text" name="slug" 
                    value={formData.slug} onChange={handleInputChange} 
                    className={errors.slug ? 'is-invalid' : ''}
                    placeholder="VD: sale-he-2026" 
                  />
                  {errors.slug && <div className="error-message"><AlertCircle size={14}/> {errors.slug}</div>}
                </div>
                <div className="gt-form-group">
                  <label>Trạng thái kích hoạt</label>
                  <div className="toggle-container">
                    <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleInputChange} id="isActive" />
                    <label htmlFor="isActive" className="toggle-label">{formData.isActive ? 'Đang kích hoạt' : 'Đang tạm dừng'}</label>
                  </div>
                </div>
                <div className="gt-form-group">
                  <label>Thời gian bắt đầu</label>
                  <div className={`input-with-icon ${errors.startTime ? 'is-invalid' : ''}`}>
                    <Calendar size={16} />
                    <input 
                      type="datetime-local" name="startTime" 
                      value={formData.startTime} onChange={handleInputChange} 
                      className={errors.startTime ? 'is-invalid' : ''}
                    />
                  </div>
                  {errors.startTime && <div className="error-message"><AlertCircle size={14}/> {errors.startTime}</div>}
                </div>
                <div className="gt-form-group">
                  <label>Thời gian kết thúc</label>
                  <div className={`input-with-icon ${errors.endTime ? 'is-invalid' : ''}`}>
                    <Calendar size={16} />
                    <input 
                      type="datetime-local" name="endTime" 
                      value={formData.endTime} onChange={handleInputChange} 
                      className={errors.endTime ? 'is-invalid' : ''}
                    />
                  </div>
                  {errors.endTime && <div className="error-message"><AlertCircle size={14}/> {errors.endTime}</div>}
                </div>
                
                <div className="gt-form-group span-2">
                  <label>Banner Chương trình</label>
                  <div className={`banner-upload-area ${errors.banner ? 'is-invalid' : ''}`} style={errors.banner ? {borderColor: '#ef4444'} : {}}>
                    {isCropping ? (
                      <div className="cropper-container">
                        <div className="aspect-ratio-selector">
                          {ASPECT_RATIOS.map((ratio) => (
                            <button
                              key={ratio.value}
                              type="button"
                              className={`aspect-btn ${aspect === ratio.value ? 'active' : ''}`}
                              onClick={() => setAspect(ratio.value)}
                            >
                              {ratio.label}
                            </button>
                          ))}
                        </div>
                        <div className="cropper-wrapper">
                          <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={aspect}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                          />
                        </div>
                        <div className="cropper-controls">
                          <div className="zoom-control">
                            <span>Zoom</span>
                            <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(e.target.value)} className="zoom-range" />
                          </div>
                          <div className="cropper-actions">
                            <button type="button" className="btn-crop-cancel" onClick={() => setIsCropping(false)}>Hủy</button>
                            <button type="button" className="btn-crop-save" onClick={handleCropSave}>Cắt ảnh</button>
                          </div>
                        </div>
                      </div>
                    ) : bannerPreview ? (
                      <div className="banner-preview">
                        <img src={bannerPreview} alt="Banner preview" />
                        <div className="banner-overlay-actions">
                           <label className="change-img-btn">
                            <Upload size={14} /> Thay đổi
                            <input type="file" accept="image/*" onChange={onFileChange} hidden />
                          </label>
                          <button type="button" className="remove-img-btn" onClick={() => { setCroppedImageFile(null); setBannerPreview(null); }}>
                            <X size={14} /> Gỡ bỏ
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="upload-placeholder">
                        <Upload size={32} color={errors.banner ? '#ef4444' : '#64748b'} />
                        <span style={errors.banner ? {color: '#ef4444'} : {}}>Nhấn để tải lên ảnh Banner</span>
                        <input type="file" accept="image/*" onChange={onFileChange} hidden />
                      </label>
                    )}
                  </div>
                  {errors.banner && <div className="error-message"><AlertCircle size={14}/> {errors.banner}</div>}
                </div>

                <div className="gt-form-group span-2">
                  <label>Mô tả chương trình</label>
                  <textarea rows="4" name="description" value={formData.description} onChange={handleInputChange} placeholder="Thông tin chi tiết về chương trình sale này..." />
                </div>
              </div>
            </div>

            <div className="gt-form-section" style={{ marginTop: '32px' }}>
              <div className="section-header">
                <h3 className="section-title">Sản phẩm áp dụng</h3>
                <div className="section-actions">
                  <button type="button" onClick={selectAll} className="text-btn">Chọn tất cả</button>
                  <button type="button" onClick={deselectAll} className="text-btn">Bỏ chọn</button>
                </div>
              </div>

              <div className="product-selector-container">
                <div className="search-bar">
                  <Search size={18} />
                  <input type="text" placeholder="Tìm sản phẩm theo tên hoặc SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>

                <div className="products-selection-grid">
                  {productsLoading ? (
                    <div className="loading-state">Đang tải danh sách sản phẩm...</div>
                  ) : filteredProducts.length > 0 ? (
                    filteredProducts.map(product => {
                      const isSelected = selectedProducts.some(p => p.productId === product.id);
                      return (
                        <div key={product.id} className={`selection-item ${isSelected ? 'selected' : ''}`} onClick={() => toggleProductSelection(product)}>
                          <div className="item-img"><img src={product.mainImageUrl} alt="" /></div>
                          <div className="item-info">
                            <div className="item-name">{product.name}</div>
                            <div className="item-meta">
                              <span>SKU: {product.sku}</span>
                              <span>•</span>
                              <span className="price">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}</span>
                            </div>
                          </div>
                          <div className="check-box">{isSelected && <Check size={14} />}</div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-state">Không tìm thấy sản phẩm phù hợp.</div>
                  )}
                </div>
              </div>
              
              {selectedProducts.length > 0 && (
                <div className="selected-configs" style={{ marginTop: '32px' }}>
                  <h4 className="config-title">Cấu hình giá và kho Sale ({selectedProducts.length})</h4>
                  <div className="config-list">
                    {selectedProducts.map(sp => {
                      const product = allProducts.find(p => p.id === sp.productId);
                      if (!product) return null;
                      return (
                        <div key={sp.productId} className="config-item">
                          <div className="config-product-info">
                            <img src={product.mainImageUrl} alt="" />
                            <span>{product.name}</span>
                          </div>
                          <div className="config-inputs">
                            <div className="config-field">
                              <label>Giá Sale (VND)</label>
                              <input 
                                type="number" 
                                value={sp.salePrice} 
                                onChange={(e) => updateProductConfig(sp.productId, 'salePrice', e.target.value)} 
                              />
                            </div>
                            <div className="config-field">
                              <label>Số lượng Sale</label>
                              <input 
                                type="number" 
                                value={sp.flashStock} 
                                onChange={(e) => updateProductConfig(sp.productId, 'flashStock', e.target.value)} 
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="selection-stats">
                <Package size={16} />
                <span>Đã chọn <strong>{selectedProducts.length}</strong> sản phẩm áp dụng giảm giá.</span>
              </div>
            </div>
          </form>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .admin-page-container { padding: 32px; max-width: 1200px; margin: 0 auto; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        .admin-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
        .admin-title { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0; }
        .admin-subtitle { color: #64748b; margin: 4px 0 0 0; }
        .admin-actions { display: flex; gap: 12px; }
        .admin-card { background: white; border-radius: 24px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; }
        .section-title { font-size: 1.1rem; font-weight: 800; color: #1e293b; margin-bottom: 24px; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .text-btn { background: none; border: none; color: #3b82f6; font-weight: 700; font-size: 0.85rem; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: all 0.2s; }
        .gt-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .gt-form-group { display: flex; flex-direction: column; gap: 8px; }
        .gt-form-group.span-2 { grid-column: span 2; }
        .gt-form-group label { font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
        .gt-form-group input, .gt-form-group textarea { padding: 12px 16px; border: 2px solid #f1f5f9; border-radius: 12px; font-size: 1rem; transition: all 0.2s; background: #f8fafc; outline: none; }
        .gt-form-group input:focus, .gt-form-group textarea:focus { border-color: #0f172a; background: #fff; }
        
        .input-with-icon { position: relative; display: flex; align-items: center; }
        .input-with-icon svg { position: absolute; left: 14px; color: #94a3b8; z-index: 1; }
        .input-with-icon input { padding-left: 44px; width: 100%; }
        
        .banner-upload-area { border: 2px dashed #e2e8f0; border-radius: 24px; min-height: 250px; position: relative; overflow: hidden; background: #f8fafc; transition: all 0.2s; }
        .upload-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 250px; cursor: pointer; color: #64748b; transition: all 0.2s; }
        
        .cropper-container { width: 100%; height: 500px; display: flex; flex-direction: column; }
        .aspect-ratio-selector { display: flex; gap: 8px; padding: 12px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; }
        .aspect-btn { padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; background: white; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .aspect-btn.active { background: #0f172a; color: white; border-color: #0f172a; }
        .cropper-wrapper { flex: 1; position: relative; background: #000; }
        .cropper-controls { padding: 16px; background: white; border-top: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
        .zoom-control { display: flex; align-items: center; gap: 12px; flex: 1; color: #64748b; font-size: 0.8rem; font-weight: 700; }
        .zoom-range { flex: 0.6; height: 6px; background: #f1f5f9; border-radius: 3px; outline: none; appearance: none; }
        .zoom-range::-webkit-slider-thumb { appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #3b82f6; cursor: pointer; }
        .cropper-actions { display: flex; gap: 12px; }
        .btn-crop-cancel { padding: 8px 16px; border-radius: 8px; border: none; background: #f1f5f9; color: #475569; font-weight: 600; cursor: pointer; }
        .btn-crop-save { padding: 8px 24px; border-radius: 8px; border: none; background: #3b82f6; color: white; font-weight: 600; cursor: pointer; }
 
        .banner-preview { position: relative; width: 100%; }
        .banner-preview img { width: 100%; height: auto; display: block; border-radius: 24px; }
        .banner-overlay-actions { position: absolute; bottom: 20px; right: 20px; display: flex; gap: 10px; }
        .change-img-btn, .remove-img-btn { background: rgba(255,255,255,0.9); backdrop-filter: blur(8px); padding: 8px 16px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 8px; cursor: pointer; border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .remove-img-btn { color: #ef4444; }
 
        .toggle-container { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
        .gt-btn-cancel { padding: 12px 24px; border-radius: 14px; font-weight: 700; background: #f1f5f9; color: #475569; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .gt-btn-submit { padding: 12px 24px; border-radius: 14px; font-weight: 700; background: #0f172a; color: white; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; min-width: 160px; justify-content: center; }
        .gt-btn-submit:hover { background: #1e293b; transform: translateY(-2px); }
        .product-selector-container { border: 2px solid #f1f5f9; border-radius: 20px; overflow: hidden; }
        .search-bar { padding: 16px; background: #f8fafc; border-bottom: 2px solid #f1f5f9; display: flex; align-items: center; gap: 12px; }
        .search-bar input { flex: 1; border: none; background: none; font-size: 0.95rem; outline: none; }
        .products-selection-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; padding: 16px; max-height: 400px; overflow-y: auto; background: white; }
        .selection-item { display: flex; align-items: center; gap: 16px; padding: 12px; border-radius: 16px; border: 2px solid #f8fafc; cursor: pointer; transition: all 0.2s; position: relative; }
        .selection-item.selected { border-color: #3b82f6; background: #eff6ff; }
        .item-img img { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; }
        .item-name { font-weight: 700; color: #1e293b; font-size: 0.9rem; margin-bottom: 4px; }
        .check-box { width: 20px; height: 20px; border-radius: 6px; border: 2px solid #e2e8f0; margin-left: auto; display: flex; align-items: center; justify-content: center; }
        .selected .check-box { background: #3b82f6; border-color: #3b82f6; color: white; }
        .selection-stats { margin-top: 16px; padding: 12px 20px; background: #f0f9ff; border-radius: 12px; color: #0369a1; font-size: 0.9rem; display: flex; align-items: center; gap: 10px; }
        
        .config-title { font-size: 1rem; font-weight: 800; color: #1e293b; margin-bottom: 16px; border-left: 4px solid #3b82f6; padding-left: 12px; }
        .config-list { display: flex; flex-direction: column; gap: 12px; }
        .config-item { display: flex; align-items: center; justify-content: space-between; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; gap: 24px; }
        .config-product-info { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .config-product-info img { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; }
        .config-product-info span { font-weight: 700; color: #334155; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .config-inputs { display: flex; gap: 16px; }
        .config-field { display: flex; flex-direction: column; gap: 4px; }
        .config-field label { font-size: 0.65rem; font-weight: 800; color: #64748b; text-transform: uppercase; }
        .config-field input { padding: 8px 12px !important; border: 1px solid #cbd5e1 !important; border-radius: 8px !important; width: 120px !important; font-size: 0.9rem !important; }

        @media (max-width: 768px) {
          .admin-page-container { padding: 16px; }
          .admin-header { flex-direction: column; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
          .admin-title { font-size: 1.5rem; }
          .admin-actions { width: 100%; flex-direction: column; gap: 8px; }
          .gt-btn-cancel, .gt-btn-submit { width: 100%; }
          .admin-card { padding: 20px; border-radius: 16px; }
          
          .gt-form-grid { grid-template-columns: 1fr; gap: 16px; }
          .gt-form-group.span-2 { grid-column: span 1; }
          
          .cropper-container { height: 400px; }
          .aspect-ratio-selector { overflow-x: auto; white-space: nowrap; padding: 8px; }
          .cropper-controls { flex-direction: column; gap: 16px; }
          .zoom-control { width: 100%; }
          .cropper-actions { width: 100%; }
          .btn-crop-cancel, .btn-crop-save { flex: 1; }
          
          .banner-overlay-actions { bottom: 10px; right: 10px; flex-direction: column; gap: 8px; }
          .change-img-btn, .remove-img-btn { width: 100%; justify-content: center; }
          
          .products-selection-grid { grid-template-columns: 1fr; }
          .selection-item { padding: 10px; }
          .item-img img { width: 48px; height: 48px; }
          .item-name { font-size: 0.85rem; }
          
          .config-item { flex-direction: column; align-items: flex-start; gap: 16px; }
          .config-product-info { width: 100%; }
          .config-inputs { width: 100%; flex-direction: column; gap: 12px; }
          .config-field input { width: 100% !important; }
        }
        `
      }} />
    </div>
  );
};

export default AdminAddSale;
