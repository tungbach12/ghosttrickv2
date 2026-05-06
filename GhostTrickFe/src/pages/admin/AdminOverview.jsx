import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Package, Users, ShoppingCart, DollarSign, ArrowUpRight, TrendingUp } from 'lucide-react';

const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/admin/stats');
        setStats(response.data);
      } catch (err) {
        setError('Không thể tải dữ liệu thống kê');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', height: '200px', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loader"></div>
    </div>
  );
  
  if (error) return (
    <div style={{ padding: '16px', background: '#fee2e2', color: '#991b1b', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
      <ArrowUpRight size={18} style={{ transform: 'rotate(45deg)', marginRight: '8px' }} /> {error}
    </div>
  );

  const statCards = [
    { 
      name: 'Tổng doanh thu', 
      value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.totalRevenue), 
      icon: DollarSign, 
      color: 'linear-gradient(135deg, #10b981, #059669)',
      trend: '+12.5%'
    },
    { 
      name: 'Đơn hàng mới', 
      value: stats.totalOrders, 
      icon: ShoppingCart, 
      color: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      trend: '+5.2%'
    },
    { 
      name: 'Sản phẩm', 
      value: stats.totalProducts, 
      icon: Package, 
      color: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      trend: 'Ổn định'
    },
    { 
      name: 'Khách hàng', 
      value: stats.totalCustomers, 
      icon: Users, 
      color: 'linear-gradient(135deg, #f59e0b, #d97706)',
      trend: '+8.1%'
    },
    { 
      name: 'Hết hàng/Sắp hết', 
      value: stats.lowStockCount, 
      icon: TrendingUp, 
      color: 'linear-gradient(135deg, #ef4444, #b91c1c)',
      trend: 'Cần chú ý'
    },
  ];

  return (
    <div className="admin-overview">
      <div className="admin-page-header">
        <h2>Dashboard Overview</h2>
        <p>Welcome back! Here's a quick look at your business performance.</p>
      </div>
      
      <div className="admin-stats-grid">
        {statCards.map((item) => (
          <div key={item.name} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stat-icon-box" style={{ background: item.color }}>
                <item.icon size={24} />
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#10b981', background: '#ecfdf5', padding: '4px 8px', borderRadius: '20px' }}>
                {item.trend}
              </div>
            </div>
            <div>
              <p className="stat-label">{item.name}</p>
              <h3 className="stat-value">{item.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-grid-2-1">
        <div className="stat-card" style={{ height: '350px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '20px' }}>Revenue Insights</h3>
          <div style={{ flex: 1, background: '#f8fafc', borderRadius: '8px', border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            Analytics Chart Placeholder
          </div>
        </div>
        
        <div className="stat-card">
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '20px' }}>Order Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats.orderStats && stats.orderStats.map((s) => (
              <div key={s.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{s.status}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>{s.count}</span>
              </div>
            ))}
          </div>
          <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #f1f5f9' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '20px' }}>Recent Sales</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingCart size={18} color="#64748b" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>Order #GT-{1024 + i}</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Success • 1,200,000đ</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
