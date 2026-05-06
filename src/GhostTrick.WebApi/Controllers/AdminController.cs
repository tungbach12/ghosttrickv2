using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using GhostTrick.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly GhostTrickContext _context;

        public AdminController(GhostTrickContext context)
        {
            _context = context;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var totalOrders = await _context.Orders.CountAsync();
            var totalRevenue = await _context.Orders
                .Where(o => o.Status == OrderStatus.Delivered || o.Status == OrderStatus.Confirmed)
                .SumAsync(o => o.TotalAmount);
            
            var totalProducts = await _context.Products.CountAsync();
            var lowStockCount = await _context.ProductVariants
                .Where(v => v.Stock <= v.LowStockThreshold)
                .CountAsync();
                
            var totalCustomers = await _context.Users.CountAsync() - 1; 

            var orderStats = await _context.Orders
                .GroupBy(o => o.Status)
                .Select(g => new { Status = g.Key.ToString(), Count = g.Count() })
                .ToListAsync();

            return Ok(new
            {
                TotalOrders = totalOrders,
                TotalRevenue = totalRevenue,
                TotalProducts = totalProducts,
                LowStockCount = lowStockCount,
                TotalCustomers = totalCustomers,
                OrderStats = orderStats
            });
        }
    }
}
