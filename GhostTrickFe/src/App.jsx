import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ProductPage from './pages/ProductPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import AboutPage from './pages/AboutPage'
import PolicyPage from './pages/PolicyPage'
import AccountPage from './pages/AccountPage'
import SaleEventPage from './pages/SaleEventPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderDetailPage from './pages/OrderDetailPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'
import AdminOverview from './pages/admin/AdminOverview'
import AdminProducts from './pages/admin/AdminProducts'
import AdminOrders from './pages/admin/AdminOrders'
import AdminCategories from './pages/admin/AdminCategories'
import AdminVouchers from './pages/admin/AdminVouchers'
import AdminAddProduct from './pages/admin/AdminAddProduct'
import AdminSales from './pages/admin/AdminSales'
import AdminAddSale from './pages/admin/AdminAddSale'
import AdminHomeBanners from './pages/admin/AdminHomeBanners'
import AdminAddHomeBanner from './pages/admin/AdminAddHomeBanner'
import AdminColors from './pages/admin/AdminColors'
import AdminFeedbacks from './pages/admin/AdminFeedbacks'
import AdminReviews from './pages/admin/AdminReviews'
import AdminUsers from './pages/admin/AdminUsers'
import AdminTopBar from './pages/admin/AdminTopBar'
import AdminSettings from './pages/admin/AdminSettings'
import AdminSizeCharts from './pages/admin/AdminSizeCharts'
import ScrollToTop from './components/ScrollToTop'

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public / Customer Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="product" element={<ProductPage />} />
          <Route path="product/category/:categorySlug" element={<ProductPage />} />
          <Route path="product/:productId" element={<ProductDetailPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="sign-in" element={<SignInPage />} />
          <Route path="sign-up" element={<SignUpPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="policy/:slug" element={<PolicyPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="account/order/:id" element={<OrderDetailPage />} />
          <Route path="profile" element={<Navigate to="/account" replace />} />
          <Route path="sale" element={<SaleEventPage />} />
          <Route path="sale/:slug" element={<SaleEventPage />} />
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/add" element={<AdminAddProduct />} />
            <Route path="products/edit/:id" element={<AdminAddProduct />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="vouchers" element={<AdminVouchers />} />
            <Route path="colors" element={<AdminColors />} />
            <Route path="sales" element={<AdminSales />} />
            <Route path="sales/add" element={<AdminAddSale />} />
            <Route path="sales/edit/:id" element={<AdminAddSale />} />
            <Route path="home-banners" element={<AdminHomeBanners />} />
            <Route path="home-banners/add" element={<AdminAddHomeBanner />} />
            <Route path="home-banners/edit/:id" element={<AdminAddHomeBanner />} />
            <Route path="feedbacks" element={<AdminFeedbacks />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="top-bar" element={<AdminTopBar />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="size-charts" element={<AdminSizeCharts />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
