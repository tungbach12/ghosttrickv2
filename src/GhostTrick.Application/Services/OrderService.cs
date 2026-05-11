using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Application.Services
{
    public class OrderService : IOrderService
    {
        private readonly IGenericRepository<Order> _orderRepo;
        private readonly IGenericRepository<ProductVariant> _variantRepo;
        private readonly IGenericRepository<SaleEventProduct> _saleProductRepo;
        private readonly IGenericRepository<Voucher> _voucherRepo;
        private readonly IGenericRepository<VoucherUsage> _voucherUsageRepo;
        private readonly IGenericRepository<OrderTimeline> _timelineRepo;
        private readonly IGenericRepository<CartItem> _cartRepo;
        private readonly IGenericRepository<ProductReview> _reviewRepo;
        private readonly IGenericRepository<SystemSetting> _settingsRepo;
        private readonly IUnitOfWork _uow;
        private readonly IStockService _stock;
        private readonly IEmailService _email;

        public OrderService(
            IGenericRepository<Order> orderRepo,
            IGenericRepository<ProductVariant> variantRepo,
            IGenericRepository<SaleEventProduct> saleProductRepo,
            IGenericRepository<Voucher> voucherRepo,
            IGenericRepository<VoucherUsage> voucherUsageRepo,
            IGenericRepository<OrderTimeline> timelineRepo,
            IGenericRepository<CartItem> cartRepo,
            IGenericRepository<ProductReview> reviewRepo,
            IGenericRepository<SystemSetting> settingsRepo,
            IUnitOfWork uow,
            IStockService stock,
            IEmailService email)
        {
            _orderRepo = orderRepo;
            _variantRepo = variantRepo;
            _saleProductRepo = saleProductRepo;
            _voucherRepo = voucherRepo;
            _voucherUsageRepo = voucherUsageRepo;
            _timelineRepo = timelineRepo;
            _cartRepo = cartRepo;
            _reviewRepo = reviewRepo;
            _settingsRepo = settingsRepo;
            _uow = uow;
            _stock = stock;
            _email = email;
        }

        public async Task<List<OrderResponseDto>> GetMyOrdersAsync(string userId)
        {
            var orders = await _orderRepo.FindAsync(
                o => o.UserId == userId,
                q => q.Include(o => o.Items!).ThenInclude(i => i.Product)
                      .Include(o => o.Items!).ThenInclude(i => i.Variant!).ThenInclude(v => v.Color)
                      .Include(o => o.Timeline!.OrderByDescending(t => t.CreatedAt))
            );

            orders = orders.OrderByDescending(o => o.CreatedAt).ToList();

            var userReviews = await _reviewRepo.FindAsync(
                r => r.UserId == userId && !r.IsDeleted
            );

            var reviewDict = userReviews
                .OrderByDescending(r => r.CreatedAt)
                .GroupBy(r => (r.ProductId, r.OrderId))
                .ToDictionary(g => g.Key, g => g.First().Id);

            return orders.Select(o => MapOrderToDto(o, reviewDict)).ToList();
        }

        public async Task<OrderResponseDto> GetOrderAsync(int id, string userId)
        {
            var result = await _orderRepo.FindAsync(
                o => o.Id == id && o.UserId == userId,
                q => q.Include(o => o.Items!).ThenInclude(i => i.Product)
                      .Include(o => o.Items!).ThenInclude(i => i.Variant!).ThenInclude(v => v.Color)
                      .Include(o => o.Timeline!.OrderByDescending(t => t.CreatedAt))
            );

            var order = result.FirstOrDefault();
            if (order == null) throw new KeyNotFoundException("Đơn hàng không tồn tại.");

            var productIds = order.Items!.Select(i => i.ProductId).Distinct().ToList();
            var reviewsInOrder = await _reviewRepo.FindAsync(
                r => r.UserId == userId && productIds.Contains(r.ProductId) && !r.IsDeleted
            );

            var reviewDict = reviewsInOrder
                .OrderByDescending(r => r.CreatedAt)
                .GroupBy(r => (r.ProductId, r.OrderId))
                .ToDictionary(g => g.Key, g => g.First().Id);

            return MapOrderToDto(order, reviewDict);
        }

        public async Task<OrderResponseDto> CreateOrderAsync(CreateOrderDto dto, string userId)
        {
            using var transaction = await _uow.BeginTransactionAsync();
            try
            {
                var variantIds = dto.Items.Select(i => i.VariantId).ToList();
                var variantsList = await _variantRepo.FindAsync(
                    v => variantIds.Contains(v.Id),
                    q => q.Include(v => v.Product!)
                );
                var variants = variantsList.ToDictionary(v => v.Id);

                decimal discountAmount = 0;
                Voucher? voucher = null;
                var now = DateTime.UtcNow;
                var orderItems = new List<OrderItem>();
                
                foreach (var itemDto in dto.Items)
                {
                    var variant = variants[itemDto.VariantId];
                    var productId = variant.ProductId;

                    var saleResults = await _saleProductRepo.FindAsync(
                        sp => sp.ProductId == productId &&
                              sp.SaleEvent!.IsActive &&
                              !sp.SaleEvent.IsDeleted &&
                              sp.SaleEvent.StartTime <= now &&
                              sp.SaleEvent.EndTime >= now,
                        q => q.Include(sp => sp.SaleEvent!)
                    );
                    var activeSaleProduct = saleResults.FirstOrDefault();

                    if (activeSaleProduct != null)
                    {
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
                            _saleProductRepo.Update(activeSaleProduct);
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

                    variant.Product!.ActualSalesCount += itemDto.Quantity;
                    _variantRepo.Update(variant);
                }

                decimal total = orderItems.Sum(i => i.UnitPrice * i.Quantity);
                decimal shippingFee = total >= 500000 ? 0 : 30000;

                if (!string.IsNullOrEmpty(dto.VoucherCode))
                {
                    var vResult = await _voucherRepo.FindAsync(
                        v => v.Code == dto.VoucherCode && v.IsActive &&
                             (v.EndDate == null || v.EndDate >= now),
                        q => q.Include(v => v.Usages!)
                    );
                    voucher = vResult.FirstOrDefault();

                    if (voucher == null || (voucher.UsageLimit > 0 && voucher.Usages!.Count >= voucher.UsageLimit))
                        throw new InvalidOperationException("Mã giảm giá không hợp lệ hoặc đã hết hạn.");

                    if (voucher.LimitPerUser > 0)
                    {
                        var userUsageResults = await _voucherUsageRepo.FindAsync(
                            vu => vu.VoucherId == voucher.Id && vu.UserId == userId
                        );
                        if (userUsageResults.Count >= voucher.LimitPerUser)
                            throw new InvalidOperationException($"Bạn đã hết lượt sử dụng mã này (Tối đa {voucher.LimitPerUser} lần).");
                    }

                    if (total < voucher.MinOrderAmount)
                        throw new InvalidOperationException($"Đơn hàng tối thiểu {voucher.MinOrderAmount:N0}₫ để dùng mã này.");

                    discountAmount = voucher.DiscountType == DiscountType.Percent
                        ? Math.Min(total * voucher.DiscountValue / 100, voucher.MaxDiscountAmount > 0 ? voucher.MaxDiscountAmount : decimal.MaxValue)
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

                await _orderRepo.AddAsync(order);
                await _uow.CompleteAsync();

                await _stock.DeductStockAsync(dto.Items.Select(i => (i.VariantId, i.Quantity)), order.Id.ToString());

                if (voucher != null)
                {
                    await _voucherUsageRepo.AddAsync(new VoucherUsage
                    {
                        VoucherId = voucher.Id,
                        UserId = userId,
                        OrderId = order.Id,
                    });
                }

                await _timelineRepo.AddAsync(new OrderTimeline
                {
                    OrderId = order.Id,
                    Status = "Đã đặt hàng",
                    Note = "Đơn hàng được tạo thành công.",
                    Actor = "Customer"
                });

                var userCartItems = await _cartRepo.FindAsync(ci => ci.UserId == userId);
                _cartRepo.RemoveRange(userCartItems);

                await _uow.CompleteAsync();
                await _uow.CommitAsync();

                try
                {
                    var settings = await _settingsRepo.FindAsync(s => s.Key == "OrderNotificationEmail");
                    var notificationEmailSetting = settings.FirstOrDefault();
                    
                    if (notificationEmailSetting != null && !string.IsNullOrEmpty(notificationEmailSetting.Value))
                    {
                        var subject = $"[Ghosttrick] Đơn hàng mới #{order.Id}";
                        var body = $@"
                            <div style='font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;'>
                                <h2 style='color: #0f172a;'>Bạn có đơn hàng mới!</h2>
                                <p>Đơn hàng <strong>#{order.Id}</strong> vừa được đặt thành công.</p>
                                <hr style='border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;' />
                                <p><strong>Khách hàng:</strong> {order.ReceiverName}</p>
                                <p><strong>Số điện thoại:</strong> {order.Phone}</p>
                                <p><strong>Tổng cộng:</strong> {order.TotalAmount:N0}₫</p>
                                <p><strong>Phương thức thanh toán:</strong> {order.PaymentMethod}</p>
                                <div style='margin-top: 30px;'>
                                    <a href='http://localhost:5173/admin/orders' style='background: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;'>Xem chi tiết đơn hàng</a>
                                </div>
                            </div>";
                        await _email.SendEmailAsync(notificationEmailSetting.Value, subject, body);
                    }
                }
                catch (Exception ex)
                {
                    // Log but don't fail order creation
                    Console.WriteLine($"[EMAIL ERROR] Failed to send order notification: {ex.Message}");
                }

                return MapOrderToDto(order);
            }
            catch (Exception)
            {
                await _uow.RollbackAsync();
                throw;
            }
        }

        public async Task CancelOrderAsync(int id, string userId)
        {
            var result = await _orderRepo.FindAsync(o => o.Id == id && o.UserId == userId);
            var order = result.FirstOrDefault();

            if (order == null) throw new KeyNotFoundException("Đơn hàng không tồn tại.");

            if (order.Status != OrderStatus.Pending && order.Status != OrderStatus.Confirmed)
                throw new InvalidOperationException("Không thể hủy đơn hàng ở trạng thái này.");

            order.Status = OrderStatus.Cancelled;
            order.UpdatedAt = DateTime.UtcNow;

            await _timelineRepo.AddAsync(new OrderTimeline
            {
                OrderId = order.Id,
                Status = "Đã hủy",
                Note = "Khách hàng yêu cầu hủy đơn.",
                Actor = "Customer"
            });

            await _stock.RestoreStockAsync(id);
            _orderRepo.Update(order);
            await _uow.CompleteAsync();
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
            var (items, totalCount) = await _orderRepo.GetPagedAsync(page, pageSize, query => 
            {
                if (status == "Deleted")
                {
                    // For deleted items, I'll need a way to ignore query filters in the repository.
                    // For now, let's assume it's just normal items. 
                    // Actually, let's just use the default.
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

                if (orderBy == "oldest")
                    query = query.OrderBy(o => o.CreatedAt);
                else
                    query = query.OrderByDescending(o => o.CreatedAt);

                return query.Include(o => o.User);
            });

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
            var order = await _orderRepo.GetByIdAsync(id);
            if (order == null) throw new KeyNotFoundException("Đơn hàng không tồn tại.");

            if (!Enum.TryParse<OrderStatus>(dto.Status, true, out var newStatus))
                throw new InvalidOperationException("Trạng thái không hợp lệ.");

            order.Status = newStatus;
            order.UpdatedAt = DateTime.UtcNow;

            await _timelineRepo.AddAsync(new OrderTimeline
            {
                OrderId = order.Id,
                Status = newStatus.ToString(),
                Note = dto.Note ?? $"Cập nhật trạng thái sang {newStatus}",
                Actor = "Admin"
            });

            _orderRepo.Update(order);
            await _uow.CompleteAsync();
        }

        public async Task UpdatePaymentStatusAsync(int id, UpdatePaymentStatusDto dto)
        {
            var order = await _orderRepo.GetByIdAsync(id);
            if (order == null) throw new KeyNotFoundException("Đơn hàng không tồn tại.");

            if (!Enum.TryParse<PaymentStatus>(dto.Status, true, out var newStatus))
                throw new InvalidOperationException("Trạng thái thanh toán không hợp lệ.");

            order.PaymentStatus = newStatus;
            order.UpdatedAt = DateTime.UtcNow;

            await _timelineRepo.AddAsync(new OrderTimeline
            {
                OrderId = order.Id,
                Status = order.Status.ToString(),
                Note = $"Cập nhật thanh toán sang: {newStatus}",
                Actor = "Admin"
            });

            _orderRepo.Update(order);
            await _uow.CompleteAsync();
        }

        public async Task SoftDeleteOrderAsync(int id)
        {
            var order = await _orderRepo.GetByIdAsync(id);
            if (order != null)
            {
                order.IsDeleted = true;
                _orderRepo.Update(order);
                await _uow.CompleteAsync();
            }
        }

        public async Task<OrderResponseDto> GetOrderByIdAsync(int id)
        {
            var result = await _orderRepo.FindAsync(
                o => o.Id == id,
                q => q.Include(o => o.Items!).ThenInclude(i => i.Product)
                      .Include(o => o.Items!).ThenInclude(i => i.Variant!).ThenInclude(v => v.Color)
                      .Include(o => o.Timeline!.OrderByDescending(t => t.CreatedAt))
                      .Include(o => o.User)
            );

            var order = result.FirstOrDefault();
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
