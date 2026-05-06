import React, { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Heart } from 'lucide-react'
import { productService } from '../services/productService'
import { voucherService } from '../services/voucherService'
import homeBannerService from '../services/homeBannerService'

export default function HomePage() {
  const voucherGridRef = useRef(null);
  const [activeTab, setActiveTab] = useState('new');
  const [newArrivals, setNewArrivals] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [newRes, bestRes, voucherRes, bannerRes] = await Promise.all([
          productService.getNewArrivals(8),
          productService.getBestSellers(8),
          voucherService.getPublicVouchers(),
          homeBannerService.getActiveBanners()
        ]);
        setNewArrivals(newRes);
        setBestSellers(bestRes);
        setVouchers(voucherRes);
        setBanners(bannerRes.data);
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
                  <div className="container">
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
        <div className="slider-container">
          <div className="voucher-grid" ref={voucherGridRef}>
            {vouchers.map((v, i) => (
              <div key={i} className="voucher-card">
                <div className="voucher-left">
                  <span className="voucher-code">{v.code}</span>
                  <span className="voucher-desc">{v.description}</span>
                </div>
                <button className="voucher-btn">Lưu ngay</button>
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
                  {p.originalPrice && (
                    <span className="product-badge sale">
                      -{Math.round((1 - p.price / p.originalPrice) * 100)}%
                    </span>
                  )}
                </div>
                <div className="product-info" data-id={p.id}>
                  <h3 className="product-title">{p.name}</h3>
                  <div className="product-price-row">
                    <span className="product-price">{formatPrice(p.price)}</span>
                    {p.originalPrice && (
                      <span className="product-original-price">{formatPrice(p.originalPrice)}</span>
                    )}
                  </div>
                  <div className="color-swatches">
                    {p.colors.map((c, i) => (
                      <span key={i} className="swatch" style={{ background: c, border: c === '#ffffff' ? '1px solid #ddd' : 'none' }}></span>
                    ))}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center" style={{marginTop: '3rem'}}>
          <Link to="/product" className="btn-outline">Xem tất cả</Link>
        </div>
      </section>

    </div>
  )
}
