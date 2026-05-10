import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { 
  Package, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  AlertCircle,
  MoreVertical,
  Calendar,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Download,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import * as XLSX from 'xlsx';

const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRevenueMenu, setShowRevenueMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState({ 
    startDate: null, 
    endDate: null, 
    label: 'Tất cả thời gian' 
  });
  const menuRef = useRef(null);
  const datePickerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        console.log('Clicked outside revenue menu, closing...');
        setShowRevenueMenu(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchStats = async (start = dateRange.startDate, end = dateRange.endDate) => {
    try {
      setLoading(true);
      let url = '/admin/stats';
      const params = new URLSearchParams();
      if (start) params.append('startDate', start.toISOString());
      if (end) params.append('endDate', end.toISOString());
      
      const queryString = params.toString();
      const response = await api.get(queryString ? `${url}?${queryString}` : url);
      setStats(response.data);
    } catch (err) {
      setError('Không thể tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  };

  const handleRangeSelect = (label, days = null) => {
    let start = null;
    let end = new Date();
    
    if (days !== null) {
      start = new Date();
      start.setDate(end.getDate() - days);
      start.setHours(0, 0, 0, 0);
    }
    
    const newRange = { startDate: start, endDate: end, label };
    setDateRange(newRange);
    setShowDatePicker(false);
    fetchStats(start, end);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
  };

  if (loading) return (
    <div className="overview-loading">
      <div className="loader"></div>
      <p>Đang tổng hợp dữ liệu kinh doanh...</p>
    </div>
  );
  
  if (error || !stats) return (
    <div className="overview-error">
      <AlertCircle size={24} />
      <div className="error-content">
        <h3>Lỗi tải dữ liệu</h3>
        <p>{error || 'Dữ liệu không khả dụng'}</p>
        <button onClick={fetchStats} className="retry-btn">Thử lại</button>
      </div>
    </div>
  );

  // Prepare Chart Data safely
  const revenueData = (stats.revenueTrend || []).map(item => {
    const label = item.day 
      ? `${item.day}/${item.month}`
      : `T${item.month}/${item.year % 100}`;
      
    return {
      name: label,
      revenue: item.revenue || 0
    };
  });

  const orderStatusData = (stats.orderStats || []).map(item => ({
    name: item.status === 'Pending' ? 'Chờ xác nhận' :
          item.status === 'Confirmed' ? 'Đã xác nhận' :
          item.status === 'Processing' ? 'Đang xử lý' :
          item.status === 'Shipping' ? 'Đang giao' :
          item.status === 'Delivered' ? 'Đã giao' :
          item.status === 'Cancelled' ? 'Đã hủy' : item.status,
    value: item.count || 0
  }));

  const exportRevenueXLSX = () => {
    if (!stats) return;
    
    // 1. Revenue Trends Sheet
    const trendData = (stats.revenueTrend || []).map(item => ({
      'Thời gian': item.day ? `${item.day}/${item.month}/${item.year}` : `${item.month}/${item.year}`,
      'Doanh thu (VND)': item.revenue
    }));
    const trendWS = XLSX.utils.json_to_sheet(trendData);
    
    // 2. Order Status Sheet
    const statusData = (stats.orderStats || []).map(item => ({
      'Trạng thái': item.status,
      'Số lượng': item.count
    }));
    const statusWS = XLSX.utils.json_to_sheet(statusData);
    
    // 3. Top Products Sheet
    const productData = (stats.topProducts || []).map(item => ({
      'Sản phẩm': item.name,
      'Đã bán': item.sales,
      'Doanh thu': item.revenue
    }));
    const productWS = XLSX.utils.json_to_sheet(productData);
    
    // Create workbook and append sheets
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, trendWS, "Doanh Thu");
    XLSX.utils.book_append_sheet(workbook, statusWS, "Trạng Thái Đơn");
    XLSX.utils.book_append_sheet(workbook, productWS, "Top Sản Phẩm");
    
    // Manual download for better compatibility
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bao_cao_chi_tiet_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
    
    setShowRevenueMenu(false);
  };

  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ef4444'];

  const kpiCards = [
    { 
      title: 'Doanh thu', 
      value: formatPrice(stats.totalRevenue), 
      icon: DollarSign, 
      color: '#10b981', 
      trend: '+12.4%', 
      isUp: true 
    },
    { 
      title: 'Đơn hàng', 
      value: stats.totalOrders || 0, 
      icon: ShoppingCart, 
      color: '#3b82f6', 
      trend: '+5.2%', 
      isUp: true 
    },
    { 
      title: 'Khách hàng', 
      value: stats.totalCustomers || 0, 
      icon: Users, 
      color: '#f59e0b', 
      trend: '+8.1%', 
      isUp: true 
    },
    { 
      title: 'Sản phẩm', 
      value: stats.totalProducts || 0, 
      icon: Package, 
      color: '#8b5cf6', 
      trend: '0.0%', 
      isUp: null 
    }
  ];

  const getOrderStatusIcon = (status) => {
    switch (status) {
      case 'Pending': return <Clock size={16} />;
      case 'Confirmed': return <CheckCircle2 size={16} />;
      case 'Shipping': return <Truck size={16} />;
      case 'Delivered': return <CheckCircle2 size={16} />;
      case 'Cancelled': return <XCircle size={16} />;
      default: return <Package size={16} />;
    }
  };

  return (
    <div className="admin-overview-modern">
      {/* Header */}
      <div className="overview-header">
        <div>
          <h1>Tổng quan hệ thống</h1>
          <p>Báo cáo tình hình kinh doanh thời gian thực</p>
        </div>
        <div className="header-actions">
          <div className="date-filter-container" ref={datePickerRef}>
            <button className="date-picker-btn" onClick={() => setShowDatePicker(!showDatePicker)}>
              <Calendar size={18} />
              <span>{dateRange.label}</span>
            </button>
            
            {showDatePicker && (
              <div className="date-range-dropdown">
                <button onClick={() => handleRangeSelect('Hôm nay', 0)}>Hôm nay</button>
                <button onClick={() => handleRangeSelect('7 ngày qua', 7)}>7 ngày qua</button>
                <button onClick={() => handleRangeSelect('30 ngày qua', 30)}>30 ngày qua</button>
                <button onClick={() => handleRangeSelect('Tháng này', new Date().getDate())}>Tháng này</button>
                <button onClick={() => handleRangeSelect('Năm nay', 365)}>Năm nay</button>
                <button onClick={() => handleRangeSelect('Tất cả thời gian', null)}>Tất cả thời gian</button>
              </div>
            )}
          </div>
          <button className="refresh-btn" onClick={() => fetchStats()} title="Làm mới">
             <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        {kpiCards.map((kpi, index) => (
          <div key={index} className="kpi-card">
            <div className="kpi-icon" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
              <kpi.icon size={24} />
            </div>
            <div className="kpi-info">
              <span className="kpi-title">{kpi.title}</span>
              <h2 className="kpi-value">{kpi.value}</h2>
              {kpi.trend && (
                <div className={`kpi-trend ${kpi.isUp === true ? 'up' : kpi.isUp === false ? 'down' : 'neutral'}`}>
                  {kpi.isUp === true ? <ArrowUpRight size={14} /> : kpi.isUp === false ? <ArrowDownRight size={14} /> : null}
                  <span>{kpi.trend} so với tháng trước</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-main-grid">
        {/* Revenue Chart */}
        <div className="chart-card revenue-chart">
          <div className="card-header">
            <h3>Biểu đồ doanh thu</h3>
            <div 
              className="card-actions" 
              ref={menuRef}
            >
              <button 
                type="button"
                className={`card-action-btn ${showRevenueMenu ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowRevenueMenu(!showRevenueMenu);
                  console.log('Ellipsis clicked, new state:', !showRevenueMenu);
                }}
                title="Tùy chọn"
                style={{ position: 'relative', zIndex: 1001 }}
              >
                <MoreVertical size={18} />
              </button>
              
              {showRevenueMenu && (
                <div className="modern-dropdown-menu">
                  <button className="dropdown-item" onClick={() => { setShowRevenueMenu(false); fetchStats(); }}>
                    <RefreshCw size={14} />
                    <span>Làm mới dữ liệu</span>
                  </button>
                  <button className="dropdown-item" onClick={exportRevenueXLSX}>
                    <Download size={14} />
                    <span>Xuất báo cáo (XLSX)</span>
                  </button>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item" onClick={() => { setShowRevenueMenu(false); navigate('/admin/orders'); }}>
                    <ExternalLink size={14} />
                    <span>Xem chi tiết báo cáo</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `${value/1000000}M`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  formatter={(value) => formatPrice(value)}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Pie Chart */}
        <div className="chart-card order-pie">
          <div className="card-header">
            <h3>Tình trạng đơn hàng</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-legend">
              {orderStatusData.map((item, index) => (
                <div key={index} className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <span className="legend-label">{item.name}</span>
                  <span className="legend-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="table-card top-products">
          <div className="card-header">
            <h3>Top sản phẩm bán chạy</h3>
            <button className="view-all-link">Xem tất cả</button>
          </div>
          <div className="table-responsive">
            <table className="modern-mini-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th className="text-center">Đã bán</th>
                  <th className="text-right">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {(stats.topProducts || []).map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="product-cell">
                        <img src={product.image || 'https://via.placeholder.com/40'} alt="" />
                        <span className="product-name-short" title={product.name}>{product.name || 'Sản phẩm không tên'}</span>
                      </div>
                    </td>
                    <td className="text-center font-bold">{product.sales || 0}</td>
                    <td className="text-right font-bold">{formatPrice(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Orders and Stock Alerts */}
        <div className="content-card sidebar-card">
          <div className="sidebar-section">
            <div className="section-header">
              <h3>Đơn hàng mới nhất</h3>
            </div>
            <div className="recent-list">
              {(stats.recentOrders || []).map((order) => (
                <div key={order.id} className="recent-item">
                  <div className={`status-icon ${order.status}`}>
                    {getOrderStatusIcon(order.status)}
                  </div>
                  <div className="item-info">
                    <div className="item-top">
                      <span className="item-title">#GT-{order.id}</span>
                      <span className="item-amount">{formatPrice(order.totalAmount)}</span>
                    </div>
                    <div className="item-bottom">
                      <span className="item-user">{order.customerName || 'Khách vãng lai'}</span>
                      <span className="item-time">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-section stock-alerts">
            <div className="section-header">
              <h3>Cảnh báo kho hàng</h3>
            </div>
            <div className="alert-grid">
              <div className="alert-box danger">
                <span className="alert-count">{stats.outOfStockCount}</span>
                <span className="alert-label">Đã hết hàng</span>
              </div>
              <div className="alert-box warning">
                <span className="alert-count">{stats.lowStockCount}</span>
                <span className="alert-label">Sắp hết hàng</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-overview-modern {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 32px;
          color: #0f172a;
          animation: fadeIn 0.5s ease-out;
        }

        .overview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .overview-header h1 {
          font-size: 1.875rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 4px;
        }

        .overview-header p {
          color: #64748b;
          font-weight: 500;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .date-picker-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }

        .date-picker-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .refresh-btn {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f172a;
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.2);
        }

        .date-filter-container {
          position: relative;
        }

        .date-range-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
          padding: 8px;
          width: 180px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          z-index: 2000;
          animation: slideDown 0.2s ease-out;
        }

        .date-range-dropdown button {
          text-align: left;
          padding: 10px 12px;
          border: none;
          background: transparent;
          font-size: 0.875rem;
          font-weight: 600;
          color: #475569;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .date-range-dropdown button:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        /* KPI Cards */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .kpi-card {
          background: white;
          padding: 24px;
          border-radius: 24px;
          border: 1px solid #f1f5f9;
          display: flex;
          gap: 20px;
          align-items: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .kpi-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);
          border-color: #e2e8f0;
        }

        .kpi-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .kpi-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .kpi-value {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 4px 0;
          letter-spacing: -0.01em;
        }

        .kpi-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .kpi-trend.up { color: #10b981; }
        .kpi-trend.down { color: #ef4444; }
        .kpi-trend.neutral { color: #94a3b8; }

        /* Dashboard Main Grid */
        .dashboard-main-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 24px;
        }

        .chart-card, .table-card, .content-card {
          background: white;
          border-radius: 24px;
          border: 1px solid #f1f5f9;
          padding: 24px;
        }

        .revenue-chart { grid-column: span 8; }
        .order-pie { grid-column: span 4; }
        .top-products { grid-column: span 8; }
        .sidebar-card { grid-column: span 4; display: flex; flex-direction: column; gap: 32px; }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          position: relative;
          z-index: 1000;
        }

        .card-header h3 {
          font-size: 1.125rem;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .card-action-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: #f8fafc;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .card-action-btn:hover, .card-action-btn.active {
          background: #f1f5f9;
          color: #0f172a;
        }

        .card-actions {
          position: relative;
          z-index: 100;
        }

        .modern-dropdown-menu {
          position: absolute;
          top: 40px;
          right: 0;
          width: 200px;
          background: white;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          padding: 8px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 2px;
          animation: slideDown 0.2s ease-out;
        }

        .dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #475569;
          font-size: 0.813rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .dropdown-item:hover {
          background: #f8fafc;
          color: #0f172a;
        }

        .dropdown-item svg {
          color: #94a3b8;
        }

        .dropdown-divider {
          height: 1px;
          background: #f1f5f9;
          margin: 6px 4px;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Pie Legend */
        .pie-legend {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.813rem;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .legend-label {
          color: #64748b;
          font-weight: 600;
          flex: 1;
        }

        .legend-value {
          font-weight: 800;
          color: #1e293b;
        }

        /* Top Products Table */
        .modern-mini-table {
          width: 100%;
          border-collapse: collapse;
        }

        .modern-mini-table th {
          text-align: left;
          padding: 12px 16px;
          font-size: 0.75rem;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          border-bottom: 1px solid #f1f5f9;
        }

        .modern-mini-table td {
          padding: 16px;
          border-bottom: 1px solid #f8fafc;
          font-size: 0.938rem;
        }

        .product-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .product-cell img {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          object-fit: cover;
          border: 1px solid #f1f5f9;
        }

        .product-name-short {
          font-weight: 700;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 250px;
        }

        .font-bold { font-weight: 800; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }

        /* Sidebar Sections */
        .section-header h3 {
          font-size: 1rem;
          font-weight: 800;
          margin-bottom: 16px;
        }

        .recent-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .recent-item {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .status-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status-icon.Delivered { background: #dcfce7; color: #10b981; }
        .status-icon.Pending { background: #fef9c3; color: #ca8a04; }
        .status-icon.Shipping { background: #e0f2fe; color: #0284c7; }
        .status-icon.Cancelled { background: #fee2e2; color: #ef4444; }

        .item-info { flex: 1; }
        .item-top { display: flex; justify-content: space-between; align-items: center; }
        .item-title { font-size: 0.875rem; font-weight: 800; }
        .item-amount { font-size: 0.875rem; font-weight: 800; color: #0f172a; }
        .item-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 2px; }
        .item-user { font-size: 0.75rem; font-weight: 600; color: #64748b; }
        .item-time { font-size: 0.75rem; font-weight: 500; color: #94a3b8; }

        .alert-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .alert-box {
          padding: 16px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .alert-box.danger { background: #fff1f2; color: #be123c; border: 1px solid #ffe4e6; }
        .alert-box.warning { background: #fffbeb; color: #b45309; border: 1px solid #fef3c7; }

        .alert-count { font-size: 1.5rem; font-weight: 900; }
        .alert-label { font-size: 0.688rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }

        .overview-loading {
          height: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: #64748b;
          font-weight: 600;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 1280px) {
          .revenue-chart, .top-products { grid-column: span 12; }
          .order-pie, .sidebar-card { grid-column: span 12; }
          .sidebar-card { flex-direction: row; }
          .sidebar-section { flex: 1; }
        }

        @media (max-width: 768px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .sidebar-card { flex-direction: column; }
        }
        /* Responsive Mobile */
        @media (max-width: 1280px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .revenue-chart, .order-pie, .top-products, .sidebar-card { grid-column: span 12; }
        }

        @media (max-width: 768px) {
          .admin-overview-modern { padding: 16px; gap: 20px; }
          .overview-header { flex-direction: column; align-items: flex-start; gap: 20px; }
          .header-actions { width: 100%; }
          .date-filter-container { flex: 1; }
          .date-picker-btn { width: 100%; justify-content: space-between; }
          
          .kpi-grid { grid-template-columns: 1fr; gap: 12px; }
          .kpi-card { padding: 16px; }
          .kpi-icon { width: 48px; height: 48px; border-radius: 12px; }
          .kpi-value { font-size: 1.25rem; }
          
          .chart-card, .table-card, .content-card { padding: 16px; border-radius: 20px; }
          .card-header { margin-bottom: 16px; }
          
          .pie-legend { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
          
          .alert-grid { grid-template-columns: 1fr; }
          
          .dashboard-main-grid { gap: 20px; }
          
          .modern-mini-table th, .modern-mini-table td { padding: 10px 8px; }
          .product-cell img { width: 32px; height: 32px; }
          .product-name-short { max-width: 120px; }
        }

        @media (max-width: 480px) {
          .overview-header h1 { font-size: 1.5rem; }
          .pie-legend { grid-template-columns: 1fr; }
          .item-amount { font-size: 0.875rem; }
          .item-title { font-size: 0.813rem; }
        }
      `}} />
    </div>
  );
};

export default AdminOverview;
