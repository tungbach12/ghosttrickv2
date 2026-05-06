import React, { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ChevronRight, Heart, SlidersHorizontal } from 'lucide-react';
import saleService from '../services/saleService';

export default function SaleEventPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('default');
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      try {
        let response;
        if (slug) {
          response = await saleService.getEventBySlug(slug);
          const data = response.data;
          setEvent(data);
          setProducts(data.products || []);
        } else {
          // Fetch all active events and pick the first one
          response = await saleService.getSaleEvents();
          const activeEvents = response.data;
          if (activeEvents && activeEvents.length > 0) {
            // Fetch full details for the first active event
            const fullEvent = await saleService.getEventBySlug(activeEvents[0].slug);
            setEvent(fullEvent.data);
            setProducts(fullEvent.data.products || []);
          } else {
            setEvent(null);
          }
        }
      } catch (error) {
        console.error('Error fetching sale event:', error);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [slug]);

  useEffect(() => {
    if (!event) return;
    
    const calculateTimeLeft = () => {
      const difference = +new Date(event.endTime) - +new Date();
      if (difference <= 0) return null;
      
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    
    return () => clearInterval(timer);
  }, [event]);

  if (loading) {
    return (
      <div className="container" style={{padding: '80px 0', textAlign: 'center'}}>
        <h2>Đang tải chương trình...</h2>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container" style={{ padding: '120px 20px', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ background: '#f8fafc', padding: '40px', borderRadius: '32px', maxWidth: '500px', width: '100%' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🏷️</div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>Hiện chưa có ưu đãi mới</h2>
          <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '32px' }}>
            Ghosttrick đang chuẩn bị cho những bộ sưu tập và chương trình khuyến mãi bất ngờ tiếp theo. Hãy quay lại sớm nhé!
          </p>
          <Link to="/product" className="btn-solid" style={{ padding: '14px 32px', borderRadius: '12px' }}>
            Xem sản phẩm mới nhất
          </Link>
        </div>
      </div>
    );
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const sortOptions = [
    { value: 'default', label: 'Mới nhất' },
    { value: 'price-asc', label: 'Giá tăng dần' },
    { value: 'price-desc', label: 'Giá giảm dần' },
    { value: 'name-asc', label: 'Tên A-Z' },
    { value: 'name-desc', label: 'Tên Z-A' },
  ];

  return (
    <div className="sale-event-page">
      {/* Banner */}
      {/* Banner */}
      <div className="sale-banner">
        <img src={event.bannerUrl} alt={event.name} className="sale-banner-img" />
        <div className="sale-banner-overlay">
          <div className="container">
            <span className="sale-tag">Chương trình có hạn</span>
            <h1 className="sale-title">{event.name}</h1>
            <p className="sale-desc">{event.description}</p>
            
            {timeLeft ? (
              <div className="countdown">
                <div className="countdown-item">
                  <span className="num">{timeLeft.days}</span>
                  <span className="label">Ngày</span>
                </div>
                <div className="countdown-item">
                  <span className="num">{timeLeft.hours}</span>
                  <span className="label">Giờ</span>
                </div>
                <div className="countdown-item">
                  <span className="num">{timeLeft.minutes}</span>
                  <span className="label">Phút</span>
                </div>
                <div className="countdown-item">
                  <span className="num">{timeLeft.seconds}</span>
                  <span className="label">Giây</span>
                </div>
              </div>
            ) : (
              <div className="sale-ended">Sự kiện đã kết thúc</div>
            )}
          </div>
        </div>
      </div>

      <div className="container">
        <div className="breadcrumb-bar-alt">
          <nav className="breadcrumb">
            <Link to="/">Trang chủ</Link>
            <ChevronRight size={14} />
            <span className="breadcrumb-current">{event.name}</span>
          </nav>
        </div>
      </div>

      {/* Category Tabs (Filtered for Sale) */}
      <div className="category-tabs-bar">
        <div className="container">
          <div className="category-tabs">
            <span className="category-tab active">TẤT CẢ ƯU ĐÃI</span>
          </div>
        </div>
      </div>

      <div className="container product-listing-area">
        <div className="listing-toolbar">
          <p className="listing-count">{products.length} sản phẩm</p>
          <div className="listing-sort">
            <SlidersHorizontal size={16} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="product-grid">
          {products.map(p => (
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
      </div>
    </div>
  );
}
