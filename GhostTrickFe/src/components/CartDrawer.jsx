import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Trash2, ShoppingBag } from 'lucide-react';
import { useGlobalContext } from '../context/GlobalContext';
import ColorTag from './common/ColorTag';

export default function CartDrawer() {
  const { cartItems, isCartOpen, setIsCartOpen, removeFromCart, updateCartQty } = useGlobalContext();
  const navigate = useNavigate();

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`cart-drawer-overlay ${isCartOpen ? 'active' : ''}`} 
        onClick={() => setIsCartOpen(false)}
      ></div>

      {/* Drawer */}
      <div className={`cart-drawer ${isCartOpen ? 'active' : ''}`}>
        <div className="drawer-header">
          <h3>GIỎ HÀNG ({cartItems.length})</h3>
          <button className="icon-btn" onClick={() => setIsCartOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="drawer-content">
          {cartItems.length === 0 ? (
            <div className="empty-cart-drawer">
              <ShoppingBag size={48} color="#cbd5e1" />
              <p>Giỏ hàng của bạn đang trống</p>
              <button 
                className="btn-solid" 
                onClick={() => setIsCartOpen(false)}
                style={{ marginTop: '20px' }}
              >
                MUA SẮM NGAY
              </button>
            </div>
          ) : (
            <div className="cart-drawer-items">
              {cartItems.map((item, idx) => (
                <div key={idx} className="cart-drawer-item">
                  <div className="item-img">
                    <img src={item.mainImageUrl} alt={item.name} />
                  </div>
                  <div className="item-info">
                    <h4 className="item-name">{item.name}</h4>
                    <div className="item-meta">
                      <ColorTag name={typeof item.color === 'object' ? item.color.name : item.color} hex={item.colorHex} size="sm" />
                      <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                      <span>Size: {item.size}</span>
                    </div>
                    <div className="item-qty-price">
                      <div className="qty-controls">
                        <button onClick={() => updateCartQty(idx, -1)}>-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateCartQty(idx, 1)}>+</button>
                      </div>
                      <span className="item-price">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  </div>
                  <button className="remove-btn" onClick={() => removeFromCart(idx)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="drawer-footer">
            <div className="drawer-total">
              <span>TỔNG CỘNG:</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="drawer-actions">
              <Link 
                to="/cart" 
                className="btn-outline" 
                onClick={() => setIsCartOpen(false)}
                style={{ flex: 1, textAlign: 'center' }}
              >
                XEM GIỎ HÀNG
              </Link>
              <button 
                className="btn-solid" 
                style={{ flex: 1 }}
                onClick={handleCheckout}
              >
                THANH TOÁN
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
