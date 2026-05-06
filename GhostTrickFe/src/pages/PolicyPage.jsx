import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { policies } from '../data'

export default function PolicyPage() {
  const { slug } = useParams();
  const policy = policies.find(p => p.slug === slug);

  if (!policy) {
    return (
      <div className="container" style={{padding: '80px 0', textAlign: 'center'}}>
        <h2>Trang không tồn tại</h2>
        <Link to="/" className="btn-outline" style={{marginTop: '20px', display: 'inline-block'}}>Về trang chủ</Link>
      </div>
    );
  }

  return (
    <div className="policy-page">
      <div className="breadcrumb-bar">
        <div className="container">
          <nav className="breadcrumb">
            <Link to="/">Trang chủ</Link>
            <ChevronRight size={14} />
            <span className="breadcrumb-current">{policy.title}</span>
          </nav>
        </div>
      </div>

      <div className="container policy-content">
        <h1 className="page-heading">{policy.title}</h1>
        <div className="policy-body">
          <p>{policy.content}</p>
        </div>

        <div className="policy-nav">
          <h3>Các chính sách khác</h3>
          <ul>
            {policies.filter(p => p.slug !== slug).map(p => (
              <li key={p.slug}><Link to={`/policy/${p.slug}`}>{p.title}</Link></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
