using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Application.Services
{
    public class AdminService : IAdminService
    {
        private readonly IGenericRepository<Order> _orderRepo;
        private readonly IGenericRepository<Product> _productRepo;
        private readonly IGenericRepository<ApplicationUser> _userRepo;
        private readonly IGenericRepository<OrderItem> _orderItemRepo;

        public AdminService(
            IGenericRepository<Order> orderRepo,
            IGenericRepository<Product> productRepo,
            IGenericRepository<ApplicationUser> userRepo,
            IGenericRepository<OrderItem> orderItemRepo)
        {
            _orderRepo = orderRepo;
            _productRepo = productRepo;
            _userRepo = userRepo;
            _orderItemRepo = orderItemRepo;
        }

        public async Task<object> GetDashboardStatsAsync(DateTime? startDate = null, DateTime? endDate = null)
        {
            var orders = await _orderRepo.GetAsync(q => {
                var query = q.AsNoTracking().Include(o => o.User).AsQueryable();
                if (startDate.HasValue) query = query.Where(o => o.CreatedAt >= startDate.Value);
                if (endDate.HasValue) query = query.Where(o => o.CreatedAt <= endDate.Value);
                return query;
            });

            var totalOrders = orders.Count;
            var totalRevenue = orders.Where(o => o.Status == OrderStatus.Delivered).Sum(o => o.TotalAmount);
            
            var products = await _productRepo.GetAsync(q => q.AsNoTracking().Include(p => p.Variants));
            var totalProducts = products.Count;
            var outOfStockCount = products.Count(p => !p.Variants.Any(v => v.Stock > 0));
            var lowStockCount = products.Count(p => p.Variants.Any(v => v.Stock > 0 && v.Stock <= v.LowStockThreshold));

            var customers = await _userRepo.GetAsync(q => {
                var query = q.AsNoTracking().AsQueryable();
                if (startDate.HasValue) query = query.Where(u => u.CreatedAt >= startDate.Value);
                if (endDate.HasValue) query = query.Where(u => u.CreatedAt <= endDate.Value);
                return query;
            });
            var totalCustomers = customers.Count - (startDate.HasValue ? 0 : 1);

            var orderStats = orders
                .GroupBy(o => o.Status)
                .Select(g => new { Status = g.Key.ToString(), Count = g.Count() })
                .ToList();

            var isShortRange = startDate.HasValue && endDate.HasValue && (endDate.Value - startDate.Value).TotalDays <= 31;
            var deliveredOrders = orders.Where(o => o.Status == OrderStatus.Delivered);

            object revenueTrend;
            if (isShortRange)
            {
                revenueTrend = deliveredOrders
                    .GroupBy(o => new { o.CreatedAt.Date })
                    .Select(g => new 
                    { 
                        Year = g.Key.Date.Year, 
                        Month = g.Key.Date.Month, 
                        Day = g.Key.Date.Day,
                        Revenue = g.Sum(o => o.TotalAmount) 
                    })
                    .OrderBy(x => x.Year).ThenBy(x => x.Month).ThenBy(x => x.Day)
                    .ToList();
            }
            else
            {
                revenueTrend = deliveredOrders
                    .GroupBy(o => new { o.CreatedAt.Year, o.CreatedAt.Month })
                    .Select(g => new 
                    { 
                        Year = g.Key.Year, 
                        Month = g.Key.Month, 
                        Revenue = g.Sum(o => o.TotalAmount) 
                    })
                    .OrderBy(x => x.Year).ThenBy(x => x.Month)
                    .ToList();
            }

            var orderItems = await _orderItemRepo.GetAsync(q => q
                .Include(oi => oi.Order)
                .Include(oi => oi.Product)
                .Where(oi => (!startDate.HasValue || oi.Order!.CreatedAt >= startDate.Value) && 
                             (!endDate.HasValue || oi.Order!.CreatedAt <= endDate.Value))
            );

            var topProducts = orderItems
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
                .ToList();

            var recentOrders = orders
                .OrderByDescending(o => o.CreatedAt)
                .Take(5)
                .Select(o => new 
                {
                    o.Id,
                    CustomerName = o.User?.FullName,
                    o.TotalAmount,
                    Status = o.Status.ToString(),
                    o.CreatedAt
                })
                .ToList();

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
