import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/authService';
import { useToast } from './ToastContext';

const GlobalContext = createContext();

export const useGlobalContext = () => useContext(GlobalContext);

export const GlobalProvider = ({ children }) => {
  const { addToast } = useToast();

  // Helpers
  const loadState = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };

  const [user, setUser] = useState(loadState('ghosttrick_user', null));
  const [cartItems, setCartItems] = useState(loadState('ghosttrick_cart', []));
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Persistence for user
  useEffect(() => {
    localStorage.setItem('ghosttrick_user', JSON.stringify(user));
  }, [user]);

  // Sync Cart Logic
  useEffect(() => {
    const fetchAndSyncCart = async () => {
      if (user) {
        try {
          const localCart = loadState('ghosttrick_cart', []);
          if (localCart.length > 0) {
            await authService.syncCartToServer(localCart.map(item => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity
            })));
            localStorage.removeItem('ghosttrick_cart');
          }

          const serverCart = await authService.getCart();
          setCartItems(serverCart);
        } catch (error) {
          console.error('Error syncing cart:', error);
        }
      } else {
        localStorage.setItem('ghosttrick_cart', JSON.stringify(cartItems));
      }
    };

    fetchAndSyncCart();
  }, [user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('ghosttrick_cart', JSON.stringify(cartItems));
    }
  }, [cartItems, user]);

  // Auth Functions
  const login = async (identifier, password) => {
    try {
      const data = await authService.login(identifier, password);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Sai thông tin đăng nhập' 
      };
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setCartItems([]);
  };

  // Cart Functions
  const addToCart = async (productInfo, skipDrawer = false) => {
    // productInfo: { variantId, productId, name, price, mainImageUrl, size, color, quantity, stock }
    let success = false;
    if (user) {
      try {
        await authService.addToServerCart(productInfo.productId, productInfo.variantId, productInfo.quantity);
        const freshCart = await authService.getCart();
        setCartItems(freshCart);
        addToast('Đã thêm vào giỏ hàng', 'success');
        success = true;
      } catch (error) {
        const msg = error.response?.data?.message || 'Không thể thêm vào giỏ hàng';
        addToast(msg, 'error');
        success = false;
      }
    } else {
      // Guest Logic
      let errorOccurred = false;
      setCartItems(prev => {
        const existingIndex = prev.findIndex(item => item.variantId === productInfo.variantId);
        const currentQty = existingIndex >= 0 ? prev[existingIndex].quantity : 0;
        const newTotal = currentQty + productInfo.quantity;

        if (productInfo.stock !== undefined && newTotal > productInfo.stock) {
          addToast(`Chỉ còn ${productInfo.stock} sản phẩm trong kho`, 'error');
          errorOccurred = true;
          return prev;
        }

        if (existingIndex >= 0) {
          const newCart = [...prev];
          newCart[existingIndex].quantity = newTotal;
          return newCart;
        } else {
          return [...prev, productInfo];
        }
      });
      if (!errorOccurred) {
        addToast('Đã thêm vào giỏ hàng', 'success');
        success = true;
      } else {
        success = false;
      }
    }
    
    if (success && !skipDrawer) {
      setIsCartOpen(true);
    }
    return success;
  };

  const updateCartQty = async (index, delta) => {
    const item = cartItems[index];
    if (!item) return;

    if (user) {
      try {
        // We use the same AddToCart API to increment/decrement by passing delta
        await authService.addToServerCart(item.productId, item.variantId, delta);
        const freshCart = await authService.getCart();
        setCartItems(freshCart);
      } catch (error) {
        const msg = error.response?.data?.message || 'Không thể cập nhật số lượng';
        addToast(msg, 'error');
      }
    } else {
      // Guest Logic
      setCartItems(prev => prev.map((it, i) => {
        if (i === index) {
          const newQty = it.quantity + delta;
          if (newQty < 1) return it;
          if (it.stock !== undefined && newQty > it.stock) {
            addToast(`Chỉ còn ${it.stock} sản phẩm trong kho`, 'error');
            return it;
          }
          return { ...it, quantity: newQty };
        }
        return it;
      }));
    }
  };

  const removeFromCart = async (index) => {
    const item = cartItems[index];
    if (!item) return;

    if (user) {
      try {
        await authService.removeFromServerCart(item.variantId);
        const freshCart = await authService.getCart();
        setCartItems(freshCart);
        addToast('Đã xóa khỏi giỏ hàng', 'info');
      } catch (error) {
        addToast('Không thể xóa sản phẩm', 'error');
      }
    } else {
      setCartItems(prev => prev.filter((_, i) => i !== index));
      addToast('Đã xóa khỏi giỏ hàng', 'info');
    }
  };
  
  const clearCart = async () => {
    setCartItems([]);
  };

  const updateUser = (updatedInfo) => {
    setUser(prev => ({ ...prev, ...updatedInfo }));
  };

  return (
    <GlobalContext.Provider value={{
      user, setUser, login, logout, updateUser,
      cartItems, addToCart, updateCartQty, removeFromCart, clearCart,
      isCartOpen, setIsCartOpen
    }}>
      {children}
    </GlobalContext.Provider>
  );
};
