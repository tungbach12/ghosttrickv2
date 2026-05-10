import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, X, ChevronRight, Tag } from 'lucide-react'
import { useGlobalContext } from '../context/GlobalContext'
import ColorTag from '../components/common/ColorTag'

export default function CartPage() {
  const { cartItems, updateCartQty, removeFromCart } = useGlobalContext();
  const navigate = useNavigate();

  const calculateItemSubtotal = (item) => {
    return item.price * item.quantity;
  };

  const subtotal = cartItems.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
  const shipping = subtotal >= 500000 ? 0 : 30000;
  const total = subtotal + shipping;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="cart-page">
      <div className="breadcrumb-bar">
        <div className="container">
          <nav className="breadcrumb">
            <Link to="/">Trang chủ</Link>
            <ChevronRight size={14} />
            <span className="breadcrumb-current">Giỏ hàng</span>
          </nav>
        </div>
      </div>

      <div className="container cart-content">
        <h1 className="cart-heading">GIỎ HÀNG ({cartItems.length})</h1>

        {cartItems.length === 0 ? (
          <div className="empty-state">
            <p>Giỏ hàng của bạn đang trống</p>
            <Link to="/product" className="btn-solid" style={{display:'inline-block', marginTop:'20px'}}>Tiếp tục mua sắm</Link>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-items-grouped">
              {Object.values(cartItems.reduce((groups, item) => {
                if (!groups[item.productId]) groups[item.productId] = { ...item, variants: [], totalQty: 0, groupSubtotal: 0 };
                groups[item.productId].variants.push(item);
                groups[item.productId].totalQty += item.quantity;
                groups[item.productId].groupSubtotal += calculateItemSubtotal(item);
                return groups;
              }, {})).map((group, gIdx) => (
                <div key={group.productId} className="cart-product-group">
                  <div className="cart-group-header">
                    <div className="cart-group-img">
                      <img src={group.mainImageUrl} alt={group.name} />
                    </div>
                    <div className="cart-group-info">
                       <Link to={`/product/${group.productId}`} className="cart-item-title">{group.name}</Link>
                    </div>
                  </div>
                  
                  <div className="cart-group-variants">
                    {group.variants.map((item) => {
                       const itemIdx = cartItems.findIndex(ci => ci.variantId === item.variantId);
                       return (
                        <div key={item.variantId} className="variant-row">
                          <div className="variant-details">
                            <span className="v-label">Size: {item.size}</span>
                            <span className="v-sep">|</span>
                            <span className="v-label">Màu:</span>
                            <ColorTag name={typeof item.color === 'object' ? item.color.name : item.color} hex={item.colorHex} size="xs" />
                          </div>
                          
                          <div className="variant-actions">
                            <div className="cart-item-qty small">
                              <button onClick={() => updateCartQty(itemIdx, -1)}><Minus size={12}/></button>
                              <span>{item.quantity}</span>
                              <button onClick={() => updateCartQty(itemIdx, 1)}><Plus size={12}/></button>
                            </div>
                            <button className="variant-remove" onClick={() => removeFromCart(itemIdx)}><X size={14}/></button>
                          </div>
                        </div>
                       );
                    })}
                  </div>

                  <div className="cart-group-footer">
                    <div className="cart-group-pricing">
                      <div className="pricing-breakdown">
                        {group.salePrice ? (
                          <div className="price-row sale">
                            <span className="price-tag flash">FLASH SALE</span>
                            <span className="qty-x">{group.totalQty} x</span>
                            <span className="price-val">{formatPrice(group.salePrice)}</span>
                          </div>
                        ) : (
                          <div className="price-row regular">
                            <span className="price-tag">GIÁ GỐC</span>
                            <span className="qty-x">{group.totalQty} x</span>
                            <span className="price-val">{formatPrice(group.price)}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="group-total-row">
                        <span className="total-label">Tạm tính sản phẩm:</span>
                        <span className="total-value">{formatPrice(group.groupSubtotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <h3>Tóm tắt đơn hàng</h3>
              <div className="cart-totals">
                <div className="cart-total-row"><span>Tạm tính</span><span>{formatPrice(subtotal)}</span></div>
                <div className="cart-total-row"><span>Phí vận chuyển</span><span>{shipping === 0 ? 'Miễn phí' : formatPrice(shipping)}</span></div>
                <div className="cart-total-row total"><span>Tổng cộng</span><span>{formatPrice(total)}</span></div>
              </div>
              <button className="btn-checkout" onClick={() => navigate('/checkout')}>TIẾN HÀNH THANH TOÁN</button>
              <Link to="/product" className="cart-continue">← Tiếp tục mua sắm</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
