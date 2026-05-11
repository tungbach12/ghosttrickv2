using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Application.Services
{
    public class CartService : ICartService
    {
        private readonly IGenericRepository<CartItem> _cartRepo;
        private readonly IGenericRepository<SaleEventProduct> _saleRepo;
        private readonly IGenericRepository<ProductVariant> _variantRepo;
        private readonly IUnitOfWork _uow;

        public CartService(
            IGenericRepository<CartItem> cartRepo,
            IGenericRepository<SaleEventProduct> saleRepo,
            IGenericRepository<ProductVariant> variantRepo,
            IUnitOfWork uow)
        {
            _cartRepo = cartRepo;
            _saleRepo = saleRepo;
            _variantRepo = variantRepo;
            _uow = uow;
        }

        public async Task<List<CartItemResponseDto>> GetCartAsync(string userId)
        {
            var now = DateTime.UtcNow;
            var cartItems = await _cartRepo.GetAsync(q => q
                .Where(ci => ci.UserId == userId)
                .Include(ci => ci.Product)
                .Include(ci => ci.Variant!).ThenInclude(v => v.Color)
                .OrderBy(ci => ci.CreatedAt)
            );

            var result = new List<CartItemResponseDto>();
            var productSaleCache = new Dictionary<int, SaleEventProduct?>();

            foreach (var ci in cartItems)
            {
                if (!productSaleCache.ContainsKey(ci.ProductId))
                {
                    var saleResults = await _saleRepo.FindAsync(
                        sp => sp.ProductId == ci.ProductId &&
                              sp.SaleEvent!.IsActive &&
                              !sp.SaleEvent.IsDeleted &&
                              sp.SaleEvent.StartTime <= now &&
                              sp.SaleEvent.EndTime >= now,
                        q => q.Include(sp => sp.SaleEvent!)
                    );
                    productSaleCache[ci.ProductId] = saleResults.FirstOrDefault();
                }

                var activeSaleProduct = productSaleCache[ci.ProductId];
                
                decimal price = ci.Product!.Price;
                if (activeSaleProduct != null && activeSaleProduct.FlashStock > 0)
                {
                    price = activeSaleProduct.SalePrice;
                }

                result.Add(new CartItemResponseDto
                {
                    VariantId = ci.VariantId,
                    ProductId = ci.ProductId,
                    Name = ci.Product!.Name,
                    Price = price,
                    SalePrice = (activeSaleProduct != null && activeSaleProduct.FlashStock > 0) ? activeSaleProduct.SalePrice : null,
                    RegularPrice = ci.Product.Price,
                    PurchasedInSaleCount = 0,
                    MainImageUrl = ci.Product.MainImageUrl,
                    Size = ci.Variant!.Size,
                    Color = ci.Variant.Color,
                    Quantity = ci.Quantity,
                    Stock = ci.Variant.Stock
                });
            }

            return result;
        }

        public async Task AddToCartAsync(CartRequestDto request, string userId)
        {
            var variant = await _variantRepo.GetByIdAsync(request.VariantId);
            if (variant == null) throw new KeyNotFoundException("Sản phẩm không tồn tại.");

            var existingResults = await _cartRepo.FindAsync(ci => ci.UserId == userId && ci.VariantId == request.VariantId);
            var existingItem = existingResults.FirstOrDefault();

            int newTotalQuantity = (existingItem?.Quantity ?? 0) + request.Quantity;

            if (newTotalQuantity > variant.Stock)
                throw new InvalidOperationException($"Chỉ còn {variant.Stock} sản phẩm trong kho.");

            if (existingItem != null)
            {
                existingItem.Quantity = newTotalQuantity;
                existingItem.UpdatedAt = DateTime.UtcNow;
                _cartRepo.Update(existingItem);
            }
            else
            {
                var cartItem = new CartItem
                {
                    UserId = userId,
                    ProductId = request.ProductId,
                    VariantId = request.VariantId,
                    Quantity = request.Quantity
                };
                await _cartRepo.AddAsync(cartItem);
            }

            await _uow.CompleteAsync();
        }

        public async Task RemoveFromCartAsync(int variantId, string userId)
        {
            var results = await _cartRepo.FindAsync(ci => ci.UserId == userId && ci.VariantId == variantId);
            var item = results.FirstOrDefault();

            if (item != null)
            {
                _cartRepo.Remove(item);
                await _uow.CompleteAsync();
            }
        }

        public async Task SyncCartAsync(List<CartRequestDto> guestCart, string userId)
        {
            if (guestCart == null || !guestCart.Any()) return;

            var variantIds = guestCart.Select(x => x.VariantId).ToList();
            var variantsResults = await _variantRepo.FindAsync(v => variantIds.Contains(v.Id));
            var variants = variantsResults.ToDictionary(v => v.Id);

            foreach (var item in guestCart)
            {
                if (!variants.TryGetValue(item.VariantId, out var variant)) continue;

                var existingResults = await _cartRepo.FindAsync(ci => ci.UserId == userId && ci.VariantId == item.VariantId);
                var existingItem = existingResults.FirstOrDefault();

                int requestedTotal = (existingItem?.Quantity ?? 0) + item.Quantity;
                int finalQuantity = Math.Min(requestedTotal, variant.Stock);

                if (existingItem != null)
                {
                    existingItem.Quantity = finalQuantity;
                    existingItem.UpdatedAt = DateTime.UtcNow;
                    _cartRepo.Update(existingItem);
                }
                else if (finalQuantity > 0)
                {
                    await _cartRepo.AddAsync(new CartItem
                    {
                        UserId = userId,
                        ProductId = item.ProductId,
                        VariantId = item.VariantId,
                        Quantity = finalQuantity
                    });
                }
            }

            await _uow.CompleteAsync();
        }
    }
}
