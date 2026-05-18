import React, { useState, useEffect } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { Search, ShoppingBag, Menu, X, User, ChevronDown, Share2, Camera, Play, MapPin, Mail, Phone, Heart, MessageCircle, LogOut } from 'lucide-react'


import { saleEvents } from '../data'
import { useGlobalContext } from '../context/GlobalContext'
import { getCategories } from '../services/categoryService'
import topBarService from '../services/topBarService'


export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [promoIndex, setPromoIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [categories, setCategories] = useState([])
  const [promotions, setPromotions] = useState([])

  const { cartItems, user, logout, setIsCartOpen } = useGlobalContext()
  const navigate = useNavigate()

  useEffect(() => {
    if (promotions.length > 0) {
      const timer = setInterval(() => {
        setPromoIndex((prev) => (prev + 1) % promotions.length);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [promotions]);

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const data = await topBarService.getPromos();
        if (data && data.length > 0) {
          setPromotions(data.map(p => p.content));
        } else {
          setPromotions(["Chào mừng bạn đến với Ghosttrick!"]);
        }
      } catch (error) {
        console.error("Error fetching promos:", error);
        setPromotions(["Chào mừng bạn đến với Ghosttrick!"]);
      }
    };
    fetchPromos();
  }, []);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCats();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/product?q=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <div className="app">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="container top-bar-inner">
          <span className="promo-text" key={promoIndex}>{promotions[promoIndex]}</span>
        </div>
      </div>

      {/* Header */}
      <header className="header">
        {isMobileMenuOpen && <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>}

        <div className="container header-main">
          <div className="header-left">
            <button className="icon-btn mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <Link to="/" className="logo">
              <video
                src="/videos/brand-logo.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="brand-video"
              />
            </Link>
          </div>



          {/* Desktop Navigation */}
          <nav className="desktop-nav">
            <ul className="nav-menu">
              <li className="has-dropdown">
                <Link to="/product" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  SẢN PHẨM <ChevronDown size={14} />
                </Link>
                <ul className="dropdown-menu">
                  <li><Link to="/product">TẤT CẢ</Link></li>
                  {categories.length > 0 ? (
                    categories.map(cat => (
                      <li key={cat.id}>
                        <Link to={`/product/category/${cat.slug}`}>{cat.name.toUpperCase()}</Link>
                      </li>
                    ))
                  ) : (
                    <>
                      <li><Link to="/product/category/tops">TOPS</Link></li>
                      <li><Link to="/product/category/outerwear">OUTERWEAR</Link></li>
                    </>
                  )}
                </ul>
              </li>
              <li><Link to="/sale" className="nav-link" style={{ color: 'red' }}>SALE</Link></li>
              <li><Link to="/about" className="nav-link">ABOUT US</Link></li>
            </ul>
          </nav>

          <div className="header-right">
            {isSearchOpen ? (
              <form onSubmit={handleSearch} className="search-form desktop-only">
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <button type="button" className="icon-btn" onClick={() => setIsSearchOpen(false)}><X size={18} /></button>
              </form>
            ) : (
              <button className="icon-btn desktop-search-btn" onClick={() => setIsSearchOpen(true)}><Search size={20} /></button>
            )}
            <button className="icon-btn mobile-search-btn" onClick={() => setIsSearchOpen(!isSearchOpen)}><Search size={20} /></button>

            {user ? (
              <Link to="/account" className="icon-btn mobile-only" title="Tài khoản">
                {user.avatarUrl ? (
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid #000' }}>
                    <img src={user.avatarUrl} alt={user.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <User size={20} />
                )}
              </Link>
            ) : (
              <Link to="/sign-in" className="icon-btn mobile-only" title="Đăng nhập">
                <User size={20} />
              </Link>
            )}

            <Link to="/cart" className="icon-btn cart-btn">
              <ShoppingBag size={20} />
              <span className="cart-badge">{cartItems.length}</span>
            </Link>
            <div className="auth-divider desktop-only"></div>
            {user ? (
              <div className="has-dropdown desktop-only">
                <div className="auth-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {user.avatarUrl ? (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                      <img src={user.avatarUrl} alt={user.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <User size={18} />
                  )}
                  <span style={{ fontWeight: '600' }}>
                    {user.fullName ? (
                      user.fullName.split(' ').length > 1
                        ? `${user.fullName.split(' ')[0]} ${user.fullName.split(' ').pop()}`
                        : user.fullName
                    ) : (user.name || 'User')}
                  </span>
                </div>
                <ul className="dropdown-menu">
                  <li><Link to="/account">Thông tin cá nhân</Link></li>
                  <li><Link to="/account?tab=orders">Đơn hàng của tôi</Link></li>
                  <li><Link to="/account?tab=password">Đổi mật khẩu</Link></li>
                  {user.role === 'Admin' && (
                    <li><Link to="/admin" style={{ color: 'red', fontWeight: 'bold' }}>Quản trị viên</Link></li>
                  )}
                  <li className="menu-divider"></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); logout(); }} style={{ color: '#ef4444' }}>Đăng xuất</a></li>
                </ul>
              </div>
            ) : (
              <Link to="/sign-in" className="auth-btn desktop-only">
                <User size={18} />
                <span>ĐĂNG NHẬP</span>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Search Bar Overlay */}
        <div className={`mobile-search-bar ${isSearchOpen ? 'active' : ''}`}>
          <div className="container">
            <form onSubmit={handleSearch} className="mobile-search-form">
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="button" className="icon-btn" onClick={() => setIsSearchOpen(false)}><X size={20} /></button>
            </form>
          </div>
        </div>


        {/* Mobile Navigation Drawer */}
        <div className={`nav-drawer ${isMobileMenuOpen ? 'active' : ''}`}>
          <div className="drawer-header">
            <Link to="/" className="logo" onClick={() => setIsMobileMenuOpen(false)}>GHOSTTRICK</Link>
            <button className="icon-btn" onClick={() => setIsMobileMenuOpen(false)}><X size={24} /></button>
          </div>



          <div className="nav-menu-mobile">
            <ul>
              <li>
                <Link to="/product" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>SẢN PHẨM</Link>
                {categories.length > 0 && (
                  <ul className="mobile-dropdown" style={{ paddingLeft: '20px', listStyle: 'none' }}>
                    <li>
                      <Link
                        to="/product"
                        className="nav-link"
                        style={{ fontSize: '0.9rem', padding: '10px 25px', textTransform: 'none', border: 'none', fontWeight: 'bold' }}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        All
                      </Link>
                    </li>
                    {categories.map(cat => (
                      <li key={cat.id}>
                        <Link
                          to={`/product/category/${cat.slug}`}
                          className="nav-link"
                          style={{ fontSize: '0.9rem', padding: '10px 25px', textTransform: 'none', border: 'none' }}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {cat.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
              <li><Link to="/sale" className="nav-link" style={{ color: 'red' }} onClick={() => setIsMobileMenuOpen(false)}>SALE</Link></li>
              <li><Link to="/about" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>ABOUT US</Link></li>
            </ul>
          </div>

          <div className="drawer-footer">
            <div className="drawer-auth-btns">
              {user ? (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ marginBottom: '15px', fontWeight: '600' }}>
                    Chào, {user.fullName || user.name || 'User'}
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Link to="/account" className="btn-solid" style={{ flex: 1 }} onClick={() => setIsMobileMenuOpen(false)}>TÀI KHOẢN</Link>
                    <button onClick={() => { logout(); setIsMobileMenuOpen(false); }} className="btn-outline" style={{ flex: 1 }}>ĐĂNG XUẤT</button>
                  </div>
                  {user.role === 'Admin' && (
                    <Link to="/admin" className="btn-solid admin-badge-btn" onClick={() => setIsMobileMenuOpen(false)}>QUẢN TRỊ VIÊN</Link>
                  )}
                </div>
              ) : (
                <>
                  <Link to="/sign-in" className="btn-solid" onClick={() => setIsMobileMenuOpen(false)}>ĐĂNG NHẬP</Link>
                  <Link to="/sign-up" className="btn-outline" onClick={() => setIsMobileMenuOpen(false)}>ĐĂNG KÝ</Link>
                </>
              )}
            </div>
          </div>
        </div>


      </header>

      {/* Page Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-main">
          <div className="footer-col brand-col">
            <Link to="/" className="logo footer-logo-text">Ghosttrick</Link>
            <p className="footer-brand-desc">
              Biểu tượng Ghost 👻 đại diện cho tinh thần tự do, bí ẩn và khác biệt. Dành cho những người yêu mến streetwear, hiphop và đơn giản là thích mặc đẹp theo cách riêng.
            </p>
            <ul className="footer-contact">
              <li><Mail size={16} /> ghosttrickvn@gmail.com</li>
              <li><Phone size={16} /> 0333452926</li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Hỗ trợ khách hàng</h4>
            <ul className="footer-links">
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/policy/doi-tra">Chính sách bảo hành & đổi trả</Link></li>
              <li><Link to="/policy/van-chuyen">Chính sách vận chuyển (Freeship)</Link></li>
              <li><Link to="/policy/bao-mat">Chính sách bảo mật thông tin</Link></li>
              <li><Link to="/policy/thanh-toan">Phương thức thanh toán</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Kết nối với chúng tôi</h4>
            <ul className="footer-links social-list">
              <li><a href="https://www.facebook.com/share/18VvASdCk4/" target="_blank" rel="noreferrer">Facebook</a></li>
              <li><a href="https://www.instagram.com/ghosttrick.vn?igsh=ZTk5Nzd6b2M1OHY2" target="_blank" rel="noreferrer">Instagram</a></li>
              <li><a href="https://www.tiktok.com/@ghosttrick.vn?_r=1&_t=ZS-96R9HcSmBJC" target="_blank" rel="noreferrer">TikTok</a></li>
            </ul>
          </div>


        </div>
        <div className="footer-bottom">
          <div className="container bottom-inner">
            <p>© 2024 Ghosttrick. All rights reserved.</p>
          </div>
        </div>
      </footer>




    </div>
  )
}
