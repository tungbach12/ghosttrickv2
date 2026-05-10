import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Users, 
  Search, 
  UserX, 
  UserCheck, 
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldAlert,
  Edit3,
  X
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(null); // ID of user being updated
  const pageSize = 10;
  const { addToast } = useToast();

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: ''
  });
  const [modalError, setModalError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        pageSize: pageSize,
      });
      if (searchTerm) params.append('q', searchTerm);

      const response = await api.get(`/admin/users?${params.toString()}`);
      setUsers(response.data.items);
      setTotalCount(response.data.totalCount);
    } catch (error) {
      addToast('Không thể tải danh sách khách hàng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) fetchUsers();
      else setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const toggleUserLock = async (userId, currentIsBanned) => {
    setActionLoading(userId);
    try {
      const response = await api.post(`/admin/users/${userId}/toggle-lock`);
      const { isLocked } = response.data;
      
      setUsers(users.map(u => u.id === userId ? { ...u, isBanned: isLocked } : u));
      addToast(isLocked ? 'Đã khóa tài khoản khách hàng' : 'Đã mở khóa tài khoản khách hàng', 'success');
    } catch (error) {
      const message = error.response?.data?.message || 'Không thể thay đổi trạng thái tài khoản';
      addToast(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setEditFormData({
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '' // Keep password empty initially
    });
    setIsEditModalOpen(true);
    setModalError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    if (editFormData.password && editFormData.password.length < 8) {
      setModalError('Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }

    setActionLoading(selectedUser.id);
    try {
      await api.put(`/admin/users/${selectedUser.id}`, editFormData);
      addToast('Cập nhật người dùng thành công', 'success');
      setIsEditModalOpen(false);
      fetchUsers(); // Refresh list
    } catch (error) {
      setModalError(error.response?.data?.message || 'Không thể cập nhật người dùng');
    } finally {
      setActionLoading(null);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="admin-users-page">
      <div className="page-header">
        <div className="header-info">
          <h1>Quản lý Khách hàng</h1>
          <p>Xem thông tin chi tiết và quản lý quyền truy cập của người dùng.</p>
        </div>
      </div>

      <div className="table-controls">
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo tên, email hoặc số điện thoại..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="users-table-container">
        {loading && currentPage === 1 ? (
          <div className="table-loading">
            <div className="loader"></div>
            <p>Đang tải danh sách khách hàng...</p>
          </div>
        ) : (
          <>
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Liên hệ</th>
                  <th>Hoạt động</th>
                  <th>Chi tiêu</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-info-cell">
                          <div className="user-avatar">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="" />
                            ) : (
                              <div className="avatar-placeholder">
                                {user.fullName?.charAt(0).toUpperCase() || 'U'}
                              </div>
                            )}
                          </div>
                          <div className="user-meta">
                            <span className="user-name">{user.fullName || 'Chưa cập nhật'}</span>
                            <span className="user-role-badge">
                              {user.role === 'Admin' ? <Shield size={12} /> : <Users size={12} />}
                              {user.role || 'User'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-cell">
                          <div className="contact-item">
                            <Mail size={14} />
                            <span>{user.email}</span>
                          </div>
                          <div className="contact-item">
                            <Phone size={14} />
                            <span>{user.phone || 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="activity-cell">
                          <div className="activity-item">
                            <Calendar size={14} />
                            <span>Tham gia: {new Date(user.createdAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                          <div className="activity-item">
                            <CreditCard size={14} />
                            <span>{user.orderCount} đơn hàng</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="spent-value">{formatPrice(user.totalSpent)}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${user.isBanned ? 'banned' : 'active'}`}>
                          {user.isBanned ? 'Đã khóa' : 'Hoạt động'}
                        </span>
                      </td>
                      <td className="text-right">
                        <button 
                          className={`action-btn ${user.isBanned ? 'unlock' : 'lock'}`}
                          onClick={() => toggleUserLock(user.id, user.isBanned)}
                          disabled={actionLoading === user.id || user.role === 'Admin'}
                          title={user.isBanned ? 'Mở khóa' : 'Khóa tài khoản'}
                        >
                          {actionLoading === user.id && !isEditModalOpen ? (
                            <div className="btn-loader"></div>
                          ) : (
                            user.isBanned ? <UserCheck size={18} /> : <UserX size={18} />
                          )}
                        </button>
                        <button 
                          className="action-btn edit"
                          onClick={() => handleEditClick(user)}
                          disabled={actionLoading === user.id}
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit3 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty-table">
                      Không tìm thấy khách hàng nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="page-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                    <button 
                      key={num}
                      className={currentPage === num ? 'active' : ''}
                      onClick={() => setCurrentPage(num)}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <button 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit User Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content user-edit-modal">
            <div className="modal-header">
              <h2>Chỉnh sửa người dùng</h2>
              <button className="close-btn" onClick={() => setIsEditModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="edit-user-form">
              {modalError && (
                <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #fecaca', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={18} />
                  {modalError}
                </div>
              )}
              <div className="form-grid">
                <div className="form-item">
                  <label>Họ và tên</label>
                  <input 
                    type="text" 
                    value={editFormData.fullName}
                    onChange={e => setEditFormData({...editFormData, fullName: e.target.value})}
                    required
                  />
                </div>
                <div className="form-item">
                  <label>Email</label>
                  <input 
                    type="email" 
                    value={editFormData.email}
                    onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                    required
                  />
                </div>
                <div className="form-item">
                  <label>Số điện thoại</label>
                  <input 
                    type="text" 
                    value={editFormData.phone}
                    onChange={e => setEditFormData({...editFormData, phone: e.target.value})}
                  />
                </div>
                <div className="form-item">
                  <label>Mật khẩu mới (Để trống nếu không đổi)</label>
                  <input 
                    type="password" 
                    value={editFormData.password}
                    onChange={e => setEditFormData({...editFormData, password: e.target.value})}
                    placeholder="Tối thiểu 8 ký tự"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="cancel-btn" 
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={actionLoading === selectedUser?.id}
                >
                  {actionLoading === selectedUser?.id ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-users-page {
          padding: 24px;
          animation: fadeIn 0.5s ease-out;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .header-info h1 {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 4px;
        }

        .header-info p {
          color: #64748b;
          font-weight: 500;
        }

        .table-controls {
          margin-bottom: 24px;
          display: flex;
          gap: 16px;
        }

        .search-box {
          flex: 1;
          max-width: 400px;
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-box svg {
          position: absolute;
          left: 16px;
          color: #94a3b8;
        }

        .search-box input {
          width: 100%;
          padding: 12px 16px 12px 48px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .search-box input:focus {
          border-color: #0f172a;
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.05);
          outline: none;
        }

        .users-table-container {
          background: white;
          border-radius: 20px;
          border: 1px solid #f1f5f9;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .modern-table {
          width: 100%;
          border-collapse: collapse;
        }

        .modern-table th {
          background: #f8fafc;
          padding: 16px 24px;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #f1f5f9;
        }

        .modern-table td {
          padding: 20px 24px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .user-info-cell {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .user-avatar {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          overflow: hidden;
          background: #f1f5f9;
        }

        .user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f172a;
          color: white;
          font-weight: 700;
          font-size: 1.25rem;
        }

        .user-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .user-name {
          font-weight: 700;
          color: #0f172a;
        }

        .user-role-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
        }

        .contact-cell, .activity-cell {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .contact-item, .activity-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.813rem;
          color: #64748b;
          font-weight: 500;
        }

        .spent-value {
          font-weight: 800;
          color: #0f172a;
        }

        .status-badge {
          display: inline-flex;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .status-badge.active {
          background: #dcfce7;
          color: #15803d;
        }

        .status-badge.banned {
          background: #fee2e2;
          color: #b91c1c;
        }

        .action-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #64748b;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .action-btn:hover:not(:disabled) {
          border-color: #0f172a;
          color: #0f172a;
          transform: translateY(-2px);
        }

        .action-btn.lock:hover {
          background: #fee2e2;
          color: #ef4444;
          border-color: #fca5a5;
        }

        .action-btn.unlock:hover {
          background: #dcfce7;
          color: #22c55e;
          border-color: #86efac;
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-btn.edit:hover {
          background: #eff6ff;
          color: #2563eb;
          border-color: #93c5fd;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }

        .modal-content {
          background: white;
          border-radius: 24px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
        }

        .modal-header {
          padding: 24px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h2 {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
          padding: 4px;
          border-radius: 8px;
        }

        .close-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .edit-user-form {
          padding: 24px;
        }

        .form-grid {
          display: grid;
          gap: 20px;
        }

        .form-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-item label {
          font-size: 0.875rem;
          font-weight: 700;
          color: #475569;
        }

        .form-item input {
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          font-weight: 500;
          transition: all 0.2s;
        }

        .form-item input:focus {
          border-color: #0f172a;
          outline: none;
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.05);
        }

        .modal-footer {
          margin-top: 32px;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .cancel-btn {
          padding: 12px 24px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: white;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submit-btn {
          padding: 12px 24px;
          border-radius: 12px;
          background: #0f172a;
          color: white;
          border: none;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.25);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .pagination {
          padding: 20px 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          background: #f8fafc;
        }

        .page-numbers {
          display: flex;
          gap: 8px;
        }

        .page-numbers button {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .page-numbers button.active {
          background: #0f172a;
          color: white;
          border-color: #0f172a;
        }

        .pagination button {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-loader {
          width: 18px;
          height: 18px;
          border: 2px solid #cbd5e1;
          border-top-color: #64748b;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-table {
          padding: 60px !important;
          text-align: center;
          color: #64748b;
          font-weight: 500;
        }
      `}} />
    </div>
  );
};

export default AdminUsers;
