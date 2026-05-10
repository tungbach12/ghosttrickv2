using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Application.Services
{
    public class AdminService : IAdminService
    {
        private readonly IGhostTrickContext _context;

        public AdminService(IGhostTrickContext context)
        {
            _context = context;
        }

        public async Task<object> GetDashboardStatsAsync(DateTime? startDate = null, DateTime? endDate = null)
        {
            var query = _context.Orders.AsQueryable();

            if (startDate.HasValue)
                query = query.Where(o => o.CreatedAt >= startDate.Value);
            if (endDate.HasValue)
                query = query.Where(o => o.CreatedAt <= endDate.Value);

            var totalOrders = await query.CountAsync();
            var totalRevenue = await query
                .Where(o => o.Status == OrderStatus.Delivered)
                .SumAsync(o => o.TotalAmount);
            
            var totalProducts = await _context.Products.CountAsync();
            
            // Stock details (Product-based, consistent with AdminProducts)
            var outOfStockCount = await _context.Products
                .CountAsync(p => !p.Variants.Any(v => v.Stock > 0));
            var lowStockCount = await _context.Products
                .CountAsync(p => p.Variants.Any(v => v.Stock > 0 && v.Stock <= v.LowStockThreshold));
                
            // Customers joined in this period or total? User asked for "Overview", usually total customers is fine.
            // But let's show customers joined in this period if filter is active for consistency.
            var customerQuery = _context.Users.AsQueryable();
            if (startDate.HasValue) customerQuery = customerQuery.Where(u => u.CreatedAt >= startDate.Value);
            if (endDate.HasValue) customerQuery = customerQuery.Where(u => u.CreatedAt <= endDate.Value);
            var totalCustomers = await customerQuery.CountAsync() - (startDate.HasValue ? 0 : 1); // Subtract 1 for admin if no filter

            // Order Status Breakdown
            var orderStats = await query
                .GroupBy(o => o.Status)
                .Select(g => new { Status = g.Key.ToString(), Count = g.Count() })
                .ToListAsync();

            // Revenue Trend
            // If range is <= 31 days, group by Day. Otherwise Month.
            var isShortRange = startDate.HasValue && endDate.HasValue && (endDate.Value - startDate.Value).TotalDays <= 31;
            
            var trendQuery = query.Where(o => o.Status == OrderStatus.Delivered);
            
            object revenueTrend;
            if (isShortRange)
            {
                revenueTrend = await trendQuery
                    .GroupBy(o => new { o.CreatedAt.Date })
                    .Select(g => new 
                    { 
                        Year = g.Key.Date.Year, 
                        Month = g.Key.Date.Month, 
                        Day = g.Key.Date.Day,
                        Revenue = g.Sum(o => o.TotalAmount) 
                    })
                    .OrderBy(x => x.Year).ThenBy(x => x.Month).ThenBy(x => x.Day)
                    .ToListAsync();
            }
            else
            {
                revenueTrend = await trendQuery
                    .GroupBy(o => new { o.CreatedAt.Year, o.CreatedAt.Month })
                    .Select(g => new 
                    { 
                        Year = g.Key.Year, 
                        Month = g.Key.Month, 
                        Revenue = g.Sum(o => o.TotalAmount) 
                    })
                    .OrderBy(x => x.Year).ThenBy(x => x.Month)
                    .ToListAsync();
            }

            // Top 5 Selling Products in this period
            var topProducts = await _context.OrderItems
                .Include(oi => oi.Order)
                .Include(oi => oi.Product)
                .Where(oi => (!startDate.HasValue || oi.Order!.CreatedAt >= startDate.Value) && 
                             (!endDate.HasValue || oi.Order!.CreatedAt <= endDate.Value))
                .GroupBy(oi => new { oi.ProductId, oi.Product!.Name, oi.Product!.MainImageUrl })
                .Select(g => new 
                { 
                    Id = g.Key.ProductId,
                    Name = g.Key.Name,
                    Image = g.Key.MainImageUrl,
                    Sales = g.Sum(oi => oi.Quantity),
                    Revenue = g.Sum(oi => oi.UnitPrice * oi.Quantity)
                })
                .OrderByDescending(x => x.Sales)
                .Take(5)
                .ToListAsync();

            // Recent 5 Orders in this period
            var recentOrders = await query
                .Include(o => o.User)
                .OrderByDescending(o => o.CreatedAt)
                .Take(5)
                .Select(o => new 
                {
                    o.Id,
                    CustomerName = o.User!.FullName,
                    o.TotalAmount,
                    Status = o.Status.ToString(),
                    o.CreatedAt
                })
                .ToListAsync();

            return new
            {
                TotalOrders = totalOrders,
                TotalRevenue = totalRevenue,
                TotalProducts = totalProducts,
                OutOfStockCount = outOfStockCount,
                LowStockCount = lowStockCount,
                TotalCustomers = totalCustomers,
                OrderStats = orderStats,
                RevenueTrend = revenueTrend,
                TopProducts = topProducts,
                RecentOrders = recentOrders
            };
        }
    }
}
