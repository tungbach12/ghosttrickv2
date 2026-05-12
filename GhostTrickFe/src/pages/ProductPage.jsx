import React, { useState, useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Heart, ChevronDown, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { getCategories } from '../services/categoryService'
import { productService } from '../services/productService'
import ColorTag from '../components/common/ColorTag'

export default function ProductPage() {
  const { categorySlug } = useParams();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q');
  const initialSort = searchParams.get('sort') || 'default';
  const onSale = searchParams.get('onSale') === 'true';
  
  const [sortBy, setSortBy] = useState(initialSort);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 12;

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = {
          category: categorySlug,
          sort: sortBy,
          onSale: onSale || undefined,
          q: searchQuery || undefined,
          page: currentPage,
          pageSize: pageSize
        };
        const data = await productService.getProducts(params);
        setProducts(data.items);
        setTotalCount(data.totalCount);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [categorySlug, sortBy, onSale, searchQuery, currentPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [categorySlug, sortBy, onSale, searchQuery]);

  const currentCategory = categorySlug 
    ? categories.find(c => c.slug === categorySlug) 
    : null;

  let categoryName = currentCategory ? currentCategory.name : 'TẤT CẢ SẢN PHẨM';
  if (onSale) {
    categoryName = currentCategory ? `${currentCategory.name} SALE` : 'SẢN PHẨM ĐANG GIẢM GIÁ';
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
    { value: 'best-sellers', label: 'Bán chạy nhất' },
  ];

  return (
    <div className="product-page">
      {/* Breadcrumb */}
      <div className="breadcrumb-bar">
        <div className="container">
          <nav className="breadcrumb">
            <Link to="/">Trang chủ</Link>
            <ChevronRight size={14} />
            {searchQuery ? (
              <>
                <Link to="/product">Sản phẩm</Link>
                <ChevronRight size={14} />
                <span className="breadcrumb-current">Tìm kiếm: "{searchQuery}"</span>
              </>
            ) : onSale ? (
              <>
                <Link to="/product">Sản phẩm</Link>
                <ChevronRight size={14} />
                {currentCategory ? (
                  <>
                    <Link to="/product?onSale=true">Sale</Link>
                    <ChevronRight size={14} />
                    <span className="breadcrumb-current">{currentCategory.name} Sale</span>
                  </>
                ) : (
                  <span className="breadcrumb-current">Sale</span>
                )}
              </>
            ) : currentCategory ? (
              <>
                <Link to="/product">Sản phẩm</Link>
                <ChevronRight size={14} />
                <span className="breadcrumb-current">{currentCategory.name}</span>
              </>
            ) : (
              <span className="breadcrumb-current">Sản phẩm</span>
            )}
          </nav>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs-bar">
        <div className="container">
          <div className="category-tabs">
            <Link
              to="/product"
              className={`category-tab ${!categorySlug ? 'active' : ''}`}
            >
              TẤT CẢ
            </Link>
            {categories.map(cat => (
              <Link
                key={cat.slug}
                to={`/product/category/${cat.slug}`}
                className={`category-tab ${categorySlug === cat.slug ? 'active' : ''}`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </div>


      {/* Product Grid Area */}
      <div className="container product-listing-area">
        {/* Top toolbar */}
        <div className="listing-toolbar">
          <p className="listing-count">
            {products.length} sản phẩm
          </p>
          <div className="listing-sort">
            <SlidersHorizontal size={16} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {!loading ? (
          products.length > 0 ? (
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
                      {p.totalStock <= 0 ? (
                        <span className="product-badge soldout" style={{background: '#6b7280'}}>HẾT HÀNG</span>
                      ) : p.isOnSale && p.originalPrice > p.price && (
                        <span className="product-badge sale">SALE</span>
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
          ) : (
            <div className="empty-state">
              <p>Không tìm thấy sản phẩm nào trong danh mục này.</p>
            </div>
          )
        ) : (
          <div className="loading-state">
            <p>Đang tải sản phẩm...</p>
          </div>
        )}

        {/* Pagination UI */}
        {!loading && totalCount > pageSize && (
          <div className="pagination">
            <button 
              className="pagination-btn" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              Trang trước
            </button>
            <div className="pagination-numbers">
              {Array.from({ length: Math.ceil(totalCount / pageSize) }, (_, i) => i + 1).map(num => (
                <button 
                  key={num}
                  className={`page-number ${currentPage === num ? 'active' : ''}`}
                  onClick={() => setCurrentPage(num)}
                >
                  {num}
                </button>
              ))}
            </div>
            <button 
              className="pagination-btn" 
              disabled={currentPage === Math.ceil(totalCount / pageSize)}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Trang sau
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
