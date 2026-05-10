import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Heart, ChevronRight, Minus, Plus, Share2, AlertCircle, Star, User, Trash2, Edit2 } from 'lucide-react'
import { productService } from '../services/productService'
import reviewService from '../services/reviewService'
import ReviewModal from '../components/ReviewModal'

import { useGlobalContext } from '../context/GlobalContext'
import { useToast } from '../context/ToastContext'

export default function ProductDetailPage() {
  const { addToCart, user } = useGlobalContext();
  const { addToast } = useToast();
  const { productId } = useParams();
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



  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const [data, reviewsData] = await Promise.all([
          productService.getProductById(productId),
          reviewService.getProductReviews(productId)
        ]);
        setProduct(data);
        setReviews(reviewsData);
        
        if (data.colors && data.colors.length > 0) {
          setSelectedColor(data.colors[0]);
        }
        setActiveImage(data.mainImageUrl);

        // Fetch related products (same category)
        if (data.categorySlug) {
          const related = await productService.getProducts({ category: data.categorySlug, pageSize: 5 });
          setRelatedProducts(related.items.filter(p => p.id !== parseInt(productId)).slice(0, 4));
        }
      } catch (error) {
        console.error('Error fetching product details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, user?.id]);

  const availableSizes = product?.variants
    ? [...new Set(product.variants.filter(v => v.colorId === selectedColor?.id).map(v => v.size))]
    : [];

  const handleAddToCart = () => {
    if (!selectedSize) {
      addToast('Vui lòng chọn kích thước!', 'warning');
      return;
    }

    const variant = product.variants.find(v => v.colorId === selectedColor?.id && v.size === selectedSize);

    if (!variant || variant.stock < quantity) {
      addToast('Sản phẩm đã hết hàng hoặc không đủ số lượng!', 'error');
      return;
    }

    addToCart({
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
    });
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

  if (!product) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <h2>Sản phẩm không tồn tại</h2>
        <Link to="/product" className="btn-outline" style={{ marginTop: '20px', display: 'inline-block' }}>Quay lại</Link>
      </div>
    );
  }

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
            {product.isOnSale && product.originalPrice > product.price && <span className="product-badge sale">SALE</span>}
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
                 -{Math.round((1 - product.price / product.originalPrice) * 100)}%
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
            <label className="pd-label">Kích thước</label>
            <div className="pd-sizes">
              {availableSizes.map(s => (
                <button key={s} className={`pd-size-btn ${selectedSize === s ? 'active' : ''}`} onClick={() => setSelectedSize(s)}>{s}</button>
              ))}
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
            <button className="pd-btn-buy" onClick={handleAddToCart}>MUA NGAY</button>
            <button className="pd-btn-cart" onClick={handleAddToCart}>THÊM VÀO GIỎ</button>
          </div>

          <div className="pd-extra">
            <button className="pd-wish"><Heart size={18} /> Thêm vào yêu thích</button>
            <button className="pd-share"><Share2 size={18} /> Chia sẻ</button>
          </div>

          <div className="pd-desc-section">
            <h3>Mô tả sản phẩm</h3>
            <p>{product.description || 'Chưa có mô tả cho sản phẩm này.'}</p>
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
                    <button className="wishlist-btn" onClick={e => e.preventDefault()}><Heart size={20} /></button>
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
    </div>

  );
}
