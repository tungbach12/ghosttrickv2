import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Upload, Trash2, Edit, Save } from 'lucide-react';
import Cropper from 'react-easy-crop';
import feedbackService from '../../services/feedbackService';
import settingsService from '../../services/settingsService';
import { useToast } from '../../context/ToastContext';

const ASPECT_RATIOS = [
  { label: 'Tự do', value: undefined },
  { label: 'Dọc (4:5)', value: 4 / 5 },
  { label: 'Ngang (16:9)', value: 16 / 9 },
  { label: 'Vuông (1:1)', value: 1 / 1 },
];

export default function AdminFeedbacks() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  // Section Settings
  const [sectionSettings, setSectionSettings] = useState({
    title: 'FEEDBACK FROM GHOSTS',
    subtitle: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const [formData, setFormData] = useState({
    imageUrl: '',
    publicId: '',
    title: '',
    subtitle: '',
    isActive: true,
    displayOrder: 0
  });

  // Cropper states
  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(ASPECT_RATIOS[0].value);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { addToast } = useToast();

  useEffect(() => {
    fetchFeedbacks();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await settingsService.getSettings();
      const title = data.find(s => s.key === 'FeedbackSection_Title')?.value || 'FEEDBACK FROM GHOSTS';
      const subtitle = data.find(s => s.key === 'FeedbackSection_Subtitle')?.value || '';
      setSectionSettings({ title, subtitle });
    } catch (error) {
      console.error('Failed to fetch settings', error);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await settingsService.updateSetting('FeedbackSection_Title', sectionSettings.title);
      await settingsService.updateSetting('FeedbackSection_Subtitle', sectionSettings.subtitle);
      addToast('Đã cập nhật tiêu đề mục Feedback', 'success');
    } catch (error) {
      addToast('Lỗi khi lưu cài đặt', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const data = await feedbackService.getFeedbacksAdmin();
      setFeedbacks(data);
    } catch (error) {
      addToast('Không thể tải danh sách feedback', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (slot, existing = null) => {
    setSelectedSlot(slot);
    setImage(null);
    if (existing) {
      setFormData({
        id: existing.id,
        imageUrl: existing.imageUrl,
        publicId: existing.publicId,
        title: existing.title || '',
        subtitle: existing.subtitle || '',
        isActive: existing.isActive,
        displayOrder: slot
      });
    } else {
      setFormData({
        imageUrl: '',
        publicId: '',
        title: '',
        subtitle: '',
        isActive: true,
        displayOrder: slot
      });
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.readAsDataURL(e.target.files[0]);
      reader.onload = () => setImage(reader.result);
    }
  };

  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');

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

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg');
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      let finalImageUrl = formData.imageUrl;
      let finalPublicId = formData.publicId;

      if (image && croppedAreaPixels) {
        const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
        const file = new File([croppedBlob], "feedback.jpg", { type: "image/jpeg" });
        const uploadRes = await feedbackService.uploadImage(file);
        finalImageUrl = uploadRes.url;
        finalPublicId = uploadRes.publicId;
      }

      if (!finalImageUrl) {
        addToast('Vui lòng chọn ảnh', 'warning');
        setUploading(false);
        return;
      }

      const dataToSave = {
        ...formData,
        imageUrl: finalImageUrl,
        publicId: finalPublicId
      };

      if (formData.id) {
        await feedbackService.updateFeedback(formData.id, dataToSave);
        addToast('Cập nhật thành công', 'success');
      } else {
        await feedbackService.createFeedback(dataToSave);
        addToast('Đã thêm feedback mới', 'success');
      }
      setSelectedSlot(null);
      fetchFeedbacks();
    } catch (error) {
      addToast('Có lỗi xảy ra', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa feedback này?')) return;
    try {
      await feedbackService.deleteFeedback(id);
      addToast('Đã xóa thành công', 'success');
      fetchFeedbacks();
    } catch (error) {
      addToast('Không thể xóa', 'error');
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">VISUAL FEEDBACK</h1>
          <p className="admin-subtitle">Quản lý tối đa 3 ảnh feedback hiển thị tại trang chủ</p>
        </div>
      </div>

      <div className="feedback-settings-panel">
        <div className="settings-row">
          <div className="form-group">
            <label>TIÊU ĐỀ MỤC</label>
            <input 
              type="text" 
              value={sectionSettings.title} 
              onChange={e => setSectionSettings({...sectionSettings, title: e.target.value})}
              placeholder="e.g. FEEDBACK FROM GHOSTS"
            />
          </div>
          <div className="form-group">
            <label>PHỤ ĐỀ MỤC</label>
            <input 
              type="text" 
              value={sectionSettings.subtitle} 
              onChange={e => setSectionSettings({...sectionSettings, subtitle: e.target.value})}
              placeholder="e.g. Xem khách hàng nói gì về chúng tôi"
            />
          </div>
          <button className="btn-solid-black save-settings-btn" onClick={handleSaveSettings} disabled={savingSettings}>
            {savingSettings ? 'ĐANG LƯU...' : 'LƯU TIÊU ĐỀ'}
          </button>
        </div>
      </div>

      <div className="feedback-vertical-list">
        {[1, 2, 3].map((slot) => {
          const fb = feedbacks.find(f => f.displayOrder === slot);
          return (
            <div key={slot} className={`feedback-card-vertical ${fb ? 'filled' : 'empty'}`}>
              <div className="slot-badge">VỊ TRÍ {slot}</div>
              
              {fb ? (
                <div className="fb-content">
                  <div className="fb-preview-container">
                    <img src={fb.imageUrl} alt={`Feedback ${slot}`} />
                  </div>
                  <div className="fb-details">
                    <h3>{fb.title || 'KHÔNG CÓ TIÊU ĐỀ'}</h3>
                    <p>{fb.subtitle || 'Không có phụ đề'}</p>
                    <div className={`status-pill ${fb.isActive ? 'active' : 'inactive'}`}>
                      {fb.isActive ? 'ĐANG HIỂN THỊ' : 'ĐANG ẨN'}
                    </div>
                  </div>
                  <div className="fb-actions">
                    <button className="btn-icon" onClick={() => handleOpenModal(slot, fb)}>
                      <Edit size={20} />
                    </button>
                    <button className="btn-icon danger" onClick={() => handleDelete(fb.id)}>
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="fb-empty" onClick={() => handleOpenModal(slot)}>
                  <Plus size={40} />
                  <span>THÊM FEEDBACK TẠI VỊ TRÍ {slot}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedSlot && (
        <div className="admin-modal-overlay">
          <div className="admin-modal feedback-modal-simple">
            <div className="modal-header">
              <h3>{formData.id ? 'CẬP NHẬT FEEDBACK' : 'THÊM FEEDBACK MỚI'} - VỊ TRÍ {selectedSlot}</h3>
              <button className="close-btn" onClick={() => setSelectedSlot(null)}><X /></button>
            </div>
            
            <form onSubmit={handleSave} className="modal-body-simple">
              <div className="upload-section">
                {!image && !formData.imageUrl ? (
                  <div className="upload-placeholder-simple" onClick={() => document.getElementById('fileInput').click()}>
                    <Upload size={32} />
                    <span>CHỌN ẢNH</span>
                    <input id="fileInput" type="file" hidden accept="image/*" onChange={handleFileChange} />
                  </div>
                ) : image ? (
                  <div className="cropper-container-feedback">
                    <div className="aspect-ratio-selector-simple">
                      {ASPECT_RATIOS.map((ratio, index) => (
                        <button
                          key={index}
                          type="button"
                          className={`aspect-btn-simple ${aspect === ratio.value ? 'active' : ''}`}
                          onClick={() => setAspect(ratio.value)}
                        >
                          {ratio.label}
                        </button>
                      ))}
                    </div>
                    <div className="cropper-box-feedback">
                      <Cropper
                        image={image}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                      />
                    </div>
                    <div className="crop-controls-simple">
                      <div className="zoom-row">
                        <span>Zoom</span>
                        <input 
                          type="range" 
                          min={1} 
                          max={3} 
                          step={0.1} 
                          value={zoom} 
                          onChange={(e) => setZoom(e.target.value)} 
                        />
                      </div>
                      <button type="button" className="btn-text" onClick={() => setImage(null)}>ĐỔI ẢNH</button>
                    </div>
                  </div>
                ) : (
                  <div className="current-image-box">
                    <img src={formData.imageUrl} alt="Current" />
                    <button type="button" className="btn-change-img" onClick={() => document.getElementById('fileInput').click()}>
                      THAY ĐỔI ẢNH
                    </button>
                    <input id="fileInput" type="file" hidden accept="image/*" onChange={handleFileChange} />
                  </div>
                )}
              </div>

              <div className="form-fields-simple">
                <div className="form-group">
                  <label>TIÊU ĐỀ (TÙY CHỌN)</label>
                  <input 
                    type="text" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. COOL VIBES"
                  />
                </div>
                <div className="form-group">
                  <label>PHỤ ĐỀ (TÙY CHỌN)</label>
                  <input 
                    type="text" 
                    value={formData.subtitle} 
                    onChange={e => setFormData({...formData, subtitle: e.target.value})}
                    placeholder="e.g. @username"
                  />
                </div>
                <div className="form-group-inline">
                  <input 
                    type="checkbox" 
                    id="isActive"
                    checked={formData.isActive} 
                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  />
                  <label htmlFor="isActive">Hiển thị feedback này</label>
                </div>

                <div className="modal-footer-simple">
                  <button type="submit" className="btn-solid-black" disabled={uploading}>
                    {uploading ? 'ĐANG TẢI...' : (formData.id ? 'LƯU THAY ĐỔI' : 'TẢI LÊN & LƯU')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .feedback-vertical-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-top: 30px;
        }

        .feedback-settings-panel {
          background: #f9f9f9;
          border: 2px solid #000;
          padding: 20px;
          margin-bottom: 30px;
        }

        .settings-row {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 20px;
          align-items: flex-end;
        }

        .save-settings-btn {
          padding: 12px 25px !important;
          height: 48px;
        }

        .feedback-card-vertical {
          background: #fff;
          border: 4px solid #000;
          padding: 20px;
          position: relative;
          min-height: 150px;
          transition: 0.3s;
        }

        .feedback-card-vertical.empty {
          border-style: dashed;
          border-color: #ccc;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .feedback-card-vertical.empty:hover {
          border-color: #000;
          background: #f9f9f9;
        }

        .fb-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: #999;
          font-weight: 800;
        }

        .slot-badge {
          position: absolute;
          top: -12px;
          left: 20px;
          background: #000;
          color: #fff;
          padding: 2px 12px;
          font-weight: 900;
          font-size: 0.7rem;
        }

        .fb-content {
          display: grid;
          grid-template-columns: 120px 1fr auto;
          gap: 25px;
          align-items: center;
        }

        .fb-preview-container {
          width: 120px;
          height: 150px;
          border: 2px solid #000;
          overflow: hidden;
        }

        .fb-preview-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .fb-details h3 {
          font-size: 1.2rem;
          font-weight: 900;
          margin-bottom: 5px;
          font-style: italic;
        }

        .fb-details p {
          color: #666;
          margin-bottom: 10px;
        }

        .status-pill {
          display: inline-block;
          font-size: 0.6rem;
          font-weight: 900;
          padding: 3px 8px;
          border: 1px solid currentColor;
        }

        .status-pill.active { color: #00aa00; }
        .status-pill.inactive { color: #ff0000; }

        .fb-actions {
          display: flex;
          gap: 10px;
        }

        .btn-icon {
          background: none;
          border: 2px solid #000;
          padding: 8px;
          cursor: pointer;
          transition: 0.2s;
        }

        .btn-icon:hover {
          background: #000;
          color: #fff;
        }

        .btn-icon.danger {
          border-color: #ff4444;
          color: #ff4444;
        }

        .btn-icon.danger:hover {
          background: #ff4444;
          color: #fff;
        }

        /* Modal Styles */
        .feedback-modal-simple {
          width: 600px;
          max-width: 95vw;
          background: #fff;
          border: 5px solid #000;
        }

        .modal-body-simple {
          padding: 25px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 25px;
        }

        .upload-section {
          border: 2px solid #eee;
          min-height: 300px;
          display: flex;
          flex-direction: column;
          background: #fdfdfd;
        }

        .upload-placeholder-simple {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          color: #999;
          font-weight: 800;
        }

        .cropper-container-feedback {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 15px;
          background: #f8fafc;
          border-radius: 12px;
          overflow: hidden;
        }

        .aspect-ratio-selector-simple {
          display: flex;
          gap: 10px;
          padding: 10px;
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
          overflow-x: auto;
        }

        .aspect-btn-simple {
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .aspect-btn-simple.active {
          background: #000;
          color: #fff;
          border-color: #000;
        }

        .cropper-box-feedback {
          position: relative;
          width: 100%;
          height: 400px;
          background: #000;
        }

        .crop-controls-simple {
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 15px;
          background: #fff;
          border-top: 1px solid #e2e8f0;
        }

        .zoom-row {
          display: flex;
          align-items: center;
          gap: 15px;
          color: #64748b;
          font-size: 14px;
          font-weight: 600;
        }

        .zoom-row input {
          flex: 1;
        }

        .current-image-box {
          height: 100%;
          position: relative;
        }

        .current-image-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .btn-change-img {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: #000;
          color: #fff;
          border: none;
          padding: 5px 15px;
          font-size: 0.7rem;
          font-weight: 800;
          cursor: pointer;
        }

        .form-fields-simple {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .form-group-inline {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 800;
          font-size: 0.8rem;
        }

        .btn-solid-black {
          width: 100%;
          background: #000;
          color: #fff;
          border: none;
          padding: 12px;
          font-weight: 900;
          cursor: pointer;
          transition: 0.2s;
        }

        .btn-solid-black:hover {
          background: #333;
        }

        .btn-text {
          background: none;
          border: none;
          font-weight: 800;
          font-size: 0.7rem;
          cursor: pointer;
          text-decoration: underline;
        }

        @media (max-width: 600px) {
          .modal-body-simple {
            grid-template-columns: 1fr;
          }
          .fb-content {
            grid-template-columns: 80px 1fr;
          }
          .fb-actions {
            grid-column: span 2;
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
}
