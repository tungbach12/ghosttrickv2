import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, X, ChevronRight, Tag } from 'lucide-react'
import { useGlobalContext } from '../context/GlobalContext'

export default function CartPage() {
  const { cartItems, updateCartQty, removeFromCart } = useGlobalContext();
  const navigate = useNavigate();

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
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
            <div className="cart-items">
              {cartItems.map((item, idx) => (
                <div key={idx} className="cart-item">
                  <Link to={`/product/${item.productId}`} className="cart-item-img">
                    <img src={item.mainImageUrl} alt={item.name} />
                  </Link>
                  <div className="cart-item-info">
                    <Link to={`/product/${item.productId}`} className="cart-item-title">{item.name}</Link>
                    <p className="cart-item-variant">Size: {item.size} | Màu: {item.color}</p>
                    <p className="cart-item-price">{formatPrice(item.price)}</p>
                    <div className="cart-item-qty">
                      <button onClick={() => updateCartQty(idx, -1)}><Minus size={14}/></button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateCartQty(idx, 1)}><Plus size={14}/></button>
                    </div>
                  </div>
                  <button className="cart-item-remove" onClick={() => removeFromCart(idx)}><X size={18}/></button>
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
