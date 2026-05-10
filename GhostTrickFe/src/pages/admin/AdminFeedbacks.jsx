import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Upload, Scissors, Check } from 'lucide-react';
import Cropper from 'react-easy-crop';
import feedbackService from '../../services/feedbackService';
import { useToast } from '../../context/ToastContext';

export default function AdminFeedbacks() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({
    imageUrl: '',
    customerName: '',
    isActive: true
  });

  // Cropper states
  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { addToast } = useToast();

  useEffect(() => {
    fetchFeedbacks();
  }, []);

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

  const getFeedbackBySlot = (slot) => feedbacks.find(f => f.displayOrder === slot);

  const handleOpenModal = (slot, existing) => {
    setSelectedSlot(slot);
    setImage(null);
    if (existing) {
      setFormData({
        id: existing.id,
        imageUrl: existing.imageUrl,
        customerName: existing.customerName,
        isActive: existing.isActive
      });
    } else {
      setFormData({ imageUrl: '', customerName: '', isActive: true });
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e) => {
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

  const handleUploadAndSave = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      let finalImageUrl = formData.imageUrl;

      if (image && croppedAreaPixels) {
        const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
        const file = new File([croppedBlob], "feedback.jpg", { type: "image/jpeg" });
        const uploadRes = await feedbackService.uploadImage(file);
        finalImageUrl = uploadRes.url;
      }

      if (!finalImageUrl) {
        addToast('Vui lòng chọn ảnh', 'warning');
        setUploading(false);
        return;
      }

      if (formData.id) {
        await feedbackService.updateFeedback(formData.id, {
          ...formData,
          imageUrl: finalImageUrl,
          displayOrder: selectedSlot
        });
        addToast(`Cập nhật slot ${selectedSlot} thành công`, 'success');
      } else {
        await feedbackService.createFeedback({
          ...formData,
          imageUrl: finalImageUrl,
          displayOrder: selectedSlot
        });
        addToast(`Đã thêm feedback vào slot ${selectedSlot}`, 'success');
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
      setSelectedSlot(null);
    } catch (error) {
      addToast('Không thể xóa', 'error');
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">VISUAL FEEDBACK MANAGER</h1>
          <p className="admin-subtitle">Tải lên và cắt ảnh tỉ lệ 1:1 cho 6 vị trí trang chủ</p>
        </div>
      </div>

      <div className="feedback-admin-grid">
        {[1, 2, 3, 4, 5, 6].map((slot) => {
          const fb = getFeedbackBySlot(slot);
          return (
            <div 
              key={slot} 
              className={`feedback-slot ${fb ? 'filled' : 'empty'}`}
              onClick={() => handleOpenModal(slot, fb)}
            >
              <div className="slot-number">POS_{slot}</div>
              {fb ? (
                <>
                  <img src={fb.imageUrl} alt={fb.customerName} className="slot-preview" />
                  <div className="slot-info">
                    <span className="slot-username">@{fb.customerName}</span>
                    <div className="slot-badge">ACTIVE</div>
                  </div>
                </>
              ) : (
                <div className="slot-add">
                  <Plus size={32} />
                  <span>UPLOAD IMAGE</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedSlot && (
        <div className="admin-modal-overlay">
          <div className="admin-modal feedback-modal">
            <div className="modal-header">
              <h3>SLOT_{selectedSlot} CONFIG</h3>
              <button className="close-btn" onClick={() => setSelectedSlot(null)}><X /></button>
            </div>
            
            <form onSubmit={handleUploadAndSave} className="modal-body">
              {!image && !formData.imageUrl ? (
                <div className="upload-placeholder" onClick={() => document.getElementById('fileInput').click()}>
                  <Upload size={40} />
                  <span>CHỌN ẢNH TỪ MÁY TÍNH</span>
                  <input id="fileInput" type="file" hidden accept="image/*" onChange={handleFileChange} />
                </div>
              ) : image ? (
                <div className="cropper-container">
                  <Cropper
                    image={image}
                    crop={crop}
                    zoom={zoom}
                    aspect={1 / 1}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                  />
                  <div className="cropper-controls">
                    <input 
                      type="range" 
                      min={1} 
                      max={3} 
                      step={0.1} 
                      value={zoom} 
                      onChange={(e) => setZoom(e.target.value)} 
                    />
                    <button type="button" className="btn-text" onClick={() => setImage(null)}>ĐỔI ẢNH</button>
                  </div>
                </div>
              ) : (
                <div className="current-image-preview">
                  <img src={formData.imageUrl} alt="Current" />
                  <button type="button" className="btn-solid sm" onClick={() => document.getElementById('fileInput').click()}>
                    THAY ĐỔI ẢNH
                  </button>
                  <input id="fileInput" type="file" hidden accept="image/*" onChange={handleFileChange} />
                </div>
              )}

              <div className="form-group" style={{marginTop: '20px'}}>
                <label>INSTAGRAM USERNAME</label>
                <input 
                  type="text" 
                  className="admin-input" 
                  value={formData.customerName}
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  placeholder="e.g. ghost_member"
                />
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn-solid full-width" disabled={uploading}>
                  {uploading ? 'UPLOADING...' : (formData.id ? 'SAVE CHANGES' : 'UPLOAD & SAVE')}
                </button>
                {formData.id && (
                  <button type="button" className="btn-text danger-text" onClick={() => handleDelete(formData.id)}>
                    REMOVE FROM THIS SLOT
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .feedback-admin-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 30px; }
        .feedback-slot { aspect-ratio: 1/1; border: 2px dashed #ccc; position: relative; cursor: pointer; overflow: hidden; background: #fafafa; transition: all 0.3s; }
        .feedback-slot.filled { border: 2px solid #000; }
        .feedback-slot:hover { transform: translateY(-5px); box-shadow: 8px 8px 0px #000; border-color: #000; }
        .slot-number { position: absolute; top: 10px; left: 10px; font-size: 0.6rem; font-weight: 900; background: #000; color: #fff; padding: 2px 6px; z-index: 2; }
        .slot-preview { width: 100%; height: 100%; object-fit: cover; }
        .slot-add { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #999; font-weight: 800; gap: 10px; }
        .slot-info { position: absolute; bottom: 0; left: 0; width: 100%; padding: 10px; background: rgba(0,0,0,0.8); color: #fff; display: flex; justify-content: space-between; align-items: center; }
        .slot-username { font-size: 0.7rem; font-weight: 700; }
        .slot-badge { font-size: 0.5rem; background: #fff; color: #000; padding: 2px 4px; font-weight: 900; }

        .admin-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 9999; }
        .feedback-modal { background: #fff; width: 500px; border: 5px solid #000; padding: 30px; }
        .upload-placeholder { height: 250px; border: 2px dashed #ccc; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; cursor: pointer; transition: 0.3s; }
        .upload-placeholder:hover { background: #f9f9f9; border-color: #000; }
        .upload-placeholder span { font-weight: 800; font-size: 0.9rem; }

        .cropper-container { position: relative; height: 350px; background: #333; margin-bottom: 60px; }
        .cropper-controls { position: absolute; bottom: -50px; left: 0; width: 100%; display: flex; align-items: center; gap: 20px; }
        .cropper-controls input { flex: 1; }

        .current-image-preview { position: relative; height: 250px; border: 1px solid #eee; }
        .current-image-preview img { width: 100%; height: 100%; object-fit: contain; }
        .current-image-preview .btn-solid { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: none; }
        .current-image-preview:hover img { opacity: 0.5; }
        .current-image-preview:hover .btn-solid { display: block; }

        .full-width { width: 100%; padding: 15px; margin-top: 20px; }
        .danger-text { color: red; font-size: 0.8rem; width: 100%; text-align: center; margin-top: 10px; }

        @media (max-width: 768px) {
          .admin-container { padding: 16px; }
          .admin-header { margin-bottom: 24px; }
          .admin-title { font-size: 1.4rem; }
          
          .feedback-admin-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .slot-number { font-size: 0.5rem; }
          .slot-username { font-size: 0.6rem; }
          
          .admin-modal-overlay { padding: 16px; }
          .feedback-modal { width: 100%; padding: 20px; border-width: 3px; }
          .modal-header h3 { font-size: 1rem; }
          .upload-placeholder { height: 200px; }
          .cropper-container { height: 300px; margin-bottom: 80px; }
          .cropper-controls { flex-direction: column; bottom: -70px; gap: 10px; }
          .cropper-controls input { width: 100%; }
        }
      `}</style>
    </div>
  );
}
