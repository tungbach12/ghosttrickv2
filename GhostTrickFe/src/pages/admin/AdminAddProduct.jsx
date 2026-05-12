import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import colorService from '../../services/colorService';
import { Save, X, Plus, Trash2, Upload, AlertCircle, Palette, RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableImageItem = ({ id, url, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    cursor: 'grab'
  };

  return (
    <div ref={setNodeRef} style={style} className="image-grid-item" {...attributes} {...listeners}>
      <img src={url} alt="Gallery" />
      <button type="button" className="remove-img-overlay" onClick={(e) => {
        e.stopPropagation();
        onRemove(id);
      }} onPointerDown={(e) => e.stopPropagation()}>
        <X size={14} />
      </button>
    </div>
  );
};


const AdminAddProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const isEdit = !!id;

  const [categories, setCategories] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizeCharts, setSizeCharts] = useState([]);
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
    manualSalesCount: '',
    sizeChartId: ''
  });

  const [groupedVariants, setGroupedVariants] = useState([{ colorId: '', sizes: [{ size: '', stock: 0, lowStockThreshold: 5 }] }]);
  const [mainImage, setMainImage] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState(null);
  
  // Combined images for DnD
  const [combinedImages, setCombinedImages] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, colorRes, sizeRes] = await Promise.all([
          api.get('/categories'),
          colorService.getColors(),
          api.get('/sizecharts')
        ]);
        setCategories(catRes.data);
        setColors(colorRes);
        setSizeCharts(sizeRes.data);
      } catch (err) {
        addToast('Không thể tải dữ liệu', 'error');
      }
    };
    fetchData();

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
            categoryId: p.categoryId || '',
            subcategory: p.subcategory || '',
            isOnSale: p.isOnSale,
            isNewArrival: p.isNewArrival,
            isTrending: p.isTrending,
            status: p.status,
            manualSalesCount: p.manualSalesCount ?? '',
            sizeChartId: p.sizeChartId || ''
          });
          
          // Reconstruct grouped variants from flat list
          const groups = [];
          p.variants.forEach(v => {
            let group = groups.find(g => g.colorId == v.colorId);
            if (!group) {
              group = { colorId: v.colorId, sizes: [] };
              groups.push(group);
            }
            group.sizes.push({ size: v.size, stock: v.stock, lowStockThreshold: v.lowStockThreshold });
          });
          setGroupedVariants(groups.length > 0 ? groups : [{ colorId: '', sizes: [{ size: '', stock: 0, lowStockThreshold: 5 }] }]);
          
          setMainImagePreview(p.mainImageUrl);
          setCombinedImages((p.images || []).map((url, i) => ({
            id: `existing-${i}-${Date.now()}`,
            type: 'existing',
            url: url,
            file: null
          })));
        } catch (err) {
          addToast('Không thể tải thông tin sản phẩm', 'error');
        }
      };
      fetchProduct();
    }
  }, [id, isEdit]);

  // Auto-generate SKU for new products when category is selected
  useEffect(() => {
    if (!isEdit && !formData.sku && formData.categoryId) {
      generateSKU();
    }
  }, [formData.categoryId, isEdit]);

  const generateSKU = () => {
    const category = categories.find(c => c.id === Number(formData.categoryId) || c.id === formData.categoryId);
    const prefix = category ? category.name.substring(0, 2).toUpperCase() : 'XX';
    const random = Math.floor(1000 + Math.random() * 9000);
    const timestamp = new Date().getTime().toString().slice(-3);
    const newSku = `GT-${prefix}${random}${timestamp}`;
    
    setFormData(prev => ({ ...prev, sku: newSku }));
    if (errors.sku) {
      setErrors(prev => ({ ...prev, sku: null }));
    }
  };

  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCombinedImages((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

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

  const handleOtherImagesChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        addToast(`${file.name} quá lớn, tối đa 5MB`, 'warning');
        return false;
      }
      return true;
    });

    const newItems = validFiles.map((file, i) => ({
      id: `new-${Date.now()}-${i}`,
      type: 'new',
      url: URL.createObjectURL(file),
      file: file
    }));
    
    setCombinedImages(prev => [...prev, ...newItems]);
  };

  const removeCombinedImage = (id) => {
    setCombinedImages(prev => prev.filter(img => img.id !== id));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Tên sản phẩm không được để trống';
    if (!formData.sku.trim()) newErrors.sku = 'SKU không được để trống';
    if (!formData.categoryId) newErrors.categoryId = 'Vui lòng chọn danh mục';
    if (formData.price <= 0) newErrors.price = 'Giá phải lớn hơn 0';
    if (!isEdit && !mainImage) newErrors.mainImage = 'Vui lòng chọn ảnh đại diện';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return false;

    // Validate Variants
    if (groupedVariants.length === 0) {
      addToast('Vui lòng thêm ít nhất một biến thể (nhóm màu)', 'error');
      return false;
    }
    for (let i = 0; i < groupedVariants.length; i++) {
      const g = groupedVariants[i];
      if (!g.colorId) {
        addToast('Vui lòng chọn màu sắc cho tất cả các nhóm', 'error');
        return false;
      }
      if (g.sizes.length === 0) {
        addToast('Vui lòng thêm ít nhất một kích thước cho mỗi màu', 'error');
        return false;
      }
      for (let j = 0; j < g.sizes.length; j++) {
        if (!g.sizes[j].size.trim()) {
          addToast('Vui lòng nhập tên kích thước (S, M, L...)', 'error');
          return false;
        }
      }
    }

    return true;
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
      
      // Append all form data
      Object.keys(formData).forEach(key => {
        // Handle manualSalesCount: send null if empty string
        if (key === 'manualSalesCount' || key === 'sizeChartId') {
          if (formData[key] !== '' && formData[key] !== null) {
            data.append(key, formData[key]);
          }
        } else {
          data.append(key, formData[key]);
        }
      });

      let flatIndex = 0;
      groupedVariants.forEach(group => {
        group.sizes.forEach(s => {
          data.append(`Variants[${flatIndex}].ColorId`, group.colorId);
          data.append(`Variants[${flatIndex}].Size`, s.size);
          data.append(`Variants[${flatIndex}].Stock`, s.stock);
          data.append(`Variants[${flatIndex}].LowStockThreshold`, s.lowStockThreshold);
          flatIndex++;
        });
      });

      if (mainImage) {
        data.append('MainImage', mainImage);
      }

      // Preserve the order established by drag-and-drop
      let existingIndex = 0;
      combinedImages.forEach((img) => {
        if (img.type === 'existing') {
          data.append(`ExistingImages[${existingIndex}]`, img.url);
          existingIndex++;
        } else if (img.type === 'new' && img.file) {
          data.append('OtherImages', img.file);
        }
      });

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
      let msg = 'Có lỗi xảy ra khi lưu sản phẩm';
      if (error.response?.data?.errors) {
        // Lấy lỗi đầu tiên từ object errors của .NET
        const firstErrorKey = Object.keys(error.response.data.errors)[0];
        const firstErrorList = error.response.data.errors[firstErrorKey];
        msg = Array.isArray(firstErrorList) ? firstErrorList[0] : firstErrorList;
      } else if (error.response?.data?.message) {
        msg = error.response.data.message;
      } else if (error.response?.data?.title) {
        msg = error.response.data.title;
      }
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
              {errors.name && <div className="error-message"><AlertCircle size={14} /> {errors.name}</div>}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>SKU</label>
                <button 
                  type="button" 
                  onClick={generateSKU}
                  className="sku-gen-btn"
                >
                  <RefreshCw size={12} /> Tự động tạo
                </button>
              </div>
              <input
                type="text" name="sku" value={formData.sku} onChange={handleInputChange}
                className={`form-control ${errors.sku ? 'is-invalid' : ''}`}
                placeholder="VD: GT-001"
              />
              {errors.sku && <div className="error-message"><AlertCircle size={14} /> {errors.sku}</div>}
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
              {errors.categoryId && <div className="error-message"><AlertCircle size={14} /> {errors.categoryId}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Giá bán (VND)</label>
              <input
                type="number" name="price" value={formData.price} onChange={handleInputChange}
                className={`form-control ${errors.price ? 'is-invalid' : ''}`}
              />
              {errors.price && <div className="error-message"><AlertCircle size={14} /> {errors.price}</div>}
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

            <div className="form-group">
              <label className="form-label">Bảng size</label>
              <select
                name="sizeChartId" value={formData.sizeChartId} onChange={handleInputChange}
                className="form-control"
              >
                <option value="">Không sử dụng</option>
                {sizeCharts.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Lượt bán hiển thị (Ghi đè)</label>
              <input
                type="number" 
                name="manualSalesCount" 
                value={formData.manualSalesCount} 
                onChange={handleInputChange}
                className="form-control"
                placeholder="Để trống để dùng lượt bán thực tế"
              />
              <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                Nếu nhập số này, hệ thống sẽ hiển thị số này thay vì lượt bán thực từ đơn hàng.
              </p>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Mô tả sản phẩm</label>
              <div className="quill-wrapper">
                <ReactQuill 
                  theme="snow" 
                  value={formData.description} 
                  onChange={(val) => setFormData(prev => ({ ...prev, description: val }))}
                  placeholder="Mô tả chi tiết về sản phẩm..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Images */}
        <div className={`admin-card ${errors.mainImage ? 'is-invalid-card' : ''}`} style={errors.mainImage ? { borderColor: '#ef4444' } : {}}>
          <h3 className="admin-section-title">Hình ảnh sản phẩm</h3>
          
          {/* Main Image */}
          <div className="upload-area" style={{ marginBottom: '32px' }}>
            <div className={`preview-box ${errors.mainImage ? 'is-invalid' : ''}`}>
              {mainImagePreview ? (
                <img src={mainImagePreview} alt="Preview" />
              ) : (
                <Upload size={32} color={errors.mainImage ? '#ef4444' : '#cbd5e1'} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '8px' }}>Ảnh đại diện sản phẩm (Bắt buộc)</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '12px' }}>Hỗ trợ JPG, PNG. Tối đa 5MB.</p>
              <input type="file" onChange={handleImageChange} accept="image/*" name="mainImage" />
              {errors.mainImage && <div className="error-message"><AlertCircle size={14} /> {errors.mainImage}</div>}
            </div>
          </div>

          {/* Other Images */}
          <div className="other-images-section">
            <p style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '16px' }}>Ảnh chi tiết khác</p>
            
            <div className="images-grid">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={combinedImages.map(img => img.id)} strategy={rectSortingStrategy}>
                  {combinedImages.map((img) => (
                    <SortableImageItem key={img.id} id={img.id} url={img.url} onRemove={removeCombinedImage} />
                  ))}
                </SortableContext>
              </DndContext>

              {/* Add More Button */}
              <label className="add-image-box">
                <input type="file" multiple onChange={handleOtherImagesChange} accept="image/*" style={{ display: 'none' }} />
                <Plus size={24} color="#94a3b8" />
                <span>Thêm ảnh</span>
              </label>
            </div>
          </div>
        </div>

        {/* Variants Section - Grouped by Color */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h3 className="admin-section-title" style={{ marginBottom: '4px', border: 'none' }}>Biến thể sản phẩm</h3>
              <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Quản lý kích thước theo từng nhóm màu sắc.</p>
            </div>
            <button 
              type="button" 
              onClick={() => {
                setGroupedVariants([...groupedVariants, { colorId: '', sizes: [{ size: '', stock: 0, lowStockThreshold: 5 }] }]);
              }} 
              className="admin-btn-primary" 
              style={{ padding: '8px 16px', fontSize: '0.8rem' }}
            >
              <Plus size={16} /> Thêm nhóm màu mới
            </button>
          </div>

          <div className="grouped-variants-container">
            {groupedVariants.length === 0 ? (
              <div className="empty-variants-state">
                <Palette size={32} color="#cbd5e1" />
                <p>Bấm "Thêm nhóm màu mới" để bắt đầu thiết lập biến thể.</p>
              </div>
            ) : (
              groupedVariants.map((group, groupIdx) => (
                <div key={groupIdx} className="color-variant-group">
                  <div className="group-header">
                    <div className="color-selector-wrapper">
                      <Palette size={16} color="#64748b" />
                      <select 
                        value={group.colorId} 
                        onChange={(e) => {
                          const val = e.target.value;
                          const exists = groupedVariants.some((g, i) => i !== groupIdx && g.colorId === val && val !== '');
                          if (exists) {
                            addToast('Màu sắc này đã có trong nhóm khác!', 'warning');
                            return;
                          }
                          const newGroups = [...groupedVariants];
                          newGroups[groupIdx].colorId = val;
                          setGroupedVariants(newGroups);
                        }}
                        className="color-select-minimal"
                      >
                        <option value="">Chọn màu sắc...</option>
                        {colors.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        // Removed window.confirm as requested/implied by "ko hoạt động"
                        setGroupedVariants(groupedVariants.filter((_, i) => i !== groupIdx));
                      }}
                      className="remove-group-btn"
                    >
                      <Trash2 size={14} /> Xóa nhóm màu
                    </button>
                  </div>

                  <div className="group-body">
                    <table className="variant-table-minimal">
                      <thead>
                        <tr>
                          <th>KÍCH THƯỚC</th>
                          <th>SỐ LƯỢNG KHO</th>
                          <th>CẢNH BÁO</th>
                          <th style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.sizes.map((s, sizeIdx) => {
                          const isDuplicateSize = group.sizes.some((other, i) => 
                            i !== sizeIdx && 
                            other.size.trim() !== '' && 
                            other.size.trim().toUpperCase() === s.size.trim().toUpperCase()
                          );

                          return (
                            <tr key={sizeIdx} className={isDuplicateSize ? 'duplicate-row' : ''}>
                              <td>
                                <input 
                                  type="text" 
                                  placeholder="VD: S, M, L..." 
                                  value={s.size} 
                                  onChange={(e) => {
                                    const newGroups = [...groupedVariants];
                                    newGroups[groupIdx].sizes[sizeIdx].size = e.target.value;
                                    setGroupedVariants(newGroups);
                                  }}
                                  className={`variant-input-minimal ${isDuplicateSize ? 'error' : ''}`}
                                />
                              </td>
                              <td>
                                <input 
                                  type="number" 
                                  value={s.stock} 
                                  onChange={(e) => {
                                    const newGroups = [...groupedVariants];
                                    newGroups[groupIdx].sizes[sizeIdx].stock = Number(e.target.value);
                                    setGroupedVariants(newGroups);
                                  }}
                                  className="variant-input-minimal"
                                />
                              </td>
                              <td>
                                <input 
                                  type="number" 
                                  value={s.lowStockThreshold} 
                                  onChange={(e) => {
                                    const newGroups = [...groupedVariants];
                                    newGroups[groupIdx].sizes[sizeIdx].lowStockThreshold = Number(e.target.value);
                                    setGroupedVariants(newGroups);
                                  }}
                                  className="variant-input-minimal"
                                />
                              </td>
                              <td>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    const newGroups = [...groupedVariants];
                                    newGroups[groupIdx].sizes = group.sizes.filter((_, i) => i !== sizeIdx);
                                    if (newGroups[groupIdx].sizes.length === 0) {
                                      setGroupedVariants(groupedVariants.filter((_, i) => i !== groupIdx));
                                    } else {
                                      setGroupedVariants(newGroups);
                                    }
                                  }}
                                  className="remove-size-btn"
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <button 
                      type="button" 
                      onClick={() => {
                        const newGroups = [...groupedVariants];
                        newGroups[groupIdx].sizes.push({ size: '', stock: 0, lowStockThreshold: 5 });
                        setGroupedVariants(newGroups);
                      }}
                      className="add-size-row-btn"
                    >
                      <Plus size={14} /> Thêm kích thước
                    </button>
                    {group.sizes.some((s, i) => group.sizes.some((o, j) => i !== j && s.size.trim() !== '' && s.size.trim().toUpperCase() === o.size.trim().toUpperCase())) && (
                      <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '8px', fontWeight: '700' }}>
                        <AlertCircle size={10} /> Có kích thước bị trùng lặp trong nhóm này!
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          .grouped-variants-container { display: flex; flex-direction: column; gap: 20px; }
          .color-variant-group { border: 1px solid #f1f5f9; border-radius: 16px; overflow: hidden; background: white; transition: all 0.3s; }
          .color-variant-group:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .group-header { padding: 12px 20px; background: #f8fafc; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; }
          .color-selector-wrapper { display: flex; align-items: center; gap: 10px; }
          .color-select-minimal { border: none; background: transparent; font-weight: 800; font-size: 0.9rem; color: #0f172a; outline: none; cursor: pointer; }
          
          .remove-group-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; color: #f43f5e; font-size: 0.75rem; font-weight: 700; cursor: pointer; padding: 6px 12px; border-radius: 8px; transition: all 0.2s; }
          .remove-group-btn:hover { background: #fff1f2; transform: translateY(-1px); }
          
          .group-body { padding: 16px; }
          .variant-table-minimal { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          .variant-table-minimal th { text-align: left; font-size: 10px; font-weight: 800; color: #94a3b8; padding: 8px 12px; letter-spacing: 0.05em; }
          .variant-table-minimal td { padding: 4px 12px; }
          
          .variant-input-minimal { width: 100%; padding: 8px 0; border: none; border-bottom: 2px solid #f1f5f9; background: transparent; outline: none; font-size: 0.9rem; font-weight: 600; transition: all 0.2s; }
          .variant-input-minimal:focus { border-bottom-color: #0f172a; }
          .variant-input-minimal.error { border-bottom-color: #ef4444; color: #ef4444; }
          
          .remove-size-btn { background: none; border: none; color: #cbd5e1; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 4px; }
          .remove-size-btn:hover { background: #fee2e2; color: #ef4444; }
          
          .add-size-row-btn { width: 100%; padding: 10px; background: #f8fafc; border: 1px dashed #e2e8f0; border-radius: 10px; color: #64748b; font-size: 0.8rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; }
          .add-size-row-btn:hover { background: #f1f5f9; color: #0f172a; border-style: solid; border-color: #cbd5e1; }
          
          .empty-variants-state { padding: 40px; text-align: center; color: #94a3b8; background: #f8fafc; border-radius: 16px; border: 2px dashed #e2e8f0; }
          .empty-variants-state p { margin-top: 10px; font-size: 0.85rem; font-weight: 500; }
          
          .duplicate-row { background: #fff1f2; }

          .sku-gen-btn {
            background: #f1f5f9;
            border: none;
            color: #475569;
            font-size: 0.7rem;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s;
          }
          .sku-gen-btn:hover {
            background: #e2e8f0;
            color: #0f172a;
          }

          .other-images-section { border-top: 1px solid #f1f5f9; padding-top: 24px; }
          .images-grid { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; }
          .image-grid-item { width: 120px; position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; background: white; }
          .quill-wrapper .ql-container { min-height: 150px; font-size: 0.95rem; font-family: inherit; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; border-color: #e2e8f0; }
          .quill-wrapper .ql-toolbar { border-top-left-radius: 12px; border-top-right-radius: 12px; border-color: #e2e8f0; background: #f8fafc; }
          .quill-wrapper .ql-editor { min-height: 150px; padding: 16px; }
          .image-grid-item { position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
          .image-grid-item img { width: 100%; height: 100%; object-fit: cover; }
          .image-grid-item.new { border-color: #3b82f6; border-style: dashed; }
          .remove-img-overlay { position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
          .remove-img-overlay:hover { background: #ef4444; }
          .add-image-box { aspect-ratio: 1; border: 2px dashed #cbd5e1; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.2s; color: #64748b; font-size: 0.75rem; font-weight: 700; }
          .add-image-box:hover { border-color: #3b82f6; background: #f0f7ff; color: #3b82f6; }

          @media (max-width: 768px) {
            .admin-container-narrow { padding: 16px; }
            .admin-header-flex { flex-direction: column; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
            .admin-header-flex .action-btn { position: absolute; top: 16px; right: 16px; }
            
            .admin-form-grid { grid-template-columns: 1fr; gap: 16px; }
            .admin-form-grid .form-group { grid-column: span 1 !important; }
            
            .admin-card { padding: 20px; border-radius: 16px; }
            
            .upload-area { flex-direction: column; align-items: center; text-align: center; gap: 20px; }
            .preview-box { width: 100%; height: 200px; }
            
            .images-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
            
            .color-variant-group { border-radius: 12px; }
            .group-header { flex-direction: column; align-items: flex-start; gap: 12px; padding: 12px; }
            .remove-group-btn { width: 100%; justify-content: center; background: #fff1f2; }
            
            .variant-table-minimal { display: block; }
            .variant-table-minimal thead { display: none; }
            .variant-table-minimal tbody { display: flex; flex-direction: column; gap: 16px; }
            .variant-table-minimal tr { display: flex; flex-direction: column; gap: 8px; padding-bottom: 16px; border-bottom: 1px dashed #f1f5f9; position: relative; }
            .variant-table-minimal td { padding: 0; }
            .variant-table-minimal td:last-child { position: absolute; top: 0; right: 0; }
            
            .variant-input-minimal { border: 1px solid #f1f5f9; padding: 8px 12px; border-radius: 8px; background: #f8fafc; }
            
            .variant-table-minimal tr::before { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; display: block; }
            .variant-table-minimal tr td:nth-child(1)::before { content: 'Kích thước'; }
            .variant-table-minimal tr td:nth-child(2)::before { content: 'Số lượng kho'; }
            .variant-table-minimal tr td:nth-child(3)::before { content: 'Cảnh báo tồn kho'; }
            
            .admin-form-actions { flex-direction: column; gap: 12px; }
            .admin-form-actions button { width: 100%; justify-content: center; }
          }
        `}} />

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
