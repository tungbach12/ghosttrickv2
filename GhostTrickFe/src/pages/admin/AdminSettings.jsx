import React, { useState, useEffect } from 'react';
import settingsService from '../../services/settingsService';
import { Save, Mail, Settings, Shield, Bell, RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const AdminSettings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

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
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    } catch (error) {
      addToast('Lỗi khi cập nhật cài đặt', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getSettingValue = (key) => {
    const setting = settings.find(s => s.key === key);
    return setting ? setting.value : '';
  };

  const setSettingValue = (key, value) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  if (loading) return (
    <div className="admin-loading">
      <div className="loader"></div>
    </div>
  );

  return (
    <div className="admin-settings-page">
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
        
        .field-desc { color: #94a3b8; font-size: 0.75rem; margin-top: 12px; font-style: italic; }
        
        .coming-soon { text-align: center; color: #94a3b8; font-size: 0.9rem; padding: 20px; border: 2px dashed #f1f5f9; border-radius: 16px; }

        @media (max-width: 768px) {
          .admin-settings-page { padding: 16px; }
          .input-with-button { flex-direction: column; }
          .save-setting-btn { width: 100%; }
        }
      ` }} />
    </div>
  );
};

export default AdminSettings;
