import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import homeBannerService from '../../services/homeBannerService';
import { Save, X, Upload, Crop, ExternalLink, Type, ListOrdered, AlertCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const ASPECT_RATIOS = [
  { label: 'Standard Banner (21:9)', value: 21 / 9 },
  { label: 'Widescreen (16:9)', value: 16 / 9 },
  { label: 'Panoramic (16:5)', value: 16 / 5 },
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

const AdminAddHomeBanner = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    linkUrl: '',
    displayOrder: 0,
    isActive: true
  });

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(ASPECT_RATIOS[0].value);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedImageFile, setCroppedImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    if (isEdit) {
      const fetchBanner = async () => {
        try {
          const response = await homeBannerService.getAdminBanners();
          const banner = response.data.find(b => b.id === parseInt(id));
          if (banner) {
            setFormData({
              title: banner.title,
              subtitle: banner.subtitle || '',
              linkUrl: banner.linkUrl || '',
              displayOrder: banner.displayOrder,
              isActive: banner.isActive
            });
            setPreviewUrl(banner.imageUrl);
          }
        } catch (error) {
          addToast('Không thể tải thông tin banner', 'error');
        }
      };
      fetchBanner();
    }
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
      setPreviewUrl(url);
      setIsCropping(false);
      setImageSrc(null);
      if (errors.image) setErrors(prev => ({ ...prev, image: null }));
    } catch (e) {
      addToast('Lỗi khi xử lý ảnh', 'error');
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Tiêu đề không được để trống';
    if (!isEdit && !croppedImageFile) newErrors.image = 'Vui lòng chọn ảnh banner';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isCropping) return;
    
    if (!validate()) {
      addToast('Vui lòng kiểm tra các thông tin bắt buộc', 'error');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('subtitle', formData.subtitle || '');
      data.append('linkUrl', formData.linkUrl || '');
      data.append('displayOrder', formData.displayOrder);
      data.append('isActive', formData.isActive);
      
      if (croppedImageFile) {
        data.append('imageFile', croppedImageFile);
      }

      if (isEdit) {
        await homeBannerService.updateBanner(id, data);
        addToast('Cập nhật banner thành công', 'success');
      } else {
        await homeBannerService.createBanner(data);
        addToast('Tạo banner mới thành công', 'success');
      }

      navigate('/admin/home-banners');
    } catch (error) {
      console.error('Error saving banner:', error);
      const msg = error.response?.data?.message || 'Có lỗi xảy ra khi lưu banner';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page-container">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">{isEdit ? 'Chỉnh sửa Banner' : 'Thêm Banner mới'}</h1>
          <p className="admin-subtitle">Quản lý nội dung hiển thị trên banner trang chủ.</p>
        </div>
        <div className="admin-actions">
          <button className="gt-btn-cancel" onClick={() => navigate('/admin/home-banners')}>
            <X size={18} /> Hủy
          </button>
          <button className="gt-btn-submit" onClick={handleSubmit} disabled={loading || isCropping}>
            {loading ? <div className="loader" style={{ width: '18px', height: '18px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div> : <Save size={18} />}
            {loading ? 'Đang lưu...' : 'Lưu Banner'}
          </button>
        </div>
      </div>

      <div className="admin-content-grid">
        <div className="admin-card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="gt-form-section">
              <h3 className="section-title">Nội dung Banner</h3>
              <div className="gt-form-grid">
                <div className="gt-form-group span-2">
                  <label><Type size={14} style={{ marginRight: 6 }} /> Tiêu đề chính</label>
                  <input 
                    type="text" name="title" value={formData.title} 
                    onChange={handleInputChange} 
                    className={errors.title ? 'is-invalid' : ''}
                    placeholder="VD: BST Mùa Hè 2026" 
                  />
                  {errors.title && <div className="error-message"><AlertCircle size={14}/> {errors.title}</div>}
                </div>
                <div className="gt-form-group span-2">
                  <label><Type size={14} style={{ marginRight: 6 }} /> Phụ đề / Mô tả ngắn</label>
                  <input 
                    type="text" name="subtitle" value={formData.subtitle} 
                    onChange={handleInputChange} 
                    placeholder="VD: Khám phá những thiết kế mới nhất" 
                  />
                </div>
                <div className="gt-form-group">
                  <label><ExternalLink size={14} style={{ marginRight: 6 }} /> Đường dẫn liên kết</label>
                  <input 
                    type="text" name="linkUrl" value={formData.linkUrl} 
                    onChange={handleInputChange} 
                    placeholder="VD: /category/ao-thun" 
                  />
                </div>
                <div className="gt-form-group">
                  <label><ListOrdered size={14} style={{ marginRight: 6 }} /> Thứ tự hiển thị</label>
                  <input 
                    type="number" name="displayOrder" value={formData.displayOrder} 
                    onChange={handleInputChange} 
                  />
                </div>
                <div className="gt-form-group">
                  <label>Trạng thái hiển thị</label>
                  <div className="toggle-container">
                    <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleInputChange} id="isActive" />
                    <label htmlFor="isActive" className="toggle-label">{formData.isActive ? 'Đang hiển thị' : 'Đang ẩn'}</label>
                  </div>
                </div>

                <div className="gt-form-group span-2">
                  <label><Crop size={14} style={{ marginRight: 6 }} /> Hình ảnh Banner</label>
                  <div className={`banner-upload-area ${errors.image ? 'is-invalid' : ''}`} style={errors.image ? {borderColor: '#ef4444'} : {}}>
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
                    ) : previewUrl ? (
                      <div className="banner-preview">
                        <img src={previewUrl} alt="Banner preview" />
                        <div className="banner-overlay-actions">
                           <label className="change-img-btn">
                            <Upload size={14} /> Thay đổi
                            <input type="file" accept="image/*" onChange={onFileChange} hidden />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label className="upload-placeholder">
                        <Upload size={32} color={errors.image ? '#ef4444' : '#64748b'} />
                        <span style={errors.image ? {color: '#ef4444'} : {}}>Nhấn để tải lên ảnh Banner</span>
                        <input type="file" accept="image/*" onChange={onFileChange} hidden />
                      </label>
                    )}
                  </div>
                  {errors.image && <div className="error-message"><AlertCircle size={14}/> {errors.image}</div>}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .admin-page-container { padding: 32px; max-width: 900px; margin: 0 auto; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        .admin-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
        .admin-title { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0; }
        .admin-subtitle { color: #64748b; margin: 4px 0 0 0; }
        .admin-actions { display: flex; gap: 12px; }
        .admin-card { background: white; border-radius: 24px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; }
        .section-title { font-size: 1.1rem; font-weight: 800; color: #1e293b; margin-bottom: 24px; }
        
        .gt-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .gt-form-group { display: flex; flex-direction: column; gap: 8px; }
        .gt-form-group.span-2 { grid-column: span 2; }
        .gt-form-group label { font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; }
        .gt-form-group input { padding: 12px 16px; border: 2px solid #f1f5f9; border-radius: 12px; font-size: 1rem; transition: all 0.2s; background: #f8fafc; outline: none; }
        .gt-form-group input:focus { border-color: #0f172a; background: white; }
        
        .banner-upload-area { border: 2px dashed #e2e8f0; border-radius: 24px; min-height: 250px; position: relative; overflow: hidden; background: #f8fafc; transition: all 0.2s; }
        .upload-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 250px; cursor: pointer; color: #64748b; transition: all 0.2s; }
        
        .cropper-container { width: 100%; height: 500px; display: flex; flex-direction: column; }
        .aspect-ratio-selector { display: flex; gap: 8px; padding: 12px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; overflow-x: auto; }
        .aspect-btn { padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; background: white; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .aspect-btn.active { background: #0f172a; color: white; border-color: #0f172a; }
        .cropper-wrapper { flex: 1; position: relative; background: #000; }
        .cropper-controls { padding: 16px; background: white; border-top: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
        .zoom-control { display: flex; align-items: center; gap: 12px; flex: 1; color: #64748b; font-size: 0.8rem; font-weight: 700; }
        .zoom-range { flex: 1; height: 6px; background: #f1f5f9; border-radius: 3px; outline: none; appearance: none; }
        .zoom-range::-webkit-slider-thumb { appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #0f172a; cursor: pointer; }
        .cropper-actions { display: flex; gap: 12px; }
        .btn-crop-cancel { padding: 8px 16px; border-radius: 8px; border: none; background: #f1f5f9; color: #475569; font-weight: 600; cursor: pointer; }
        .btn-crop-save { padding: 8px 24px; border-radius: 8px; border: none; background: #0f172a; color: white; font-weight: 600; cursor: pointer; }

        .banner-preview { position: relative; width: 100%; }
        .banner-preview img { width: 100%; height: auto; display: block; border-radius: 24px; }
        .banner-overlay-actions { position: absolute; bottom: 20px; right: 20px; display: flex; gap: 10px; }
        .change-img-btn { background: rgba(255,255,255,0.9); backdrop-filter: blur(8px); padding: 8px 16px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 8px; cursor: pointer; border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

        .toggle-container { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
        .gt-btn-cancel { padding: 12px 24px; border-radius: 14px; font-weight: 700; background: #f1f5f9; color: #475569; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .gt-btn-submit { padding: 12px 24px; border-radius: 14px; font-weight: 700; background: #0f172a; color: white; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; min-width: 140px; justify-content: center; }
        .gt-btn-submit:hover { background: #1e293b; transform: translateY(-2px); }

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
          .cropper-controls { flex-direction: column; gap: 16px; align-items: stretch; }
          .zoom-control { width: 100%; }
          .cropper-actions { width: 100%; }
          .btn-crop-cancel, .btn-crop-save { flex: 1; }
          
          .banner-overlay-actions { bottom: 10px; right: 10px; }
          .change-img-btn { width: 100%; justify-content: center; }
        }
        `
      }} />
    </div>
  );
};

export default AdminAddHomeBanner;
