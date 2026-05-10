import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, ShoppingCart, Tags, Ticket, LogOut, Bell, Search, Percent, Menu, X, Palette, Camera, Star, Users } from 'lucide-react';
import { useGlobalContext } from '../context/GlobalContext';
import '../styles/pages/admin.css';

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { logout, user } = useGlobalContext();

  const navigation = [
    { name: 'Tổng quan', href: '/admin', icon: LayoutDashboard },
    { name: 'Sản phẩm', href: '/admin/products', icon: ShoppingBag },
    { name: 'Đơn hàng', href: '/admin/orders', icon: ShoppingCart },
    { name: 'Danh mục', href: '/admin/categories', icon: Tags },
    { name: 'Mã giảm giá', href: '/admin/vouchers', icon: Ticket },
    { name: 'Quản lý màu sắc', href: '/admin/colors', icon: Palette },
    { name: 'Chương trình Sale', href: '/admin/sales', icon: Percent },
    { name: 'Banner Trang chủ', href: '/admin/home-banners', icon: ShoppingBag },
    { name: 'Khách hàng', href: '/admin/users', icon: Users },
    { name: 'Visual Feedback', href: '/admin/feedbacks', icon: Camera },
    { name: 'Đánh giá SP', href: '/admin/reviews', icon: Star },
  ];

  return (
    <div className={`admin-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div className="admin-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${isSidebarOpen ? 'active' : ''}`}>
        <div className="admin-sidebar-logo">
          <Link to="/" className="admin-logo-link" onClick={() => setIsSidebarOpen(false)}>
            <span className="admin-logo-text">GHOSTTRICK</span>
            <span className="admin-logo-subtext">Management System</span>
          </Link>
          <button className="sidebar-close-btn" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <nav className="admin-nav">
          <ul className="admin-nav-list">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`admin-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <item.icon size={20} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="admin-sidebar-footer">
          <button onClick={logout} className="logout-btn">
            <LogOut size={20} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="admin-main-wrapper">
        <header className="admin-header">
          <div className="admin-header-left">
            <button className="sidebar-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="admin-search-box desktop-only">
              <Search size={18} color="#64748b" />
              <input type="text" placeholder="Tìm kiếm nhanh..." />
            </div>
          </div>
          
          <div className="admin-header-actions">
            <button className="action-btn">
              <Bell size={20} />
            </button>
            <div className="admin-profile-trigger">
              <div className="admin-user-info desktop-only">
                <p className="admin-user-name">{user?.fullName || 'Admin'}</p>
                <p className="admin-user-role">Administrator</p>
              </div>
              <div className="admin-avatar">
                {user?.fullName?.charAt(0) || 'A'}
              </div>
            </div>
          </div>
        </header>

        <main className="admin-page-content animate-up">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
