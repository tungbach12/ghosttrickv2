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
                .Include(ci => ci.Product!.SaleEventProducts).ThenInclude(sp => sp.SaleEvent) // Pre-load sales
                .OrderBy(ci => ci.CreatedAt)
            );

            var result = new List<CartItemResponseDto>();

            foreach (var ci in cartItems)
            {
                // Logic check active sale from pre-loaded data instead of extra DB call
                var activeSaleProduct = ci.Product?.SaleEventProducts?
                    .Where(sp => sp.SaleEvent != null && sp.SaleEvent.IsActive && !sp.SaleEvent.IsDeleted &&
                                 sp.SaleEvent.StartTime <= now && sp.SaleEvent.EndTime >= now)
                    .FirstOrDefault();
                
                decimal price = ci.Product!.Price;
                bool hasFlashSale = activeSaleProduct != null && activeSaleProduct.FlashStock > 0;
                
                if (hasFlashSale)
                {
                    price = activeSaleProduct!.SalePrice;
                }

                result.Add(new CartItemResponseDto
                {
                    VariantId = ci.VariantId,
                    ProductId = ci.ProductId,
                    Name = ci.Product!.Name,
                    Price = price,
                    SalePrice = hasFlashSale ? activeSaleProduct!.SalePrice : null,
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
            var variant = await _variantRepo.FindAsync(
                v => v.Id == request.VariantId,
                q => q.Include(v => v.Product)
            );
            var vEntity = variant.FirstOrDefault();
            if (vEntity == null) throw new KeyNotFoundException("Sản phẩm không tồn tại.");

            if (vEntity.Product?.Status != ProductStatus.Active)
                throw new InvalidOperationException("Sản phẩm này hiện không còn kinh doanh.");

            if (vEntity.Stock <= 0)
                throw new InvalidOperationException($"Size {vEntity.Size} của sản phẩm này hiện đã hết hàng.");

            var existingResults = await _cartRepo.FindAsync(ci => ci.UserId == userId && ci.VariantId == request.VariantId);
            var existingItem = existingResults.FirstOrDefault();

            int newTotalQuantity = (existingItem?.Quantity ?? 0) + request.Quantity;

            if (newTotalQuantity > vEntity.Stock)
                throw new InvalidOperationException($"Chỉ còn {vEntity.Stock} sản phẩm trong kho.");

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
