using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using GhostTrick.Infrastructure.Persistence;
using GhostTrick.Application.DTOs;
using GhostTrick.Domain.Entities;
using GhostTrick.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private readonly GhostTrickContext _context;
        private readonly IStockService _stock;

        public OrdersController(GhostTrickContext context, IStockService stock)
        {
            _context = context;
            _stock = stock;
        }

        private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        /// <summary>GET /api/orders — list orders of current user</summary>
        [HttpGet]
        public async Task<ActionResult<List<OrderResponseDto>>> GetMyOrders()
        {
            var orders = await _context.Orders
                .Where(o => o.UserId == UserId)
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .Include(o => o.Items).ThenInclude(i => i.Variant)
                .Include(o => o.Timeline.OrderByDescending(t => t.CreatedAt))
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            return Ok(orders.Select(MapOrderToDto));
        }

        /// <summary>GET /api/orders/{id}</summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<OrderResponseDto>> GetOrder(int id)
        {
            var order = await _context.Orders
                .Where(o => o.Id == id && o.UserId == UserId)
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .Include(o => o.Items).ThenInclude(i => i.Variant)
                .Include(o => o.Timeline.OrderByDescending(t => t.CreatedAt))
                .FirstOrDefaultAsync();

            if (order == null) return NotFound(new { message = "Đơn hàng không tồn tại." });

            return Ok(MapOrderToDto(order));
        }

        /// <summary>POST /api/orders — create new order</summary>
        [HttpPost]
        public async Task<ActionResult<OrderResponseDto>> CreateOrder([FromBody] CreateOrderDto dto)
        {
            // 1. Validate stock in batch
            var stockItems = dto.Items.Select(i => (i.VariantId, i.Quantity));
            var stockCheck = await _stock.CheckStockBatchAsync(stockItems);
            var outOfStock = stockCheck.Where(kv => !kv.Value).Select(kv => kv.Key).ToList();

            if (outOfStock.Any())
                return Conflict(new { message = "Một số sản phẩm không đủ tồn kho.", variantIds = outOfStock });

            // 2. Resolve variants + products
            var variantIds = dto.Items.Select(i => i.VariantId).ToList();
            var variants = await _context.ProductVariants
                .Include(v => v.Product)
                .Where(v => variantIds.Contains(v.Id))
                .ToDictionaryAsync(v => v.Id);

            // 3. Handle voucher
            decimal discountAmount = 0;
            Voucher? voucher = null;

            if (!string.IsNullOrEmpty(dto.VoucherCode))
            {
                voucher = await _context.Vouchers.FirstOrDefaultAsync(v =>
                    v.Code == dto.VoucherCode && v.IsActive &&
                    (v.EndDate == null || v.EndDate >= DateTime.UtcNow) &&
                    (v.UsageLimit == 0 || v.UsedCount < v.UsageLimit));

                if (voucher == null)
                    return BadRequest(new { message = "Mã giảm giá không hợp lệ hoặc đã hết hạn." });

                decimal subtotalBeforeDiscount = dto.Items.Sum(i =>
                    variants[i.VariantId].Product!.Price * i.Quantity);

                if (subtotalBeforeDiscount < voucher.MinOrderAmount)
                    return BadRequest(new { message = $"Đơn hàng tối thiểu {voucher.MinOrderAmount:N0}₫ để dùng mã này." });

                discountAmount = voucher.DiscountType == DiscountType.Percent
                    ? Math.Min(subtotalBeforeDiscount * voucher.DiscountValue / 100,
                               voucher.MaxDiscountAmount > 0 ? voucher.MaxDiscountAmount : decimal.MaxValue)
                    : voucher.DiscountValue;
            }

            // 4. Build order
            var orderItems = dto.Items.Select(i =>
            {
                var variant = variants[i.VariantId];
                var price = variant.Product!.Price;
                return new OrderItem
                {
                    VariantId = i.VariantId,
                    ProductId = variant.ProductId,
                    Quantity = i.Quantity,
                    UnitPrice = price,
                    Subtotal = price * i.Quantity
                };
            }).ToList();

            decimal total = orderItems.Sum(i => i.Subtotal);
            decimal shippingFee = total >= 500000 ? 0 : 30000;

            if (!Enum.TryParse<PaymentMethod>(dto.PaymentMethod, true, out var paymentMethod))
                return BadRequest(new { message = "Phương thức thanh toán không hợp lệ." });

            var order = new Order
            {
                UserId = UserId,
                Items = orderItems,
                TotalAmount = total - discountAmount + shippingFee,
                ShippingFee = shippingFee,
                DiscountAmount = discountAmount,
                PaymentMethod = paymentMethod,
                ShippingAddress = dto.ShippingAddress,
                Note = dto.Note,
                VoucherId = voucher?.Id
            };

            // 5. Deduct stock (atomic)
            try
            {
                // Note: We need the ID, but it's generated after SaveChanges.
                // We'll save first, then deduct.
                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                await _stock.DeductStockAsync(dto.Items.Select(i => (i.VariantId, i.Quantity)), order.Id.ToString());
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }

            // 6. Update voucher usage
            if (voucher != null)
            {
                voucher.UsedCount++;
                _context.VoucherUsages.Add(new VoucherUsage
                {
                    VoucherId = voucher.Id,
                    UserId = UserId,
                    OrderId = order.Id,
                });
            }

            // 7. Update SalesCount on products
            foreach (var item in orderItems)
            {
                var product = await _context.Products.FindAsync(item.ProductId);
                if (product != null) product.SalesCount += item.Quantity;
            }

            // 8. Log Initial Timeline
            _context.OrderTimelines.Add(new OrderTimeline
            {
                OrderId = order.Id,
                Status = "Đã đặt hàng",
                Note = "Đơn hàng được tạo thành công.",
                Actor = "Customer"
            });

            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, MapOrderToDto(order));
        }

        /// <summary>PUT /api/orders/{id}/cancel</summary>
        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> CancelOrder(int id)
        {
            var order = await _context.Orders
                .FirstOrDefaultAsync(o => o.Id == id && o.UserId == UserId);

            if (order == null) return NotFound(new { message = "Đơn hàng không tồn tại." });

            if (order.Status != OrderStatus.Pending && order.Status != OrderStatus.Confirmed)
                return BadRequest(new { message = "Không thể hủy đơn hàng ở trạng thái này." });

            order.Status = OrderStatus.Cancelled;
            order.UpdatedAt = DateTime.UtcNow;

            // Log Timeline
            _context.OrderTimelines.Add(new OrderTimeline
            {
                OrderId = order.Id,
                Status = "Đã hủy",
                Note = "Khách hàng yêu cầu hủy đơn.",
                Actor = "Customer"
            });

            await _stock.RestoreStockAsync(id);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đơn hàng đã được hủy thành công." });
        }

        // ── Admin Endpoints ────────────────────────────────────────────

        /// <summary>GET /api/orders/all — (Admin only) list all orders</summary>
        [HttpGet("all")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<OrderResponseDto>>> GetAllOrders()
        {
            var orders = await _context.Orders
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .Include(o => o.Items).ThenInclude(i => i.Variant)
                .Include(o => o.Timeline.OrderByDescending(t => t.CreatedAt))
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            return Ok(orders.Select(MapOrderToDto));
        }

        /// <summary>PUT /api/orders/{id}/status — (Admin only) update order status</summary>
        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusDto dto)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound(new { message = "Đơn hàng không tồn tại." });

            if (!Enum.TryParse<OrderStatus>(dto.Status, true, out var newStatus))
                return BadRequest(new { message = "Trạng thái không hợp lệ." });

            order.Status = newStatus;
            order.UpdatedAt = DateTime.UtcNow;

            // Log Timeline
            _context.OrderTimelines.Add(new OrderTimeline
            {
                OrderId = order.Id,
                Status = newStatus.ToString(),
                Note = dto.Note ?? $"Cập nhật trạng thái sang {newStatus}",
                Actor = "Admin"
            });

            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật trạng thái thành công." });
        }

        // ── Mapper ─────────────────────────────────────────────────────
        private static OrderResponseDto MapOrderToDto(Order o) => new()
        {
            Id = o.Id,
            Status = o.Status.ToString(),
            PaymentStatus = o.PaymentStatus.ToString(),
            TotalAmount = o.TotalAmount,
            ShippingFee = o.ShippingFee,
            DiscountAmount = o.DiscountAmount,
            PaymentMethod = o.PaymentMethod.ToString(),
            ShippingAddress = o.ShippingAddress,
            Note = o.Note,
            CreatedAt = o.CreatedAt,
            Items = o.Items.Select(i => new OrderItemResponseDto
            {
                ProductId = i.ProductId,
                ProductName = i.Product?.Name,
                ProductImage = i.Product?.MainImageUrl,
                Color = i.Variant?.Color,
                Size = i.Variant?.Size,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                Subtotal = i.Subtotal
            }).ToList(),
            Timeline = o.Timeline?.Select(t => new OrderTimelineDto
            {
                Status = t.Status,
                Note = t.Note,
                Actor = t.Actor,
                CreatedAt = t.CreatedAt
            }).ToList() ?? new List<OrderTimelineDto>()
        };
    }
}
