import React, { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react'
import { productService } from '../services/productService'
import { voucherService } from '../services/voucherService'
import homeBannerService from '../services/homeBannerService'
import ColorTag from '../components/common/ColorTag'
import { useDraggableScroll } from '../hooks/useDraggableScroll'
import { useToast } from '../context/ToastContext'
import { useGlobalContext } from '../context/GlobalContext'
import { useNavigate } from 'react-router-dom'
import feedbackService from '../services/feedbackService'
import settingsService from '../services/settingsService'

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
  const [sectionSettings, setSectionSettings] = useState({
    FeedbackSection_Title: 'FEEDBACK FROM GHOSTS',
    FeedbackSection_Subtitle: 'Tag @GHOSTTRICK.VN để được xuất hiện tại đây',
    FeedbackSection_ButtonText: 'GỬI FEEDBACK CỦA BẠN',
    FeedbackSection_ButtonUrl: 'https://instagram.com/ghosttrick',
    FeedbackSection_ShowButton: 'false'
  });
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

        try {
          const publicSettings = await settingsService.getPublicSettings();
          setSectionSettings(prev => ({ ...prev, ...publicSettings }));
        } catch (err) {
          console.warn('Failed to fetch public settings', err);
        }

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

  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerIntervalRef = useRef(null);

  const startBannerTimer = () => {
    stopBannerTimer();
    bannerIntervalRef.current = setInterval(() => {
      nextSlide();
    }, 5000);
  };

  const stopBannerTimer = () => {
    if (bannerIntervalRef.current) {
      clearInterval(bannerIntervalRef.current);
    }
  };

  const nextSlide = () => {
    setCurrentBannerIndex(prev => (prev + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrentBannerIndex(prev => (prev - 1 + banners.length) % banners.length);
  };

  useEffect(() => {
    if (banners.length > 0) {
      startBannerTimer();
    }
    return () => stopBannerTimer();
  }, [banners.length]);

  const handleManualSlide = (index) => {
    setCurrentBannerIndex(index);
    startBannerTimer();
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
      <section className="hero" onMouseEnter={stopBannerTimer} onMouseLeave={startBannerTimer}>
        <div className="hero-slider-wrapper">
          {banners.length > 0 && banners.map((banner, index) => (
            <div 
              key={banner.id} 
              className={`hero-slide ${index === currentBannerIndex ? 'active' : ''}`}
            >
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
          ))}
        </div>

        {banners.length > 1 && (
          <div className="hero-dots">
            {banners.map((_, index) => (
              <span 
                key={index} 
                className={`dot ${index === currentBannerIndex ? 'active' : ''}`}
                onClick={() => handleManualSlide(index)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Vouchers Section */}
      <section className="section-vouchers">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">EXCLUSIVE OFFERS</h2>
            <div className="section-divider"></div>
          </div>
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
              width: '100%'
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
          
          
        </div>
        </div>
      </section>

      <div className="industrial-divider container"></div>

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
                  {p.totalStock <= 0 && <span className="product-badge soldout">HẾT HÀNG</span>}
                  {p.totalStock > 0 && p.isOnSale && p.originalPrice > p.price && (
                    <span className="product-badge sale">
                      -{Math.round((1 - p.price / p.originalPrice) * 100)}%
                    </span>
                  )}
                  <button 
                    className="wishlist-btn" 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                    }}
                  >
                    <Heart size={20}/>
                  </button>
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
            <h2 className="section-title">{sectionSettings.FeedbackSection_Title}</h2>
            <p className="feedback-desc">{sectionSettings.FeedbackSection_Subtitle}</p>
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
          
          {sectionSettings.FeedbackSection_ShowButton === 'true' && (
            <div className="feedback-footer">
              <button 
                className="btn-industrial" 
                onClick={() => window.open(sectionSettings.FeedbackSection_ButtonUrl, '_blank')}
              >
                {sectionSettings.FeedbackSection_ButtonText}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
