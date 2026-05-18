import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Flame, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="about-page-premium">
      {/* Breadcrumb Section */}
      <div className="about-breadcrumb-bar">
        <div className="container">
          <nav className="about-breadcrumb">
            <Link to="/">Trang chủ</Link>
            <ChevronRight size={14} className="breadcrumb-separator" />
            <span className="breadcrumb-current">About Us</span>
          </nav>
        </div>
      </div>

      {/* Hero Header Section */}
      <div className="container about-hero-container">
        <div className="about-hero-street">
          <div className="about-hero-bg">
            <img src="/images/about-brand-identity.png" alt="Ghosttrick Brand Aesthetics" className="about-hero-img-full" />
          </div>
        </div>
      </div>

      {/* Main Brand Statement / Manifesto Cards */}
      <section className="about-manifesto-section">
        <div className="container">
          <div className="manifesto-grid">
            {/* Card 1: Nhận Diện Ghost */}
            <div className="manifesto-card identity-card">
              <div className="card-glare"></div>
              <div className="card-icon-wrapper">
                <span className="ghost-icon-emoji">👻</span>
              </div>
              <div className="card-body">
                <span className="card-tag">THE ICON</span>
                <h3 className="card-title">About Us</h3>
                <p className="card-text">
                  <strong>GHOSTTRICK</strong> là thương hiệu thời trang lấy biểu tượng <strong>Ghost 👻</strong> làm nhận diện thương hiệu - đại diện cho tinh thần tự do, bí ẩn và khác biệt.
                </p>
              </div>
              <div className="card-glow-bg green-glow"></div>
            </div>

            {/* Card 2: Đối Tượng & Hiphop */}
            <div className="manifesto-card audience-card">
              <div className="card-glare"></div>
              <div className="card-icon-wrapper">
                <Flame className="lucide-icon text-neon-orange" size={32} />
              </div>
              <div className="card-body">
                <span className="card-tag">THE MOVEMENT</span>
                <h3 className="card-title">Chúng mình là ai?</h3>
                <p className="card-text">
                  Chúng mình sinh ra dành cho những người yêu mến <strong>streetwear</strong>, <strong>hiphop</strong> và đơn giản là thích mặc đẹp theo cách riêng của mình.
                </p>
              </div>
              <div className="card-glow-bg orange-glow"></div>
            </div>

            {/* Card 3: Chất Lượng & Vibes */}
            <div className="manifesto-card quality-card">
              <div className="card-glare"></div>
              <div className="card-icon-wrapper">
                <Sparkles className="lucide-icon text-neon-purple" size={32} />
              </div>
              <div className="card-body">
                <span className="card-tag">THE CREED</span>
                <h3 className="card-title">Bản sắc & Khác biệt</h3>
                <p className="card-text">
                  Thay vì chạy theo thị trường, <strong>GHOSTTRICK</strong> luôn cố gắng cho ra đời những sản phẩm chất lượng nhất, thiết kế độc đáo, mang <strong>Vibes riêng</strong> của thương hiệu!
                </p>
              </div>
              <div className="card-glow-bg purple-glow"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Detail Showcase Section */}
      <section className="about-details-section">
        <div className="container">
          <div className="details-layout">
            <div className="details-visual">
              <div className="visual-graphic-box">
                <div className="graphic-grid"></div>
                <div className="brand-logo-outline">GHOSTTRICK</div>
                <div className="visual-badge">EST. 2024</div>
                <div className="visual-floating-emoji">👻</div>
              </div>
            </div>
            <div className="details-info">
              <span className="section-subtitle">TẠI SAO LÀ GHOSTTRICK?</span>
              <h2 className="section-title">ĐIỀU LÀM NÊN SỰ KHÁC BIỆT</h2>

              <div className="feature-list">
                <div className="feature-item">
                  <div className="feature-num">01</div>
                  <div className="feature-content">
                    <h4>Thiết Kế Độc Bản</h4>
                    <p>Từng họa tiết, từng thông điệp trên sản phẩm đều được lấy cảm hứng từ nhịp sống đường phố tự do và sáng tạo không giới hạn.</p>
                  </div>
                </div>

                <div className="feature-item">
                  <div className="feature-num">02</div>
                  <div className="feature-content">
                    <h4>Chất Liệu Chuẩn Streetwear</h4>
                    <p>Cam kết sử dụng chất liệu cao cấp nhất, độ dày dặn hoàn hảo, phom dáng tôn dáng, cùng kỹ thuật in/thêu đạt tiêu chuẩn khắt khe nhất.</p>
                  </div>
                </div>

                <div className="feature-item">
                  <div className="feature-num">03</div>
                  <div className="feature-content">
                    <h4>Vibes Riêng Biệt</h4>
                    <p>Không pha tạp, không sao chép. Mỗi bộ sưu tập của Ghosttrick đều mang một câu chuyện và vibe bí ẩn đặc trưng.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-cta-section container">
        <div className="about-cta-wrapper">
          <Link to="/product" className="btn-cta-premium-street">
            MUA SẮM NGAY <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </div>
  )
}
