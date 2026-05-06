import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="about-page">
      <div className="breadcrumb-bar">
        <div className="container">
          <nav className="breadcrumb">
            <Link to="/">Trang chủ</Link>
            <ChevronRight size={14} />
            <span className="breadcrumb-current">Giới thiệu</span>
          </nav>
        </div>
      </div>

      <div className="about-hero">
        <img src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=80&w=2000" alt="About Ghosttrick" />
        <div className="about-hero-overlay">
          <h1>VỀ GHOSTTRICK</h1>
        </div>
      </div>

      <div className="container about-content">
        <section className="about-section">
          <h2>Câu chuyện thương hiệu</h2>
          <p>Ghosttrick được thành lập với sứ mệnh mang đến những sản phẩm thời trang chất lượng cao, thiết kế hiện đại và phù hợp với phong cách sống năng động của giới trẻ Việt Nam. Chúng tôi tin rằng thời trang không chỉ là quần áo — đó là cách bạn thể hiện cá tính và câu chuyện của riêng mình.</p>
        </section>

        <section className="about-section">
          <h2>Tầm nhìn & Sứ mệnh</h2>
          <div className="about-grid">
            <div className="about-card">
              <h3>🎯 Tầm nhìn</h3>
              <p>Trở thành thương hiệu thời trang hàng đầu Việt Nam, được biết đến với thiết kế sáng tạo và chất lượng vượt trội.</p>
            </div>
            <div className="about-card">
              <h3>💡 Sứ mệnh</h3>
              <p>Mang đến trải nghiệm mua sắm thời trang tuyệt vời nhất, nơi mỗi sản phẩm đều được chăm chút từ thiết kế đến chất liệu.</p>
            </div>
            <div className="about-card">
              <h3>❤️ Giá trị cốt lõi</h3>
              <p>Chất lượng - Sáng tạo - Bền vững - Khách hàng là trọng tâm.</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>Con số ấn tượng</h2>
          <div className="about-stats">
            <div className="stat-item"><span className="stat-number">50K+</span><span className="stat-label">Khách hàng</span></div>
            <div className="stat-item"><span className="stat-number">500+</span><span className="stat-label">Sản phẩm</span></div>
            <div className="stat-item"><span className="stat-number">10+</span><span className="stat-label">Cửa hàng</span></div>
            <div className="stat-item"><span className="stat-number">4.8★</span><span className="stat-label">Đánh giá</span></div>
          </div>
        </section>
      </div>
    </div>
  )
}
