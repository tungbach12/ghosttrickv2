import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Heart, ChevronRight, Minus, Plus, Share2 } from 'lucide-react'
import { productService } from '../services/productService'
import { useGlobalContext } from '../context/GlobalContext'
import { useToast } from '../context/ToastContext'

export default function ProductDetailPage() {
  const { addToCart } = useGlobalContext();
  const { addToast } = useToast();
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState([]);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const data = await productService.getProductById(productId);
        setProduct(data);
        if (data.colors && data.colors.length > 0) {
          setSelectedColor(data.colors[0]);
        }
        
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
  }, [productId]);

  const availableSizes = product?.variants
    ? [...new Set(product.variants.filter(v => v.color === selectedColor).map(v => v.size))]
    : [];

  const handleAddToCart = () => {
    if (!selectedSize) {
      addToast('Vui lòng chọn kích thước!', 'warning');
      return;
    }
    
    const variant = product.variants.find(v => v.color === selectedColor && v.size === selectedSize);
    
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
      color: selectedColor,
      quantity: quantity
    });
    
    addToast('Đã thêm sản phẩm vào giỏ hàng!', 'success');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  if (loading) {
    return (
      <div className="container" style={{padding: '80px 0', textAlign: 'center'}}>
        <h2>Đang tải sản phẩm...</h2>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{padding: '80px 0', textAlign: 'center'}}>
        <h2>Sản phẩm không tồn tại</h2>
        <Link to="/product" className="btn-outline" style={{marginTop: '20px', display: 'inline-block'}}>Quay lại</Link>
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
            <img src={product.mainImageUrl} alt={product.name} />
            {product.isOnSale && <span className="product-badge sale">SALE</span>}
          </div>
          <div className="pd-thumbs">
            {product.images.map((img, i) => (
              <div key={i} className="pd-thumb">
                <img src={img} alt={`Thumb ${i}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="pd-info">
          <h1 className="pd-title">{product.name}</h1>
          <p className="pd-sku">Mã SP: {product.sku}</p>
          
          <div className="pd-price-row">
            <span className="pd-price">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="pd-original-price">{formatPrice(product.originalPrice)}</span>
            )}
          </div>

          <div className="pd-section">
            <label className="pd-label">Màu sắc</label>
            <div className="pd-colors">
              {product.colors.map((c, i) => (
                <button 
                  key={i} 
                  className={`pd-color-btn ${selectedColor === c ? 'active' : ''}`} 
                  onClick={() => {
                    setSelectedColor(c);
                    setSelectedSize(null);
                  }}
                >
                  <span style={{ background: c, border: c === '#ffffff' ? '1px solid #ddd' : 'none' }}></span>
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
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16}/></button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}><Plus size={16}/></button>
            </div>
          </div>

          <div className="pd-actions">
            <button className="pd-btn-buy" onClick={handleAddToCart}>MUA NGAY</button>
            <button className="pd-btn-cart" onClick={handleAddToCart}>THÊM VÀO GIỎ</button>
          </div>

          <div className="pd-extra">
            <button className="pd-wish"><Heart size={18}/> Thêm vào yêu thích</button>
            <button className="pd-share"><Share2 size={18}/> Chia sẻ</button>
          </div>

          <div className="pd-desc-section">
            <h3>Mô tả sản phẩm</h3>
            <p>{product.description || 'Chưa có mô tả cho sản phẩm này.'}</p>
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
                    <button className="wishlist-btn" onClick={e => e.preventDefault()}><Heart size={20}/></button>
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
    </div>
  );
}
