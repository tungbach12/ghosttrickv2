import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/authService';

const GlobalContext = createContext();

export const useGlobalContext = () => useContext(GlobalContext);

export const GlobalProvider = ({ children }) => {
  // Try to load state from localStorage first
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

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('ghosttrick_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('ghosttrick_cart', JSON.stringify(cartItems));
  }, [cartItems]);

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
  };

  // Cart Functions
  const addToCart = (productInfo) => {
    setCartItems(prev => {
      // productInfo: { variantId, productId, name, price, mainImageUrl, size, color, quantity }
      const existingIndex = prev.findIndex(item => 
        item.variantId === productInfo.variantId
      );

      if (existingIndex >= 0) {
        // Increase qty
        const newCart = [...prev];
        newCart[existingIndex].quantity += productInfo.quantity;
        return newCart;
      } else {
        // Add new
        return [...prev, productInfo];
      }
    });
    // Open the cart drawer automatically
    setIsCartOpen(true);
  };

  const updateCartQty = (index, delta) => {
    setCartItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const removeFromCart = (index) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };
  
  const clearCart = () => {
    setCartItems([]);
  };

  const updateUser = (updatedInfo) => {
    setUser(prev => ({ ...prev, ...updatedInfo }));
  };


  return (
    <GlobalContext.Provider value={{
      user, login, logout, updateUser,
      cartItems, addToCart, updateCartQty, removeFromCart, clearCart,
      isCartOpen, setIsCartOpen
    }}>
      {children}
    </GlobalContext.Provider>
  );
};
