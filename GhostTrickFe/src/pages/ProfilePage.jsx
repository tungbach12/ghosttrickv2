import React, { useState, useRef } from 'react';
import { useGlobalContext } from '../context/GlobalContext';
import { useToast } from '../context/ToastContext';
import { ChevronRight, Camera, Save, User, Mail, Phone, MapPin, ShoppingBag, LogOut, Loader2 } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import api from '../services/api';

export default function ProfilePage() {
  const { user, updateUser, logout } = useGlobalContext();
  const { addToast } = useToast();
  const fileInputRef = useRef(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '123 Đường Fashion, Quận 1, TP. HCM'
  });

  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put('/account/profile', formData);
      updateUser(response.data);
      setIsEditing(false);
      addToast('Cập nhật thông tin thành công', 'success');
    } catch (err) {
      addToast('Không thể cập nhật thông tin', 'error');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('File', file);

    setUploading(true);
    try {
      const response = await api.post('/account/avatar', formDataUpload);
      updateUser({ avatarUrl: response.data.avatarUrl });
      addToast('Cập nhật ảnh đại diện thành công', 'success');
    } catch (err) {
      addToast('Không thể tải ảnh lên', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="account-page animate-up">
      <div className="container">
        <div className="breadcrumb-bar-alt">
          <nav className="breadcrumb">
            <Link to="/"><span>Trang</span> chủ</Link>
            <ChevronRight size={14} />
            <Link to="/profile">Tài khoản</Link>
            <ChevronRight size={14} />
            <span className="breadcrumb-current">Thông tin cá nhân</span>
          </nav>
        </div>

        <div className="account-layout">
          {/* Sidebar */}
          <div className="account-sidebar">
            <div className="account-user-card">
              <div className="account-avatar-wrapper">
                <div className="account-avatar" onClick={handleAvatarClick} style={{ cursor: 'pointer', overflow: 'hidden' }}>
                  {uploading ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (user.fullName || user.name || '?').charAt(0)
                  )}
                </div>
                <button className="avatar-edit-btn" onClick={handleAvatarClick} disabled={uploading}>
                  <Camera size={14} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                  style={{ display: 'none' }} 
                  accept="image/*" 
                />
              </div>
              <div className="account-user-details">
                <h3 className="account-user-name">{user.fullName || user.name}</h3>
                <p style={{ fontSize: '12px', color: '#64748b' }}>Thành viên Ghosttrick</p>
              </div>
            </div>
            
            <ul className="account-menu">
              <li>
                <Link to="/profile" className="account-menu-item active">
                  <User size={18} /> Thông tin tài khoản
                </Link>
              </li>
              <li>
                <Link to="/account" className="account-menu-item">
                  <ShoppingBag size={18} /> Đơn hàng của tôi
                </Link>
              </li>
              <li className="menu-divider"></li>
              <li>
                <button onClick={logout} className="account-menu-item logout">
                  <LogOut size={18} /> Đăng xuất
                </button>
              </li>
            </ul>
          </div>

          {/* Main Content */}
          <div className="account-main">
            <div className="section-header">
              <h2 className="account-section-title">Thông tin tài khoản</h2>
              {!isEditing && (
                <button className="btn-outline btn-sm" onClick={() => setIsEditing(true)}>
                  Chỉnh sửa
                </button>
              )}
            </div>

            <div className="account-content-card">
              <form className="profile-form" onSubmit={handleSave}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      <User size={16} /> Họ và tên
                    </label>
                    <input 
                      type="text" 
                      value={formData.fullName} 
                      readOnly={!isEditing}
                      placeholder="Nhập họ tên"
                      onChange={e => setFormData({...formData, fullName: e.target.value})}
                      className={isEditing ? 'editable' : ''}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <Mail size={16} /> Email
                    </label>
                    <input 
                      type="email" 
                      value={formData.email} 
                      readOnly={true} // Email usually not editable for simplicity
                      className="bg-light"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <Phone size={16} /> Số điện thoại
                    </label>
                    <input 
                      type="text" 
                      value={formData.phone} 
                      readOnly={!isEditing}
                      placeholder="Nhập số điện thoại"
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className={isEditing ? 'editable' : ''}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>
                      <MapPin size={16} /> Địa chỉ nhận hàng
                    </label>
                    <textarea 
                      value={formData.address} 
                      readOnly={!isEditing}
                      placeholder="Nhập địa chỉ"
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className={isEditing ? 'editable' : ''}
                      rows={2}
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="btn-text" 
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          fullName: user.fullName || user.name,
                          email: user.email,
                          phone: user.phone,
                          address: user.address || '123 Đường Fashion, Quận 1, TP. HCM'
                        });
                      }}
                    >
                      Hủy
                    </button>
                    <button type="submit" className="btn-solid">
                      <Save size={18} /> Lưu thay đổi
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
