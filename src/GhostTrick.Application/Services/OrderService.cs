using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Application.Services
{
    public class OrderService : IOrderService
    {
        private readonly IGhostTrickContext _context;
        private readonly IStockService _stock;

        public OrderService(IGhostTrickContext context, IStockService stock)
        {
            _context = context;
            _stock = stock;
        }

        public async Task<List<OrderResponseDto>> GetMyOrdersAsync(string userId)
        {
            var orders = await _context.Orders
                .AsNoTracking()
                .Where(o => o.UserId == userId)
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .Include(o => o.Items).ThenInclude(i => i.Variant).ThenInclude(v => v.Color)
                .Include(o => o.Timeline.OrderByDescending(t => t.CreatedAt))
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            var userReviews = await _context.ProductReviews
                .Where(r => r.UserId == userId && !r.IsDeleted)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new { r.ProductId, r.OrderId, r.Id })
                .ToListAsync();

            var reviewDict = userReviews
                .GroupBy(r => (r.ProductId, r.OrderId))
                .ToDictionary(g => g.Key, g => g.First().Id);

            return orders.Select(o => MapOrderToDto(o, reviewDict)).ToList();

        }

        public async Task<OrderResponseDto> GetOrderAsync(int id, string userId)
        {
            var order = await _context.Orders
                .AsNoTracking()
                .Where(o => o.Id == id && o.UserId == userId)
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .Include(o => o.Items).ThenInclude(i => i.Variant).ThenInclude(v => v.Color)
                .Include(o => o.Timeline.OrderByDescending(t => t.CreatedAt))
                .FirstOrDefaultAsync();

            if (order == null) throw new KeyNotFoundException("Đơn hàng không tồn tại.");

            var productIds = order.Items.Select(i => i.ProductId).Distinct().ToList();
            var reviewsInOrder = await _context.ProductReviews
                .Where(r => r.UserId == userId && productIds.Contains(r.ProductId) && !r.IsDeleted)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new { r.ProductId, r.OrderId, r.Id })
                .ToListAsync();

            var reviewDict = reviewsInOrder
                .GroupBy(r => (r.ProductId, r.OrderId))
                .ToDictionary(g => g.Key, g => g.First().Id);

            return MapOrderToDto(order, reviewDict);

        }

        public async Task<OrderResponseDto> CreateOrderAsync(CreateOrderDto dto, string userId)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var variantIds = dto.Items.Select(i => i.VariantId).ToList();
                var variants = await _context.ProductVariants
                    .Include(v => v.Product)
                    .Where(v => variantIds.Contains(v.Id))
                    .ToDictionaryAsync(v => v.Id);

                decimal discountAmount = 0;
                Voucher? voucher = null;
                var now = DateTime.UtcNow;
                var orderItems = new List<OrderItem>();
                
                foreach (var itemDto in dto.Items)
                {
                    var variant = variants[itemDto.VariantId];
                    var productId = variant.ProductId;

                    // Check for active Flash Sale override
                    var activeSaleProduct = await _context.SaleEventProducts
                        .Include(sp => sp.SaleEvent)
                        .FirstOrDefaultAsync(sp => 
                            sp.ProductId == productId &&
                            sp.SaleEvent!.IsActive &&
                            !sp.SaleEvent.IsDeleted &&
                            sp.SaleEvent.StartTime <= now &&
                            sp.SaleEvent.EndTime >= now);

                    if (activeSaleProduct != null)
                    {
                        // Check remaining flash stock
                        int saleQty = Math.Min(itemDto.Quantity, activeSaleProduct.FlashStock);
                        int regularQty = itemDto.Quantity - saleQty;

                        if (saleQty > 0)
                        {
                            orderItems.Add(new OrderItem
                            {
                                VariantId = itemDto.VariantId,
                                ProductId = productId,
                                Quantity = saleQty,
                                UnitPrice = activeSaleProduct.SalePrice
                            });
                            activeSaleProduct.FlashStock -= saleQty;
                            activeSaleProduct.SoldCount += saleQty;
                        }

                        if (regularQty > 0)
                        {
                            orderItems.Add(new OrderItem
                            {
                                VariantId = itemDto.VariantId,
                                ProductId = productId,
                                Quantity = regularQty,
                                UnitPrice = variant.Product!.Price
                            });
                        }
                    }
                    else
                    {
                        orderItems.Add(new OrderItem
                        {
                            VariantId = itemDto.VariantId,
                            ProductId = productId,
                            Quantity = itemDto.Quantity,
                            UnitPrice = variant.Product!.Price
                        });
                    }

                    // Update sales count for product
                    variant.Product!.ActualSalesCount += itemDto.Quantity;
                }

                decimal total = orderItems.Sum(i => i.UnitPrice * i.Quantity);
                decimal shippingFee = total >= 500000 ? 0 : 30000;

                if (!string.IsNullOrEmpty(dto.VoucherCode))
                {
                    voucher = await _context.Vouchers
                        .Include(v => v.Usages)
                        .FirstOrDefaultAsync(v =>
                            v.Code == dto.VoucherCode && v.IsActive &&
                            (v.EndDate == null || v.EndDate >= DateTime.UtcNow) &&
                            (v.UsageLimit == 0 || v.Usages.Count < v.UsageLimit));

                    if (voucher == null)
                        throw new InvalidOperationException("Mã giảm giá không hợp lệ hoặc đã hết hạn.");

                    // Check LimitPerUser
                    if (voucher.LimitPerUser > 0)
                    {
                        var userUsageCount = await _context.VoucherUsages
                            .CountAsync(vu => vu.VoucherId == voucher.Id && vu.UserId == userId);
                        
                        if (userUsageCount >= voucher.LimitPerUser)
                            throw new InvalidOperationException($"Bạn đã hết lượt sử dụng mã này (Tối đa {voucher.LimitPerUser} lần).");
                    }

                    if (total < voucher.MinOrderAmount)
                        throw new InvalidOperationException($"Đơn hàng tối thiểu {voucher.MinOrderAmount:N0}₫ để dùng mã này.");

                    discountAmount = voucher.DiscountType == DiscountType.Percent
                        ? Math.Min(total * voucher.DiscountValue / 100,
                                   voucher.MaxDiscountAmount > 0 ? voucher.MaxDiscountAmount : decimal.MaxValue)
                        : voucher.DiscountValue;
                }

                if (!Enum.TryParse<PaymentMethod>(dto.PaymentMethod, true, out var paymentMethod))
                    throw new InvalidOperationException("Phương thức thanh toán không hợp lệ.");

                var order = new Order
                {
                    UserId = userId,
                    Items = orderItems,
                    TotalAmount = total - discountAmount + shippingFee,
                    ShippingFee = shippingFee,
                    DiscountAmount = discountAmount,
                    PaymentMethod = paymentMethod,
                    ShippingAddress = dto.ShippingAddress,
                    ReceiverName = dto.ReceiverName,
                    Phone = dto.Phone,
                    Note = dto.Note,
                    VoucherId = voucher?.Id
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync(); // This will trigger DbUpdateConcurrencyException if RowVersion mismatches

                // Deduct normal stock only if not purely flash sale or handle combined logic
                // For simplicity, we always deduct from variant stock to keep total inventory accurate
                await _stock.DeductStockAsync(dto.Items.Select(i => (i.VariantId, i.Quantity)), order.Id.ToString());

                if (voucher != null)
                {
                    _context.VoucherUsages.Add(new VoucherUsage
                    {
                        VoucherId = voucher.Id,
                        UserId = userId,
                        OrderId = order.Id,
                    });
                }

                _context.OrderTimelines.Add(new OrderTimeline
                {
                    OrderId = order.Id,
                    Status = "Đã đặt hàng",
                    Note = "Đơn hàng được tạo thành công.",
                    Actor = "Customer"
                });

                // Clear cart in database
                var userCartItems = await _context.CartItems
                    .Where(ci => ci.UserId == userId)
                    .ToListAsync();
                _context.CartItems.RemoveRange(userCartItems);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return MapOrderToDto(order);
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task CancelOrderAsync(int id, string userId)
        {
            var order = await _context.Orders
                .FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);

            if (order == null) throw new KeyNotFoundException("Đơn hàng không tồn tại.");

            if (order.Status != OrderStatus.Pending && order.Status != OrderStatus.Confirmed)
                throw new InvalidOperationException("Không thể hủy đơn hàng ở trạng thái này.");

            order.Status = OrderStatus.Cancelled;
            order.UpdatedAt = DateTime.UtcNow;

            _context.OrderTimelines.Add(new OrderTimeline
            {
                OrderId = order.Id,
                Status = "Đã hủy",
                Note = "Khách hàng yêu cầu hủy đơn.",
                Actor = "Customer"
            });

            await _stock.RestoreStockAsync(id);
            await _context.SaveChangesAsync();
        }

        public async Task<PagedResult<OrderResponseDto>> GetAllOrdersAsync(
            int page, 
            int pageSize, 
            string? q, 
            string? status,
            DateTime? startDate = null,
            DateTime? endDate = null,
            decimal? minAmount = null,
            decimal? maxAmount = null,
            string? paymentMethod = null,
            string? paymentStatus = null,
            string? orderBy = null)
        {
            var query = _context.Orders.AsNoTracking();
            
            if (status == "Deleted")
            {
                query = _context.Orders.IgnoreQueryFilters().Where(o => o.IsDeleted).AsNoTracking();
            }

            if (!string.IsNullOrEmpty(q))
            {
                var isNumeric = int.TryParse(q, out var orderId);
                query = query.Where(o => 
                    (isNumeric && o.Id == orderId) || 
                    (o.User != null && (o.User.FullName.Contains(q) || o.User.Email.Contains(q))) ||
                    o.ShippingAddress.Contains(q));
            }

            if (!string.IsNullOrEmpty(status) && status != "All" && status != "Deleted" && Enum.TryParse<OrderStatus>(status, true, out var s))
            {
                query = query.Where(o => o.Status == s);
            }

            if (startDate.HasValue) query = query.Where(o => o.CreatedAt >= startDate.Value);
            if (endDate.HasValue)
            {
                var endOfDay = endDate.Value.Date.AddDays(1).AddTicks(-1);
                query = query.Where(o => o.CreatedAt <= endOfDay);
            }
            if (minAmount.HasValue) query = query.Where(o => o.TotalAmount >= minAmount.Value);
            if (maxAmount.HasValue) query = query.Where(o => o.TotalAmount <= maxAmount.Value);
            
            if (!string.IsNullOrEmpty(paymentMethod) && Enum.TryParse<PaymentMethod>(paymentMethod, true, out var pm))
                query = query.Where(o => o.PaymentMethod == pm);

            if (!string.IsNullOrEmpty(paymentStatus) && Enum.TryParse<PaymentStatus>(paymentStatus, true, out var ps))
                query = query.Where(o => o.PaymentStatus == ps);

            var totalCount = await query.CountAsync();

            if (orderBy == "oldest")
            {
                query = query.OrderBy(o => o.CreatedAt);
            }
            else
            {
                query = query.OrderByDescending(o => o.CreatedAt);
            }

            var items = await query
                .Include(o => o.User)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<OrderResponseDto>
            {
                Items = items.Select(o => MapOrderToDto(o)).ToList(),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task UpdateOrderStatusAsync(int id, UpdateOrderStatusDto dto)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null) throw new KeyNotFoundException("Đơn hàng không tồn tại.");

            if (!Enum.TryParse<OrderStatus>(dto.Status, true, out var newStatus))
                throw new InvalidOperationException("Trạng thái không hợp lệ.");

            order.Status = newStatus;
            order.UpdatedAt = DateTime.UtcNow;

            _context.OrderTimelines.Add(new OrderTimeline
            {
                OrderId = order.Id,
                Status = newStatus.ToString(),
                Note = dto.Note ?? $"Cập nhật trạng thái sang {newStatus}",
                Actor = "Admin"
            });

            await _context.SaveChangesAsync();
        }

        public async Task UpdatePaymentStatusAsync(int id, UpdatePaymentStatusDto dto)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null) throw new KeyNotFoundException("Đơn hàng không tồn tại.");

            if (!Enum.TryParse<PaymentStatus>(dto.Status, true, out var newStatus))
                throw new InvalidOperationException("Trạng thái thanh toán không hợp lệ.");

            order.PaymentStatus = newStatus;
            order.UpdatedAt = DateTime.UtcNow;

            _context.OrderTimelines.Add(new OrderTimeline
            {
                OrderId = order.Id,
                Status = order.Status.ToString(),
                Note = $"Cập nhật thanh toán sang: {newStatus}",
                Actor = "Admin"
            });

            await _context.SaveChangesAsync();
        }

        public async Task SoftDeleteOrderAsync(int id)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order != null)
            {
                order.IsDeleted = true;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<OrderResponseDto> GetOrderByIdAsync(int id)
        {
            var order = await _context.Orders
                .AsNoTracking()
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .Include(o => o.Items).ThenInclude(i => i.Variant).ThenInclude(v => v.Color)
                .Include(o => o.Timeline.OrderByDescending(t => t.CreatedAt))
                .Include(o => o.User)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null) throw new KeyNotFoundException("Đơn hàng không tồn tại.");

            return MapOrderToDto(order);
        }

        private static OrderResponseDto MapOrderToDto(Order o, Dictionary<(int ProductId, int? OrderId), int> userReviews = null) => new()
        {
            Id = o.Id,
            UserId = o.UserId,
            UserEmail = o.User?.Email,
            UserFullName = o.User?.FullName,
            Status = o.Status.ToString(),
            PaymentStatus = o.PaymentStatus.ToString(),
            TotalAmount = o.TotalAmount,
            ShippingFee = o.ShippingFee,
            DiscountAmount = o.DiscountAmount,
            PaymentMethod = o.PaymentMethod.ToString(),
            ShippingAddress = o.ShippingAddress,
            ReceiverName = o.ReceiverName,
            Phone = o.Phone,
            Note = o.Note,
            CreatedAt = o.CreatedAt,
            Items = o.Items?.Select(i => new OrderItemResponseDto
            {
                ProductId = i.ProductId,
                ProductName = i.Product?.Name,
                ProductImage = i.Product?.MainImageUrl,
                Color = i.Variant?.Color?.Name,
                Size = i.Variant?.Size,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                Subtotal = i.UnitPrice * i.Quantity,
                IsReviewed = userReviews != null && userReviews.ContainsKey((i.ProductId, o.Id)),
                ReviewId = userReviews != null && userReviews.TryGetValue((i.ProductId, o.Id), out var rid) ? rid : null
            }).ToList() ?? new List<OrderItemResponseDto>(),
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
