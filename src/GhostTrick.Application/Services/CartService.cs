using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Application.Services
{
    public class CartService : ICartService
    {
        private readonly IGhostTrickContext _context;

        public CartService(IGhostTrickContext context)
        {
            _context = context;
        }

        public async Task<List<CartItemResponseDto>> GetCartAsync(string userId)
        {
            var now = DateTime.UtcNow;
            var cartItems = await _context.CartItems
                .Where(ci => ci.UserId == userId)
                .Include(ci => ci.Product)
                .Include(ci => ci.Variant).ThenInclude(v => v.Color)
                .OrderBy(ci => ci.CreatedAt) // Process older items first for greedy allocation
                .ToListAsync();

            var result = new List<CartItemResponseDto>();
            var productSaleCache = new Dictionary<int, SaleEventProduct?>();
            var productPurchasedCount = new Dictionary<int, int>();
            var cartRunningCount = new Dictionary<int, int>();

            foreach (var ci in cartItems)
            {
                if (!productSaleCache.ContainsKey(ci.ProductId))
                {
                    var activeSale = await _context.SaleEventProducts
                        .Include(sp => sp.SaleEvent)
                        .FirstOrDefaultAsync(sp => 
                            sp.ProductId == ci.ProductId &&
                            sp.SaleEvent!.IsActive &&
                            !sp.SaleEvent.IsDeleted &&
                            sp.SaleEvent.StartTime <= now &&
                            sp.SaleEvent.EndTime >= now);
                    
                    productSaleCache[ci.ProductId] = activeSale;
                }

                var activeSaleProduct = productSaleCache[ci.ProductId];
                
                decimal price = ci.Product!.Price;
                if (activeSaleProduct != null && activeSaleProduct.FlashStock > 0)
                {
                    // As long as there is flash stock, apply the sale price
                    // We don't split the price here anymore because the user wants unlimited purchases per user
                    // The actual stock deduction happens at checkout
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
                    PurchasedInSaleCount = 0, // Not used anymore
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
            var variant = await _context.ProductVariants
                .FirstOrDefaultAsync(v => v.Id == request.VariantId);

            if (variant == null) throw new KeyNotFoundException("Sản phẩm không tồn tại.");

            var existingItem = await _context.CartItems
                .FirstOrDefaultAsync(ci => ci.UserId == userId && ci.VariantId == request.VariantId);

            int newTotalQuantity = (existingItem?.Quantity ?? 0) + request.Quantity;

            if (newTotalQuantity > variant.Stock)
                throw new InvalidOperationException($"Chỉ còn {variant.Stock} sản phẩm trong kho.");

            if (existingItem != null)
            {
                existingItem.Quantity = newTotalQuantity;
                existingItem.UpdatedAt = DateTime.UtcNow;
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
                _context.CartItems.Add(cartItem);
            }

            await _context.SaveChangesAsync();
        }

        public async Task RemoveFromCartAsync(int variantId, string userId)
        {
            var item = await _context.CartItems
                .FirstOrDefaultAsync(ci => ci.UserId == userId && ci.VariantId == variantId);

            if (item != null)
            {
                _context.CartItems.Remove(item);
                await _context.SaveChangesAsync();
            }
        }

        public async Task SyncCartAsync(List<CartRequestDto> guestCart, string userId)
        {
            if (guestCart == null || !guestCart.Any()) return;

            var variantIds = guestCart.Select(x => x.VariantId).ToList();
            var variants = await _context.ProductVariants
                .Where(v => variantIds.Contains(v.Id))
                .ToDictionaryAsync(v => v.Id);

            foreach (var item in guestCart)
            {
                if (!variants.TryGetValue(item.VariantId, out var variant)) continue;

                var existingItem = await _context.CartItems
                    .FirstOrDefaultAsync(ci => ci.UserId == userId && ci.VariantId == item.VariantId);

                int requestedTotal = (existingItem?.Quantity ?? 0) + item.Quantity;
                int finalQuantity = Math.Min(requestedTotal, variant.Stock);

                if (existingItem != null)
                {
                    existingItem.Quantity = finalQuantity;
                    existingItem.UpdatedAt = DateTime.UtcNow;
                }
                else if (finalQuantity > 0)
                {
                    _context.CartItems.Add(new CartItem
                    {
                        UserId = userId,
                        ProductId = item.ProductId,
                        VariantId = item.VariantId,
                        Quantity = finalQuantity
                    });
                }
            }

            await _context.SaveChangesAsync();
        }
    }
}
