import React, { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Heart, ChevronRight, Minus, Plus, Share2, AlertCircle, Star, User, Trash2, Edit2, Ruler, X } from 'lucide-react'
import { productService } from '../services/productService'
import reviewService from '../services/reviewService'
import ReviewModal from '../components/ReviewModal'

import { useGlobalContext } from '../context/GlobalContext'
import { useToast } from '../context/ToastContext'
import { calculateSalePercentage } from '../utils/productUtils'

export default function ProductDetailPage() {
  const { addToCart, user } = useGlobalContext();
  const { addToast } = useToast();
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [activeImage, setActiveImage] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [showSizeChart, setShowSizeChart] = useState(false);
  
  const descRef = useRef(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [showDescToggle, setShowDescToggle] = useState(false);



  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const [data, reviewsData] = await Promise.all([
          productService.getProductById(productId),
          reviewService.getProductReviews(productId)
        ]);
        
        if (data) {
          setProduct(data);
          setReviews(reviewsData || []);
          
          if (data.colors && data.colors.length > 0) {
            setSelectedColor(data.colors[0]);
          }
          setActiveImage(data.mainImageUrl);
        }
      } catch (error) {
        console.error('Error fetching product details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  // Separate effect for related products to prevent blocking the main content
  useEffect(() => {
    const fetchRelated = async () => {
      if (product?.categorySlug) {
        try {
          const related = await productService.getProducts({ 
            category: product.categorySlug, 
            pageSize: 5 
          });
          setRelatedProducts(related.items.filter(p => p.id !== parseInt(productId)).slice(0, 4));
        } catch (error) {
          console.error('Error fetching related products:', error);
        }
      }
    };
    fetchRelated();
  }, [product?.categorySlug, productId]);

  useEffect(() => {
    const checkHeight = () => {
      if (descRef.current) {
        if (descRef.current.scrollHeight > 350) {
          setShowDescToggle(true);
        } else {
          setShowDescToggle(false);
        }
      }
    };

    checkHeight();
    // Re-check after DOM paints and images potentially load
    const timer1 = setTimeout(checkHeight, 100);
    const timer2 = setTimeout(checkHeight, 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [product?.description]);

  const availableSizes = product?.variants
    ? [...new Set(product.variants.filter(v => v.colorId === selectedColor?.id).map(v => v.size))]
    : [];

  const handleAddToCart = async (isBuyNow = false) => {
    if (!selectedSize) {
      addToast('Vui lòng chọn kích thước!', 'warning');
      return;
    }

    const variant = product.variants.find(v => v.colorId === selectedColor?.id && v.size === selectedSize);

    if (!variant || variant.stock < quantity || product.totalStock <= 0) {
      addToast('Sản phẩm đã hết hàng hoặc không đủ số lượng!', 'error');
      return;
    }

    const success = await addToCart({
      variantId: variant.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      mainImageUrl: product.mainImageUrl,
      size: selectedSize,
      color: selectedColor?.name,
      colorHex: selectedColor?.hexCode,
      quantity: quantity,
      stock: variant.stock
    }, isBuyNow);

    if (success && isBuyNow) {
      navigate('/checkout');
    }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) return;
    try {
      await reviewService.deleteReview(id);
      addToast('Đã xóa đánh giá!', 'success');
      // Refresh reviews
      const updatedReviews = await reviewService.getProductReviews(productId);
      setReviews(updatedReviews);
    } catch (error) {
      addToast('Không thể xóa đánh giá.', 'error');
    }
  };


  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <h2>Đang tải sản phẩm...</h2>
      </div>
    );
  }

  if (!product && !loading) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <h2>Sản phẩm không tồn tại hoặc đã ngừng kinh doanh</h2>
        <Link to="/product" className="btn-outline" style={{ marginTop: '20px', display: 'inline-block' }}>Quay lại</Link>
      </div>
    );
  }

  // Safety check before render if product is still loading
  if (!product) return null;

  return (
    <div className="product-detail-page">
      <div className="breadcrumb-bar">
        <div className="container">
          <nav className="breadcrumb">
            <Link to="/">Trang chủ</Link>
            <ChevronRight size={14} />
            <Link to="/product">Sản phẩm</Link>
            <ChevronRight size={14} />
            <span className="breadcrumb-current">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="container pd-main">
        <div className="pd-gallery">
          <div className="pd-main-img">
            <img src={activeImage || product.mainImageUrl} alt={product.name} />
            {product.totalStock <= 0 && <span className="product-badge soldout" style={{background: '#6b7280'}}>HẾT HÀNG</span>}
            {product.totalStock > 0 && product.isOnSale && product.originalPrice > product.price && <span className="product-badge sale">SALE</span>}
          </div>
          <div className="pd-thumbs">
            {/* Main image as first thumb */}
            <div 
              className={`pd-thumb ${activeImage === product.mainImageUrl ? 'active' : ''}`}
              onClick={() => setActiveImage(product.mainImageUrl)}
            >
              <img src={product.mainImageUrl} alt="Thumb main" />
            </div>
            {/* Other images */}
            {product.images.map((img, i) => (
              <div 
                key={i} 
                className={`pd-thumb ${activeImage === img ? 'active' : ''}`}
                onClick={() => setActiveImage(img)}
              >
                <img src={img} alt={`Thumb ${i}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="pd-info">
          <h1 className="pd-title">{product.name}</h1>
          <p className="pd-sku">Mã SP: {product.sku}</p>
          {product.salesCount > 0 && (
            <div className="pd-sales-badge">
              <span className="sales-icon">🔥</span>
              Đã bán {product.salesCount} sản phẩm
            </div>
          )}

          {/* Flash Sale Header */}
          {product.flashStock !== null && product.flashStock !== undefined && (
            <div className="pd-flash-sale-header" style={{
              background: 'linear-gradient(90deg, #ff4d4d, #f97316)',
              padding: '12px 20px',
              borderRadius: '12px',
              color: 'white',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span style={{background: 'white', color: '#ff4d4d', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem'}}>GHOST FLASH</span>
                  ĐANG DIỄN RA
                </div>
              </div>
              <div style={{textAlign: 'right'}}>
                <div style={{fontSize: '0.7rem', opacity: 0.9}}>SỐ LƯỢNG CÓ HẠN</div>
                <div style={{fontWeight: 700}}>Còn {Math.max(0, product.flashStock - product.soldCount)} sản phẩm</div>
              </div>
            </div>
          )}

          <div className="pd-price-row">
            <span className="pd-price">{formatPrice(product.price)}</span>
            {product.originalPrice > 0 && product.originalPrice > product.price && (
              <span className="pd-original-price">{formatPrice(product.originalPrice)}</span>
            )}
            {product.originalPrice > product.price && (
                <span style={{
                  background: '#fee2e2',
                  color: '#ef4444',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  marginLeft: '12px'
                }}>
                  -{calculateSalePercentage(product.price, product.originalPrice)}%
                </span>
            )}
          </div>

          {product.flashStock !== null && product.flashStock !== undefined && (
            <div className="flash-sale-progress" style={{maxWidth: '300px', marginBottom: '24px'}}>
              <div className="progress-bar-bg" style={{ position: 'relative', height: '16px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <div 
                  className="progress-bar-fill" 
                  style={{ 
                    height: '100%',
                    background: product.soldCount >= product.flashStock ? '#94a3b8' : 'linear-gradient(90deg, #ef4444, #f97316)',
                    width: `${Math.min(100, (product.soldCount / product.flashStock) * 100)}%`,
                    transition: 'width 0.5s ease-in-out'
                  }}
                ></div>
                <div className="progress-text-overlay" style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 800, color: 'black', pointerEvents: 'none'
                }}>
                  {product.soldCount >= product.flashStock ? 'CHÁY HÀNG' : `Đã bán ${product.soldCount}`}
                </div>
              </div>
            </div>
          )}

          <div className="pd-section">
            <label className="pd-label">Màu sắc: <strong>{selectedColor?.name}</strong></label>
            <div className="pd-colors">
              {product.colors.map((c) => (
                <button
                  key={c.id}
                  className={`pd-color-btn ${selectedColor?.id === c.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedColor(c);
                    setSelectedSize(null);
                  }}
                  title={c.name}
                >
                  <span style={{ background: c.hexCode, border: c.hexCode === '#ffffff' ? '1px solid #ddd' : 'none' }}></span>
                </button>
              ))}
            </div>
          </div>

          <div className="pd-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="pd-label" style={{ marginBottom: 0 }}>Kích thước</label>
              {product.sizeChartUrl && (
                <button 
                  type="button" 
                  className="size-guide-link" 
                  onClick={() => setShowSizeChart(true)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    fontSize: '0.8rem', 
                    fontWeight: 700, 
                    color: '#64748b',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 0',
                    borderBottom: '1px solid transparent',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#000'}
                  onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}
                >
                  <Ruler size={14} /> Hướng dẫn chọn size
                </button>
              )}
            </div>
            <div className="pd-sizes">
              {availableSizes.map(s => {
                const variant = product.variants.find(v => v.colorId === selectedColor?.id && v.size === s);
                const isOutOfStock = variant ? variant.stock <= 0 : true;
                return (
                  <button 
                    key={s} 
                    className={`pd-size-btn ${selectedSize === s ? 'active' : ''} ${isOutOfStock ? 'out-of-stock' : ''}`} 
                    onClick={() => !isOutOfStock && setSelectedSize(s)}
                    disabled={isOutOfStock}
                    title={isOutOfStock ? 'Size này đã hết hàng' : ''}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pd-section">
            <label className="pd-label">Số lượng</label>
            <div className="pd-qty">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16} /></button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}><Plus size={16} /></button>
            </div>
          </div>

          <div className="pd-actions">
            <button 
              className="pd-btn-buy" 
              onClick={() => handleAddToCart(true)}
              disabled={
                product.totalStock <= 0 || 
                (selectedSize && product.variants.find(v => v.colorId === selectedColor?.id && v.size === selectedSize)?.stock <= 0)
              }
              style={(product.totalStock <= 0 || (selectedSize && product.variants.find(v => v.colorId === selectedColor?.id && v.size === selectedSize)?.stock <= 0)) ? {opacity: 0.5, cursor: 'not-allowed'} : {}}
            >
              {product.totalStock <= 0 ? 'HẾT HÀNG' : (selectedSize && product.variants.find(v => v.colorId === selectedColor?.id && v.size === selectedSize)?.stock <= 0) ? 'SIZE NÀY HẾT HÀNG' : 'MUA NGAY'}
            </button>
            <button 
              className="pd-btn-cart" 
              onClick={() => handleAddToCart(false)}
              disabled={
                product.totalStock <= 0 || 
                (selectedSize && product.variants.find(v => v.colorId === selectedColor?.id && v.size === selectedSize)?.stock <= 0)
              }
              style={(product.totalStock <= 0 || (selectedSize && product.variants.find(v => v.colorId === selectedColor?.id && v.size === selectedSize)?.stock <= 0)) ? {opacity: 0.5, cursor: 'not-allowed'} : {}}
            >
              {product.totalStock <= 0 ? 'HẾT HÀNG' : (selectedSize && product.variants.find(v => v.colorId === selectedColor?.id && v.size === selectedSize)?.stock <= 0) ? 'HẾT SIZE' : 'THÊM VÀO GIỎ'}
            </button>
          </div>

          <div className="pd-extra">

            <button className="pd-share"><Share2 size={18} /> Chia sẻ</button>
          </div>

          <div className="pd-desc-section">
            <h3>Mô tả sản phẩm</h3>
            {product.description ? (
              <>
                <div className={`pd-desc-content ${isDescExpanded ? 'expanded' : ''}`} ref={descRef}>
                  <div className="pd-desc-html" dangerouslySetInnerHTML={{ __html: product.description }} />
                  {!isDescExpanded && showDescToggle && <div className="pd-desc-overlay"></div>}
                </div>
                {showDescToggle && (
                  <button 
                    className="btn-toggle-desc"
                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                  >
                    {isDescExpanded ? 'Thu gọn' : 'Xem thêm'}
                  </button>
                )}
              </>
            ) : (
              <p>Chưa có mô tả cho sản phẩm này.</p>
            )}
          </div>

          <div className="pd-reviews-section">
            <h3>Đánh giá ({reviews.length})</h3>
            
            <div className="reviews-list">
              {reviews.length > 0 ? (
                reviews.map(r => (
                  <div key={r.id} className="review-item">
                    <div className="review-header">
                      <div className="review-user">
                        {r.userAvatarUrl ? (
                          <img src={r.userAvatarUrl} alt={r.userName} className="review-avatar" />
                        ) : (
                          <div className="review-avatar-placeholder"><User size={20} /></div>
                        )}
                        <div className="review-meta">
                          <span className="review-username">
                            {r.userName}
                            {r.isVerifiedPurchase ? (
                              <span className="verified-purchase-badge">Đã mua hàng</span>
                            ) : (
                              <span className="unverified-purchase-badge">Chưa mua hàng</span>
                            )}
                            {r.userId === user?.id && !r.isFake && <span className="user-review-badge">Của bạn</span>}
                          </span>
                          {r.boughtVariant && <span className="review-bought-variant">{r.boughtVariant}</span>}
                          <span className="review-date">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</span>

                        </div>
                      </div>
                      <div className="review-meta-right">
                        <div className="review-rating">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star 
                              key={star} 
                              size={14} 
                              fill={star <= r.rating ? '#000' : 'none'} 
                              color={star <= r.rating ? '#000' : '#ddd'} 
                            />
                          ))}
                        </div>
                        {r.userId === user?.id && !r.isFake && (
                          <div className="review-actions">
                            <button 
                              className="btn-edit-review" 
                              onClick={() => {
                                setEditingReview(r);
                                setIsReviewModalOpen(true);
                              }}
                              title="Sửa đánh giá"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              className="btn-delete-review" 
                              onClick={() => handleDeleteReview(r.id)}
                              title="Xóa đánh giá"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}

                      </div>
                    </div>
                    <p className="review-comment">{r.comment}</p>
                  </div>
                ))
              ) : (
                <p className="no-reviews">Chưa có đánh giá nào cho sản phẩm này.</p>
              )}
            </div>

            {/* Review Form Removed - Reviews are now managed via Order History */}


          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="container pd-related">
          <h2 className="section-heading text-center">SẢN PHẨM LIÊN QUAN</h2>
          <div className="product-grid">
            {relatedProducts.map(p => (
              <div key={p.id} className="product-card">
                <Link to={`/product/${p.id}`} className="product-link-overlay">
                  <div className="product-img-wrapper">
                    <img src={p.mainImageUrl} alt={p.name} className="product-img" />

                  </div>
                  <div className="product-info" data-id={p.id}>
                    <h3 className="product-title">{p.name}</h3>
                    <p className="product-price">{formatPrice(p.price)}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Review Edit Modal */}
      <ReviewModal 
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setEditingReview(null);
        }}
        productId={product.id}
        productName={product.name}
        orderId={editingReview?.orderId}
        existingReview={editingReview}
        onSuccess={async () => {
          const updatedReviews = await reviewService.getProductReviews(productId);
          setReviews(updatedReviews);
        }}
      />

      {/* Size Chart Modal */}
      {showSizeChart && product.sizeChartUrl && (
        <div className="detail-modal-overlay" onClick={() => setShowSizeChart(false)} style={{ zIndex: 1000 }}>
          <div className="detail-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', background: 'white' }}>
            <div className="modal-header-pd" style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 900, fontSize: '1.2rem', margin: 0 }}>BẢNG QUY ĐỔI KÍCH CỠ</h3>
              <button onClick={() => setShowSizeChart(false)} className="action-btn">
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <img src={product.sizeChartUrl} alt="Size Chart" style={{ width: '100%', height: 'auto', borderRadius: '8px' }} />
              <p style={{ marginTop: '20px', fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                * Kích thước thực tế có thể chênh lệch 1-2cm tùy vào chất liệu vải.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
