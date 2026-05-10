import React, { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Heart } from 'lucide-react'
import { productService } from '../services/productService'
import { voucherService } from '../services/voucherService'
import homeBannerService from '../services/homeBannerService'
import ColorTag from '../components/common/ColorTag'
import { useDraggableScroll } from '../hooks/useDraggableScroll'
import { useToast } from '../context/ToastContext'
import { useGlobalContext } from '../context/GlobalContext'
import { useNavigate } from 'react-router-dom'
import feedbackService from '../services/feedbackService'

export default function HomePage() {
  const voucherGridRef = useRef(null);
  useDraggableScroll(voucherGridRef);
  const [activeTab, setActiveTab] = useState('new');
  const [newArrivals, setNewArrivals] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [banners, setBanners] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { user } = useGlobalContext();
  const [userVoucherCodes, setUserVoucherCodes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [newRes, bestRes, voucherRes, bannerRes, feedbackRes] = await Promise.all([
          productService.getNewArrivals(8),
          productService.getBestSellers(8),
          voucherService.getPublicVouchers(),
          homeBannerService.getActiveBanners(),
          feedbackService.getFeedbacks()
        ]);
        setNewArrivals(newRes);
        setBestSellers(bestRes);
        setVouchers(voucherRes);
        setBanners(bannerRes.data);
        setFeedbacks(feedbackRes);

        if (user) {
          const wallet = await voucherService.getMyWallet();
          setUserVoucherCodes(wallet.map(v => v.code));
        }
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const scrollNext = (ref) => {
    if (ref.current) {
      const scrollAmount = ref.current.clientWidth / 2;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollPrev = (ref) => {
    if (ref.current) {
      const scrollAmount = ref.current.clientWidth / 2;
      ref.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const displayedProducts = activeTab === 'best' ? bestSellers : newArrivals;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleSaveVoucher = async (code) => {
    if (!user) {
      addToast('Vui lòng đăng nhập để lưu mã giảm giá', 'info');
      navigate('/sign-in');
      return;
    }

    try {
      await voucherService.saveToWallet(code);
      addToast('Đã lưu mã giảm giá vào kho của bạn!', 'success');
      // Optionally re-fetch vouchers or update local state if needed
    } catch (error) {
      const message = error.response?.data?.message || 'Không thể lưu mã giảm giá';
      addToast(message, 'error');
    }
  };

  return (
    <div className="home-page">
      {/* Hero Banner */}
      <section className="hero">
        {banners.length > 0 ? (
          banners.map((banner, index) => (
            <div key={banner.id} className="hero-slide" style={{ display: index === 0 ? 'block' : 'none' }}>
              <Link to={banner.linkUrl || '#'}>
                <img src={banner.imageUrl} alt={banner.title} className="hero-img" />
                <div className="hero-overlay">
                  <div className="hero-content">
                    <h1 className="hero-title" data-text={banner.title}>{banner.title}</h1>
                    <p className="hero-subtitle">{banner.subtitle}</p>
                    {banner.linkUrl && <span className="hero-btn">Khám phá ngay</span>}
                  </div>
                </div>
              </Link>
            </div>
          ))
        ) : (
          <img src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=80&w=2000" alt="Hero Banner" className="hero-img" />
        )}
      </section>

      {/* Vouchers Section */}
      <section className="container section-vouchers">
        <div className="gt-voucher-slider-container">
          <div 
            className="gt-voucher-slider-track" 
            ref={voucherGridRef}
            style={{ 
              display: 'flex', 
              flexDirection: 'row',
              flexWrap: 'nowrap', 
              gap: '30px', 
              overflowX: 'auto',
              width: '100%',
              padding: '30px 40px 60px'
            }}
          >
            {vouchers.map((v, i) => (
              <div key={i} className="voucher-card">
                <div className="voucher-left">
                  <span className="voucher-code">{v.code}</span>
                  <span className="voucher-desc">{v.description}</span>
                  <span className="voucher-min">Đơn tối thiểu {formatPrice(v.minOrderAmount)}</span>
                  <span className="voucher-validity">
                    HSD: {new Date(v.startDate).toLocaleDateString('vi-VN')} - {v.endDate ? new Date(v.endDate).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                  </span>
                </div>
                <button 
                  className={`voucher-btn ${userVoucherCodes.includes(v.code) ? 'saved' : ''}`}
                  onClick={() => !userVoucherCodes.includes(v.code) && handleSaveVoucher(v.code)}
                  disabled={userVoucherCodes.includes(v.code)}
                >
                  {userVoucherCodes.includes(v.code) ? 'Đã lưu' : 'Lưu ngay'}
                </button>
              </div>
            ))}
          </div>
          <button className="nav-btn prev" onClick={() => scrollPrev(voucherGridRef)}><ChevronLeft size={20}/></button>
          <button className="nav-btn next" onClick={() => scrollNext(voucherGridRef)}><ChevronRight size={20}/></button>
        </div>
      </section>

      {/* Product Section */}
      <section className="container section-products">
        <div className="tabs">
          <h2 
            className={`section-title ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            NEW ARRIVALS
          </h2>
          <h2 
            className={`section-title ${activeTab === 'best' ? 'active' : ''}`}
            onClick={() => setActiveTab('best')}
          >
            BEST SELLERS
          </h2>
        </div>
        
        <div className="product-grid">
          {displayedProducts.map(p => (
            <div key={p.id} className="product-card">
              <Link to={`/product/${p.id}`} className="product-link-overlay">
                <div className="product-img-wrapper">
                  <img src={p.mainImageUrl} alt={p.name} className="product-img" />
                  <button 
                    className="wishlist-btn" 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                    }}
                  >
                    <Heart size={20}/>
                  </button>
                  {p.originalPrice > 0 && p.originalPrice > p.price && (
                    <span className="product-badge sale">
                      -{Math.round((1 - p.price / p.originalPrice) * 100)}%
                    </span>
                  )}
                </div>
                <div className="product-info" data-id={p.id}>
                  <h3 className="product-title">{p.name}</h3>
                  <div className="product-price-row">
                    <span className="product-price">{formatPrice(p.price)}</span>
                    {p.originalPrice > 0 && p.originalPrice > p.price && (
                      <span className="product-original-price">{formatPrice(p.originalPrice)}</span>
                    )}
                  </div>
                  <div className="product-meta-row">
                    <div className="color-swatches">
                      {p.colors.map((c) => (
                        <ColorTag key={c.id} name={c.name} hex={c.hexCode} size="sm" showLabel={false} />
                      ))}
                    </div>
                    {p.salesCount > 0 && (
                      <span className="product-sales-count">Đã bán {p.salesCount}</span>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center" style={{marginTop: '3rem'}}>
          <Link 
            to={activeTab === 'best' ? '/product?sort=best-sellers' : '/product'} 
            className="btn-outline"
          >
            Xem tất cả
          </Link>
        </div>
      </section>
      {/* Feedback Section */}
      <section className="section-feedback">
        <div className="container">
          <div className="feedback-header">
            <h2 className="section-title">FEEDBACK FROM GHOSTS</h2>
            <p className="feedback-desc">Tag <span className="highlight">@GHOSTTRICK.VN</span> để được xuất hiện tại đây</p>
          </div>
          
          <div className="feedback-grid">
            {[1, 2, 3, 4, 5, 6].map((slot) => {
              const fb = feedbacks.find(f => f.displayOrder === slot);
              if (!fb) return (
                <div key={`slot-${slot}`} className="feedback-item placeholder" data-order={slot}>
                  <div className="placeholder-content">GHOST_SLOT_{slot}</div>
                </div>
              );

              return (
                <div key={`slot-${slot}`} className="feedback-item" data-order={slot}>
                  <img src={fb.imageUrl} alt={fb.customerName || 'Feedback'} className="feedback-img" />
                  <div className="feedback-overlay">
                    <span className="customer-name">@{fb.customerName || 'GHOST_MEMBER'}</span>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="feedback-footer">
            <button className="btn-industrial" onClick={() => window.open('https://instagram.com/ghosttrick', '_blank')}>
              GỬI FEEDBACK CỦA BẠN
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
