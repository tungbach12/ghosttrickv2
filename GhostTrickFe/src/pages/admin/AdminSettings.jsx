import React, { useRef, useState, useEffect } from 'react';
import settingsService from '../../services/settingsService';
import api from '../../services/api';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { createPortal } from 'react-dom';
import { Save, Mail, Settings, Shield, Bell, RefreshCw, MessageSquare, Send, Database, AlertCircle, QrCode, Upload, Trash2, Crop, X, Check } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const AdminSettings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const { addToast } = useToast();

  // QR Crop states
  const qrImageRef = useRef(null);
  const [qrRawImage, setQrRawImage] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', x: 10, y: 10, width: 80, height: 80 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch (error) {
      addToast('Không thể tải cài đặt hệ thống', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdateSetting = async (key, value) => {
    try {
      setSaving(true);
      await settingsService.updateSetting(key, value);
      addToast('Đã cập nhật cài đặt thành công!', 'success');
      // Update local state
      setSettings(prev => {
        const exists = prev.some(s => s.key === key);
        if (exists) {
          return prev.map(s => s.key === key ? { ...s, value } : s);
        } else {
          return [...prev, { key, value }];
        }
      });
    } catch (error) {
      addToast('Lỗi khi cập nhật cài đặt', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleManualBackup = async () => {
    if (backingUp) return;
    try {
      setBackingUp(true);
      addToast('Đang tạo bản sao lưu và gửi đến Telegram...', 'info');
      await settingsService.backupNow();
      addToast('Backup thành công! Hãy kiểm tra Telegram của bạn.', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'Lỗi khi thực hiện backup', 'error');
    } finally {
      setBackingUp(false);
    }
  };

  const getSettingValue = (key) => {
    const setting = settings.find(s => s.key === key);
    return setting ? setting.value : '';
  };

  const setSettingValue = (key, value) => {
    setSettings(prev => {
      const exists = prev.some(s => s.key === key);
      if (exists) {
        return prev.map(s => s.key === key ? { ...s, value } : s);
      } else {
        return [...prev, { key, value }];
      }
    });
  };

  const handleQrFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { addToast('File quá lớn, tối đa 5MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setQrRawImage(reader.result);
      setShowCropper(true);
      setCrop({ unit: '%', x: 10, y: 10, width: 80, height: 80 });
      setCompletedCrop(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const getCroppedImg = async (image, pixelCrop) => {
    if (!image || !pixelCrop?.width || !pixelCrop?.height) return null;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = Math.floor(pixelCrop.width * scaleX);
    canvas.height = Math.floor(pixelCrop.height * scaleY);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      image,
      pixelCrop.x * scaleX,
      pixelCrop.y * scaleY,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );
    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), 'image/png', 1);
    });
  };

  const handleCropConfirm = async () => {
    if (!completedCrop || !qrRawImage || !qrImageRef.current) return;
    setUploadingQr(true);
    try {
      const blob = await getCroppedImg(qrImageRef.current, completedCrop);
      if (!blob) {
        addToast('Vui lòng chọn vùng cắt hợp lệ', 'warning');
        return;
      }
      const formData = new FormData();
      formData.append('file', blob, 'qr-payment.png');
      const uploadRes = await api.post('/photos/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = uploadRes.data.url;
      await handleUpdateSetting('PaymentQRCodeUrl', url);
      setShowCropper(false);
      setQrRawImage(null);
      addToast('Đã cập nhật ảnh QR thanh toán!', 'success');
    } catch (err) {
      addToast('Lỗi khi tải ảnh QR lên', 'error');
    } finally {
      setUploadingQr(false);
    }
  };

  const handleDeleteQr = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa ảnh QR thanh toán?')) return;
    await handleUpdateSetting('PaymentQRCodeUrl', '');
    addToast('Đã xóa ảnh QR thanh toán', 'success');
  };

  if (loading) return (
    <div className="admin-loading">
      <div className="loader"></div>
    </div>
  );

  return (
    <div className="admin-settings-page animate-up">
      <div className="admin-page-header">
        <div className="header-content">
          <div>
            <h2 className="title">Cài đặt Hệ thống</h2>
            <p className="subtitle">Quản lý các thiết lập toàn cục cho website và thông báo.</p>
          </div>
          <button className="refresh-btn" onClick={fetchSettings}>
            <RefreshCw size={18} /> Làm mới
          </button>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <div className="card-header">
            <div className="card-icon"><Bell size={20} /></div>
            <div className="card-info">
              <h3>Thông báo Đơn hàng</h3>
              <p>Thiết lập nơi nhận thông báo khi có khách hàng đặt đơn mới.</p>
            </div>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label><Mail size={14} /> Email nhận thông báo</label>
              <div className="input-with-button">
                <input 
                  type="email" 
                  placeholder="VD: admin@ghosttrick.com"
                  value={getSettingValue('OrderNotificationEmail')}
                  onChange={(e) => setSettingValue('OrderNotificationEmail', e.target.value)}
                />
                <button 
                  className="save-setting-btn"
                  onClick={() => handleUpdateSetting('OrderNotificationEmail', getSettingValue('OrderNotificationEmail'))}
                  disabled={saving}
                >
                  <Save size={18} />
                </button>
              </div>
              <p className="field-desc">Hệ thống sẽ gửi email chi tiết đơn hàng đến địa chỉ này ngay khi có đơn hàng mới.</p>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <div className="card-icon" style={{ background: '#0088cc', color: 'white' }}><Send size={20} /></div>
            <div className="card-info">
              <h3>Backup & Telegram</h3>
              <p>Cấu hình Bot để nhận thông báo và sao lưu dữ liệu tự động.</p>
            </div>
          </div>
          <div className="card-body">
            <div className="tg-config-grid">
              <div className="form-group">
                <label><MessageSquare size={14} /> Telegram Bot Token</label>
                <div className="input-with-button">
                  <input 
                    type="password" 
                    placeholder="123456789:ABCDEF..."
                    value={getSettingValue('TelegramToken')}
                    onChange={(e) => setSettingValue('TelegramToken', e.target.value)}
                  />
                  <button 
                    className="save-setting-btn"
                    onClick={() => handleUpdateSetting('TelegramToken', getSettingValue('TelegramToken'))}
                    disabled={saving}
                  >
                    <Save size={18} />
                  </button>
                </div>
              </div>
              
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label><Shield size={14} /> Telegram Chat ID</label>
                <div className="input-with-button">
                  <input 
                    type="text" 
                    placeholder="VD: 54321678"
                    value={getSettingValue('TelegramChatId')}
                    onChange={(e) => setSettingValue('TelegramChatId', e.target.value)}
                  />
                  <button 
                    className="save-setting-btn"
                    onClick={() => handleUpdateSetting('TelegramChatId', getSettingValue('TelegramChatId'))}
                    disabled={saving}
                  >
                    <Save size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="backup-action-zone" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #f1f5f9' }}>
              <div className="auto-backup-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>Tự động sao lưu</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Hệ thống tự động backup và gửi Telegram định kỳ.</p>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={getSettingValue('AutoBackupEnabled') === 'true'}
                    onChange={(e) => handleUpdateSetting('AutoBackupEnabled', e.target.checked ? 'true' : 'false')}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {getSettingValue('AutoBackupEnabled') === 'true' && (
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label><RefreshCw size={14} /> Chu kỳ sao lưu (giờ)</label>
                  <div className="input-with-button">
                    <input 
                      type="number" 
                      min="1"
                      max="168"
                      placeholder="24"
                      value={getSettingValue('AutoBackupIntervalHours')}
                      onChange={(e) => setSettingValue('AutoBackupIntervalHours', e.target.value)}
                    />
                    <button 
                      className="save-setting-btn"
                      onClick={() => handleUpdateSetting('AutoBackupIntervalHours', getSettingValue('AutoBackupIntervalHours'))}
                      disabled={saving}
                    >
                      <Save size={18} />
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>Sao lưu thủ công</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Tạo ngay một bản backup tức thì.</p>
                </div>
                <button 
                  className="manual-backup-btn"
                  onClick={handleManualBackup}
                  disabled={backingUp}
                >
                  {backingUp ? <div className="loader" style={{ width: '18px', height: '18px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div> : <Database size={18} />}
                  {backingUp ? 'Đang Backup...' : 'Backup Ngay'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* QR Payment Card */}
        <div className="settings-card">
          <div className="card-header">
            <div className="card-icon" style={{ background: '#6366f1', color: 'white' }}><QrCode size={20} /></div>
            <div className="card-info">
              <h3>Thanh toán Chuyển khoản</h3>
              <p>Upload ảnh QR ngân hàng để khách hàng quét khi chọn thanh toán chuyển khoản.</p>
            </div>
          </div>
          <div className="card-body">
            {getSettingValue('PaymentQRCodeUrl') ? (
              <div className="qr-preview-zone">
                <div className="qr-preview-img">
                  <img src={getSettingValue('PaymentQRCodeUrl')} alt="QR thanh toán" />
                </div>
                <div className="qr-preview-actions">
                  <label className="qr-change-btn">
                    <Upload size={16} /> Đổi ảnh QR
                    <input type="file" accept="image/*" onChange={handleQrFileSelect} style={{ display: 'none' }} />
                  </label>
                  <button className="qr-delete-btn" onClick={handleDeleteQr}>
                    <Trash2 size={16} /> Xóa
                  </button>
                </div>
              </div>
            ) : (
              <label className="qr-upload-dropzone">
                <Upload size={32} />
                <p className="dropzone-title">Tải ảnh QR lên</p>
                <p className="dropzone-hint">Hỗ trợ JPG, PNG. Tối đa 5MB. Bạn sẽ được cắt ảnh trước khi lưu.</p>
                <input type="file" accept="image/*" onChange={handleQrFileSelect} style={{ display: 'none' }} />
              </label>
            )}
          </div>
        </div>

        <div className="settings-card disabled">
          <div className="card-header">
            <div className="card-icon"><Shield size={20} /></div>
            <div className="card-info">
              <h3>Bảo mật & Email Server</h3>
              <p>Cấu hình SMTP và bảo mật hệ thống (Sắp ra mắt).</p>
            </div>
          </div>
          <div className="card-body">
            <p className="coming-soon">Tính năng này đang được phát triển.</p>
          </div>
        </div>
      </div>

      {/* QR Cropper Modal — rendered via portal to document.body */}
      {showCropper && createPortal(
        <div className="crop-modal-overlay">
          <div className="crop-modal">
            <div className="crop-modal-header">
              <h3><Crop size={20} /> Cắt ảnh QR</h3>
              <button className="crop-close-btn" onClick={() => { setShowCropper(false); setQrRawImage(null); }}><X size={20} /></button>
            </div>
            <div className="crop-container">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
                keepSelection
                ruleOfThirds
              >
                <img
                  ref={qrImageRef}
                  src={qrRawImage}
                  alt="QR crop"
                  style={{ maxHeight: '100%', maxWidth: '100%', display: 'block' }}
                  onLoad={() => {
                    setCompletedCrop(null);
                  }}
                />
              </ReactCrop>
            </div>
            <div className="crop-controls">
              <span className="crop-hint">Keo khung de thay doi ty le va kich thuoc, keo anh de can chinh.</span>
            </div>
            <div className="crop-actions">
              <button className="crop-cancel" onClick={() => { setShowCropper(false); setQrRawImage(null); }}>Hủy</button>
              <button className="crop-confirm" onClick={handleCropConfirm} disabled={uploadingQr}>
                {uploadingQr ? 'Đang tải...' : <><Check size={18} /> Xác nhận &amp; Lưu</>}
              </button>
            </div>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `
            .crop-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15,23,42,0.7); backdrop-filter: blur(8px); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 24px; animation: cropFadeIn 0.25s ease; }
            .crop-modal { background: white; border-radius: 24px; width: 100%; max-width: 560px; max-height: 90vh; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: cropSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; }
            .crop-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f1f5f9; flex-shrink: 0; }
            .crop-modal-header h3 { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 1.1rem; margin: 0; color: #0f172a; }
            .crop-close-btn { background: #f8fafc; border: none; cursor: pointer; color: #64748b; padding: 8px; border-radius: 10px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
            .crop-close-btn:hover { color: #0f172a; background: #f1f5f9; }
            .crop-container { position: relative; width: 100%; height: min(60vh, 520px); background: #0f172a; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
            .ReactCrop { width: 100%; height: 100%; }
            .ReactCrop__child-wrapper { width: 100%; height: 100%; }
            .ReactCrop__image { width: 100%; height: 100%; object-fit: contain; }
            .crop-controls { padding: 12px 24px; display: flex; align-items: center; gap: 12px; background: #f8fafc; border-top: 1px solid #f1f5f9; flex-shrink: 0; }
            .crop-hint { font-size: 0.8rem; font-weight: 600; color: #64748b; }
            .crop-actions { padding: 16px 24px; display: flex; gap: 12px; justify-content: flex-end; border-top: 1px solid #f1f5f9; flex-shrink: 0; }
            .crop-cancel { padding: 12px 24px; background: #f1f5f9; color: #475569; border: none; border-radius: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-size: 0.9rem; }
            .crop-cancel:hover { background: #e2e8f0; }
            .crop-confirm { padding: 12px 24px; background: #0f172a; color: white; border: none; border-radius: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; font-size: 0.9rem; }
            .crop-confirm:hover { background: #1e293b; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(15,23,42,0.15); }
            .crop-confirm:disabled { background: #94a3b8; cursor: not-allowed; transform: none; box-shadow: none; }
            @keyframes cropFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes cropSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @media (max-width: 640px) {
              .crop-modal { max-width: 100%; border-radius: 16px; margin: 0 8px; }
              .crop-container { height: 60vh; }
              .crop-modal-header { padding: 16px 20px; }
              .crop-controls { flex-direction: column; align-items: stretch; }
              .crop-actions { padding: 14px 20px; flex-direction: column; }
              .crop-cancel, .crop-confirm { width: 100%; justify-content: center; }
            }
          `}} />
        </div>,
        document.body
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-settings-page { padding: 32px; max-width: 1000px; }
        .admin-loading { display: flex; justifyContent: center; padding: 100px; }
        
        .admin-page-header { margin-bottom: 32px; }
        .header-content { display: flex; justify-content: space-between; align-items: center; }
        .admin-page-header .title { font-size: 1.8rem; font-weight: 800; margin-bottom: 4px; }
        .admin-page-header .subtitle { color: #64748b; font-size: 0.95rem; }
        
        .refresh-btn { background: #f1f5f9; color: #475569; border: none; padding: 10px 18px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .refresh-btn:hover { background: #e2e8f0; }

        .settings-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
        
        .settings-card { background: white; border-radius: 24px; border: 1px solid #f1f5f9; box-shadow: 0 4px 20px rgba(0,0,0,0.02); overflow: hidden; transition: all 0.3s; }
        .settings-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.05); }
        .settings-card.disabled { opacity: 0.7; pointer-events: none; }
        
        .card-header { padding: 24px; border-bottom: 1px solid #f8fafc; display: flex; gap: 16px; align-items: flex-start; }
        .card-icon { width: 48px; height: 48px; background: #f8fafc; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: #0f172a; border: 1px solid #f1f5f9; }
        .card-info h3 { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
        .card-info p { color: #64748b; font-size: 0.85rem; line-height: 1.5; }
        
        .card-body { padding: 24px; }
        
        .form-group { margin-bottom: 0; }
        .form-group label { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 12px; }
        
        .input-with-button { display: flex; gap: 12px; }
        .input-with-button input { flex: 1; padding: 14px 20px; border: 2px solid #f1f5f9; border-radius: 16px; font-size: 1rem; transition: all 0.2s; outline: none; background: #f8fafc; }
        .input-with-button input:focus { border-color: #0f172a; background: white; }
        
        .save-setting-btn { width: 54px; height: 54px; background: #0f172a; color: white; border: none; border-radius: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
        .save-setting-btn:hover { background: #1e293b; transform: scale(1.05); }
        .save-setting-btn:disabled { background: #94a3b8; cursor: not-allowed; transform: none; }
        
        .manual-backup-btn { background: #0f172a; color: white; border: none; padding: 12px 24px; border-radius: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.2s; }
        .manual-backup-btn:hover { background: #1e293b; transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.2); }
        .manual-backup-btn:disabled { background: #94a3b8; cursor: not-allowed; transform: none; }

        /* Switch Toggle CSS */
        .switch { position: relative; display: inline-block; width: 50px; height: 26px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #e2e8f0; transition: .4s; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 4px; bottom: 4px; background-color: white; transition: .4s; }
        input:checked + .slider { background-color: #0f172a; }
        input:focus + .slider { box-shadow: 0 0 1px #0f172a; }
        input:checked + .slider:before { transform: translateX(24px); }
        .slider.round { border-radius: 34px; }
        .slider.round:before { border-radius: 50%; }

        .field-desc { color: #94a3b8; font-size: 0.75rem; margin-top: 12px; font-style: italic; }
        .coming-soon { text-align: center; color: #94a3b8; font-size: 0.9rem; padding: 20px; border: 2px dashed #f1f5f9; border-radius: 16px; }

        /* QR Preview & Upload */
        .qr-preview-zone { display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .qr-preview-img { width: 280px; border-radius: 20px; overflow: hidden; border: 2px solid #f1f5f9; background: #f8fafc; box-shadow: 0 8px 30px rgba(0,0,0,0.06); }
        .qr-preview-img img { width: 100%; height: auto; display: block; }
        .qr-preview-actions { display: flex; gap: 12px; }
        .qr-change-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: #f1f5f9; color: #475569; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; }
        .qr-change-btn:hover { background: #e2e8f0; color: #0f172a; }
        .qr-delete-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: #fee2e2; color: #ef4444; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; }
        .qr-delete-btn:hover { background: #fecaca; }

        .qr-upload-dropzone { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 40px; border: 2px dashed #e2e8f0; border-radius: 20px; cursor: pointer; transition: all 0.2s; color: #94a3b8; background: #f8fafc; }
        .qr-upload-dropzone:hover { border-color: #6366f1; color: #6366f1; background: #f5f3ff; }
        .dropzone-title { font-weight: 800; font-size: 1rem; margin: 0; }
        .dropzone-hint { font-size: 0.8rem; margin: 0; }

        /* Crop Modal */
        .crop-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15,23,42,0.7); backdrop-filter: blur(8px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .crop-modal { background: white; border-radius: 24px; width: 100%; max-width: 560px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        .crop-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f1f5f9; }
        .crop-modal-header h3 { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 1.1rem; margin: 0; }
        .crop-close-btn { background: none; border: none; cursor: pointer; color: #64748b; padding: 4px; }
        .crop-close-btn:hover { color: #0f172a; }
        .crop-container { position: relative; width: 100%; height: 400px; background: #0f172a; }
        .crop-controls { padding: 16px 24px; display: flex; align-items: center; gap: 12px; background: #f8fafc; }
        .zoom-label { font-size: 0.8rem; font-weight: 700; color: #64748b; white-space: nowrap; }
        .zoom-slider { flex: 1; accent-color: #0f172a; }
        .crop-actions { padding: 16px 24px; display: flex; gap: 12px; justify-content: flex-end; border-top: 1px solid #f1f5f9; }
        .crop-cancel { padding: 12px 24px; background: #f1f5f9; color: #475569; border: none; border-radius: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .crop-cancel:hover { background: #e2e8f0; }
        .crop-confirm { padding: 12px 24px; background: #0f172a; color: white; border: none; border-radius: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .crop-confirm:hover { background: #1e293b; transform: translateY(-1px); }
        .crop-confirm:disabled { background: #94a3b8; cursor: not-allowed; transform: none; }

        @media (max-width: 768px) {
          .admin-settings-page { padding: 16px; }
          .input-with-button { flex-direction: column; }
          .save-setting-btn { width: 100%; }
          .qr-preview-img { width: 200px; }
          .crop-container { height: 300px; }
        }
      ` }} />
    </div>
  );
};

export default AdminSettings;
