import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight, ShieldCheck, HelpCircle, FileText, Sparkles } from 'lucide-react'
import { policies } from '../data'

export default function PolicyPage() {
  const { slug } = useParams();
  const policy = policies.find(p => p.slug === slug);

  if (!policy) {
    return (
      <div className="container" style={{padding: '100px 0', textAlign: 'center', backgroundColor: '#f8fafc', color: '#0f172a', minHeight: '60vh'}}>
        <h2 style={{fontSize: '2rem', fontWeight: 900}}>TRANG KHÔNG TỒN TẠI</h2>
        <Link to="/" className="btn-outline" style={{marginTop: '30px', display: 'inline-block'}}>Về trang chủ</Link>
      </div>
    );
  }

  // Robust line-by-line content parser to prevent block style merging and tag clashes
  const renderPolicyContent = (content) => {
    if (!content) return null;
    
    const lines = content.split('\n');
    const elements = [];
    let currentList = [];
    
    // Helper to flush current list items into a styled list element
    const flushList = (key) => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${key}`} className="policy-list">
            {currentList.map((item, idx) => (
              <li key={idx} className="policy-list-item">
                <span className="list-ghost-bullet">👻</span>
                <span className="list-item-text">{item}</span>
              </li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) {
        // Empty line: flush list to maintain standard spacing
        flushList(index);
        return;
      }

      // Check if the line is a bullet point (starts with •, -, or *)
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const itemText = trimmed.replace(/^[-•*]\s*/, '').trim();
        if (itemText) {
          currentList.push(itemText);
        }
        return;
      }

      // If it's a heading or paragraph, flush the active list first
      flushList(index);

      // Check if the line is a section/subsection heading (e.g., "1.", "2a.", "2b.")
      if (/^\d+[a-z]?\.\s+/i.test(trimmed)) {
        elements.push(
          <h2 key={index} className="policy-section-heading">
            <span className="heading-decor"></span>
            {trimmed}
          </h2>
        );
      } else {
        // Standard paragraph
        elements.push(
          <p key={index} className="policy-paragraph">
            {trimmed}
          </p>
        );
      }
    });

    // Flush any remaining list items at the end
    flushList('end');

    return elements;
  };

  // Icon selector based on policy slug for high-end look
  const getPolicyIcon = (policySlug) => {
    switch (policySlug) {
      case 'bao-mat':
        return <ShieldCheck size={28} className="policy-header-icon" />;
      case 'doi-tra':
        return <Sparkles size={28} className="policy-header-icon" />;
      default:
        return <FileText size={28} className="policy-header-icon" />;
    }
  };

  return (
    <div className="policy-page-premium">
      {/* Breadcrumbs */}
      <div className="policy-breadcrumb-bar">
        <div className="container">
          <nav className="policy-breadcrumb">
            <Link to="/">Trang chủ</Link>
            <ChevronRight size={14} className="breadcrumb-separator" />
            <span className="breadcrumb-current">{policy.title}</span>
          </nav>
        </div>
      </div>

      <div className="container policy-layout-container">
        <div className="policy-grid-layout">
          {/* Main policy body */}
          <main className="policy-main-content">
            <div className="policy-header-box">
              {getPolicyIcon(policy.slug)}
              <h1 className="policy-main-title">{policy.title}</h1>
            </div>
            
            <div className="policy-body-styled">
              {renderPolicyContent(policy.content)}
            </div>
          </main>

          {/* Sidebar menu */}
          <aside className="policy-sidebar">
            <div className="sidebar-card-glass">
              <div className="sidebar-header">
                <HelpCircle size={18} className="sidebar-icon" />
                <h3>TRUNG TÂM HỖ TRỢ</h3>
              </div>
              <nav className="sidebar-nav">
                <ul>
                  {policies.map(p => (
                    <li key={p.slug}>
                      <Link 
                        to={`/policy/${p.slug}`} 
                        className={`sidebar-nav-link ${p.slug === slug ? 'active-link' : ''}`}
                      >
                        <span className="link-dot"></span>
                        <span className="link-text">{p.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="sidebar-footer">
                <p>Cần hỗ trợ thêm?</p>
                <a href="mailto:support@ghosttrick.vn" className="sidebar-contact-btn">
                  LIÊN HỆ CHÚNG MÌNH
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
