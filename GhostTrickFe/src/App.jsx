import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
import ProfilePage from './pages/ProfilePage'
import SaleEventPage from './pages/SaleEventPage'
import CheckoutPage from './pages/CheckoutPage'
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
          <Route path="about" element={<AboutPage />} />
          <Route path="policy/:slug" element={<PolicyPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="profile" element={<ProfilePage />} />
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
            <Route path="sales" element={<AdminSales />} />
            <Route path="sales/add" element={<AdminAddSale />} />
            <Route path="sales/edit/:id" element={<AdminAddSale />} />
            <Route path="home-banners" element={<AdminHomeBanners />} />
            <Route path="home-banners/add" element={<AdminAddHomeBanner />} />
            <Route path="home-banners/edit/:id" element={<AdminAddHomeBanner />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
