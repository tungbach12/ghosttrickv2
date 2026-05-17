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
import saleService from '../services/saleService'
import { Zap, Clock, TrendingUp } from 'lucide-react'
import { calculateSalePercentage } from '../utils/productUtils'

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
  const [activeSale, setActiveSale] = useState(null);
  const [saleTimeLeft, setSaleTimeLeft] = useState(null);
  const saleProductsRef = useRef(null);
  useDraggableScroll(saleProductsRef);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [newRes, bestRes, voucherRes, bannerRes, feedbackRes, saleRes] = await Promise.all([
          productService.getNewArrivals(8),
          productService.getBestSellers(8),
          voucherService.getPublicVouchers(),
          homeBannerService.getActiveBanners(),
          feedbackService.getFeedbacks(),
          saleService.getSaleEvents()
        ]);
        setNewArrivals(newRes);
        setBestSellers(bestRes);
        setVouchers(voucherRes);
        setBanners(bannerRes.data);
        setFeedbacks(feedbackRes);

        // Handle Sale logic
        if (saleRes.data && saleRes.data.length > 0) {
          const now = new Date();
          const validEvents = saleRes.data.filter(e => e.isActive && !e.isDeleted);
          
          let selected = validEvents.find(e => new Date(e.startTime) <= now && new Date(e.endTime) > now);
          if (!selected) {
            selected = validEvents.find(e => new Date(e.startTime) > now);
          }

          if (selected) {
            const fullEvent = await saleService.getEventBySlug(selected.slug);
            setActiveSale(fullEvent.data);
          }
        }

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
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const bannerIntervalRef = useRef(null);

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe) nextSlide();
    if (isRightSwipe) prevSlide();
  };

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

  useEffect(() => {
    if (!activeSale) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      const start = new Date(activeSale.startTime);
      const end = new Date(activeSale.endTime);
      
      const targetDate = now < start ? start : end;
      const difference = +targetDate - +now;

      if (difference <= 0) return null;

      return {
        hours: Math.floor(difference / (1000 * 60 * 60)),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isUpcoming: now < start
      };
    };

    const timer = setInterval(() => {
      setSaleTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSale]);

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
      <section 
        className="hero" 
        onMouseEnter={stopBannerTimer} 
        onMouseLeave={startBannerTimer}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div 
          className="hero-slider-wrapper"
          style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}
        >
          {banners.length > 0 && banners.map((banner, index) => (
            <div 
              key={banner.id} 
              className={`hero-slide ${index === currentBannerIndex ? 'active' : ''}`}
            >
              <Link to={banner.linkUrl || '#'}>
                <img src={banner.imageUrl} alt={banner.title} className="hero-img" />
                <div className={`hero-overlay ${!(banner.title || banner.subtitle) ? 'empty' : ''}`}>
                  {(banner.title || banner.subtitle) && (
                    <div className="hero-content">
                      {banner.title && <h1 className="hero-title" data-text={banner.title}>{banner.title}</h1>}
                      {banner.subtitle && <p className="hero-subtitle">{banner.subtitle}</p>}
                      {banner.linkUrl && <span className="hero-btn">Khám phá ngay</span>}
                    </div>
                  )}
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

      {/* Flash Sale Section */}
      {activeSale && saleTimeLeft && (
        <section className="section-flash-sale">
          <div className="container">
            <div className="flash-sale-header">
              <div className="flash-title-wrapper">
                <div className="flash-badge">
                  <Zap size={18} fill="currentColor" />
                  <span>FLASH SALE</span>
                </div>
                <div className="countdown-timer">
                  <span className="timer-label">{saleTimeLeft.isUpcoming ? 'BẮT ĐẦU SAU' : 'KẾT THÚC SAU'}</span>
                  <div className="timer-slots">
                    <span className="slot">{String(saleTimeLeft.hours).padStart(2, '0')}</span>
                    <span className="sep">:</span>
                    <span className="slot">{String(saleTimeLeft.minutes).padStart(2, '0')}</span>
                    <span className="sep">:</span>
                    <span className="slot">{String(saleTimeLeft.seconds).padStart(2, '0')}</span>
                  </div>
                </div>
              </div>
              <Link to={`/sale/${activeSale.slug}`} className="view-all-link">
                Xem tất cả <ChevronRight size={16} />
              </Link>
            </div>

            <div className="flash-products-slider" ref={saleProductsRef}>
              {activeSale.products && activeSale.products.map(p => (
                <Link key={p.id} to={`/product/${p.id}`} className="flash-product-card">
                  <div className="flash-img-wrapper">
                    <img src={p.mainImageUrl} alt={p.name} />
                    {p.originalPrice > p.price && (
                      <div className="flash-discount-badge">
                        -{calculateSalePercentage(p.price, p.originalPrice)}%
                      </div>
                    )}
                  </div>
                  <div className="flash-info">
                    <div className="flash-price">{formatPrice(p.price)}</div>
                    {p.originalPrice > 0 && p.originalPrice > p.price && (
                      <div className="product-original-price">{formatPrice(p.originalPrice)}</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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
                      -{calculateSalePercentage(p.price, p.originalPrice)}%
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
      {feedbacks.length > 0 && (
        <section className="section-feedback simplified">
          <div className="container">
            <div className="feedback-header">
              <h2 className="section-title">{sectionSettings.FeedbackSection_Title || 'FEEDBACK FROM GHOSTS'}</h2>
              {sectionSettings.FeedbackSection_Subtitle && <p className="feedback-desc">{sectionSettings.FeedbackSection_Subtitle}</p>}
            </div>
            
            <div className="feedback-vertical-stack">
              {feedbacks.slice(0, 3).map((fb) => (
                <div key={fb.id} className="feedback-item-vertical">
                  <div className="fb-img-box">
                    <img src={fb.imageUrl} alt={fb.title || 'Feedback'} />
                    {(fb.title || fb.subtitle) && (
                      <div className="fb-overlay-simple">
                        {fb.title && <h3 className="fb-title-simple">{fb.title}</h3>}
                        {fb.subtitle && <p className="fb-subtitle-simple">{fb.subtitle}</p>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}




      {/* Floating Sale Widget */}
      {activeSale && (
        <Link to={`/sale/${activeSale.slug}`} className="floating-sale-widget">
          <div className="widget-content">
            <Zap size={24} fill="currentColor" />
            <span className="widget-text">DEAL HOT</span>
          </div>
        </Link>
      )}
    </div>
  )
}
