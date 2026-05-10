using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Application.Services
{
    public class ProductService : IProductService
    {
        private readonly IGhostTrickContext _context;
        private readonly IPhotoService _photoService;

        public ProductService(IGhostTrickContext context, IPhotoService photoService)
        {
            _context = context;
            _photoService = photoService;
        }

        public async Task<PagedResult<ProductListDto>> GetProductsAsync(string? category, string? sort, bool? onSale, string? q, string? status, decimal? minPrice, decimal? maxPrice, string? stockStatus, int page, int pageSize, bool isAdmin)
        {
            var query = _context.Products
                .Include(p => p.Category)
                .Include(p => p.Variants).ThenInclude(v => v.Color)
                .Include(p => p.SaleEventProducts).ThenInclude(sp => sp.SaleEvent)
                .AsQueryable();
 
            if (status == "Deleted")
            {
                query = _context.Products.IgnoreQueryFilters()
                    .Include(p => p.Category)
                    .Include(p => p.Variants).ThenInclude(v => v.Color)
                    .Include(p => p.SaleEventProducts).ThenInclude(sp => sp.SaleEvent)
                    .Where(p => p.IsDeleted);
            }
            else if (!isAdmin)
            {
                query = query.Where(p => p.Status == ProductStatus.Active);
            }
            else if (!string.IsNullOrEmpty(status))
            {
                if (Enum.TryParse<ProductStatus>(status, true, out var productStatus))
                {
                    query = query.Where(p => p.Status == productStatus);
                }
            }
 
            if (!string.IsNullOrEmpty(category))
                query = query.Where(p => p.Category!.Slug == category);
 
            if (onSale == true)
                query = query.Where(p => p.IsOnSale);
 
            if (!string.IsNullOrEmpty(q))
                query = query.Where(p => p.Name.Contains(q) || p.SKU.Contains(q));
 
            if (minPrice.HasValue)
                query = query.Where(p => p.Price >= minPrice.Value);
 
            if (maxPrice.HasValue)
                query = query.Where(p => p.Price <= maxPrice.Value);
 
            // Calculate global stats for this view (respecting filters except stockStatus)
            var total = await query.CountAsync();
            var outOfStockCount = await query.CountAsync(p => !p.Variants.Any(v => v.Stock > 0));
            var lowStockCount = await query.CountAsync(p => p.Variants.Any(v => v.Stock > 0 && v.Stock <= v.LowStockThreshold));

            if (!string.IsNullOrEmpty(stockStatus))
            {
                switch (stockStatus.ToLower())
                {
                    case "instock":
                        query = query.Where(p => p.Variants.Any(v => v.Stock > 0));
                        break;
                    case "outofstock":
                        query = query.Where(p => !p.Variants.Any(v => v.Stock > 0));
                        break;
                    case "lowstock":
                        query = query.Where(p => p.Variants.Any(v => v.Stock <= v.LowStockThreshold));
                        break;
                }
            }

            query = sort switch
            {
                "price-asc" => query.OrderBy(p => p.Price),
                "price-desc" => query.OrderByDescending(p => p.Price),
                "name-asc" => query.OrderBy(p => p.Name),
                "name-desc" => query.OrderByDescending(p => p.Name),
                "newest" => query.OrderByDescending(p => p.CreatedAt),
                "best-sellers" => query.OrderByDescending(p => p.ManualSalesCount ?? p.ActualSalesCount),
                "best-sellers-actual" when isAdmin => query.OrderByDescending(p => p.ActualSalesCount),
                _ => query.OrderByDescending(p => p.CreatedAt)
            };

            var filteredTotal = await query.CountAsync();
            var products = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<ProductListDto>
            {
                Items = products.Select(MapToListDto).ToList(),
                TotalCount = filteredTotal,
                Page = page,
                PageSize = pageSize,
                LowStockCount = lowStockCount,
                OutOfStockCount = outOfStockCount
            };
        }

        public async Task<List<ProductListDto>> GetBestSellersAsync(int top)
        {
            var products = await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Variants).ThenInclude(v => v.Color)
                .Include(p => p.SaleEventProducts).ThenInclude(sp => sp.SaleEvent)
                .OrderByDescending(p => p.ManualSalesCount ?? p.ActualSalesCount)
                .Take(top)
                .ToListAsync();

            return products.Select(MapToListDto).ToList();
        }

        public async Task<List<ProductListDto>> GetNewArrivalsAsync(int top)
        {
            var products = await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Variants).ThenInclude(v => v.Color)
                .Include(p => p.SaleEventProducts).ThenInclude(sp => sp.SaleEvent)
                .OrderByDescending(p => p.CreatedAt)
                .Take(top)
                .ToListAsync();

            return products.Select(MapToListDto).ToList();
        }

        public async Task<ProductDetailDto> GetProductAsync(int id, bool isAdmin, string? userId = null)
        {
            var product = await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Variants).ThenInclude(v => v.Color)
                .Include(p => p.Images.OrderBy(i => i.SortOrder))
                .Include(p => p.SaleEventProducts).ThenInclude(sp => sp.SaleEvent)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (product == null) throw new KeyNotFoundException("Sản phẩm không tồn tại.");

            if (!isAdmin && product.Status != ProductStatus.Active)
                throw new KeyNotFoundException("Sản phẩm không khả dụng.");

            var dto = MapToDetailDto(product);

            if (!string.IsNullOrEmpty(userId))
            {
                var eligibleOrder = await _context.Orders
                    .Where(o => o.UserId == userId && o.Status == OrderStatus.Delivered && o.Items.Any(i => i.ProductId == id))
                    .OrderByDescending(o => o.CreatedAt)
                    .FirstOrDefaultAsync();

                if (eligibleOrder != null)
                {
                    dto.IsEligibleToReview = true;
                    dto.EligibleOrderId = eligibleOrder.Id;
                }
            }

            return dto;
        }


        public async Task<ProductDetailDto> CreateProductAsync(CreateProductDto dto)
        {
            string? mainImageUrl = null;
            if (dto.MainImage != null)
            {
                var result = await _photoService.AddPhotoAsync(dto.MainImage);
                if (result.Error != null) throw new InvalidOperationException(result.Error);
                mainImageUrl = result.Url;
            }

            var product = new Product
            {
                Name = dto.Name,
                Description = dto.Description,
                SKU = dto.SKU,
                Price = dto.Price,
                OriginalPrice = dto.OriginalPrice,
                MainImageUrl = mainImageUrl,
                CategoryId = dto.CategoryId,
                Subcategory = dto.Subcategory,
                IsOnSale = dto.IsOnSale,
                IsNewArrival = dto.IsNewArrival,
                IsTrending = dto.IsTrending,
                ManualSalesCount = dto.ManualSalesCount,
                Status = Enum.TryParse<ProductStatus>(dto.Status, true, out var s) ? s : ProductStatus.Active,
                Variants = dto.Variants.Select(v => new ProductVariant
                {
                    ColorId = v.ColorId,
                    Size = v.Size.Trim(),
                    Stock = v.Stock,
                    LowStockThreshold = v.LowStockThreshold
                }).ToList()
            };

            if (dto.OtherImages != null && dto.OtherImages.Any())
            {
                foreach (var file in dto.OtherImages)
                {
                    var result = await _photoService.AddPhotoAsync(file);
                    if (result.Error == null)
                    {
                        product.Images.Add(new ProductImage { ImageUrl = result.Url });
                    }
                }
            }

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            return MapToDetailDto(product);
        }

        public async Task<ProductDetailDto> UpdateProductAsync(int id, CreateProductDto dto)
        {
            var product = await _context.Products
                .Include(p => p.Variants).ThenInclude(v => v.Color)
                .Include(p => p.Images)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (product == null) throw new KeyNotFoundException("Sản phẩm không tồn tại.");

            if (dto.MainImage != null)
            {
                var result = await _photoService.AddPhotoAsync(dto.MainImage);
                if (result.Error != null) throw new InvalidOperationException(result.Error);
                product.MainImageUrl = result.Url;
            }

            product.Name = dto.Name;
            product.Description = dto.Description;
            product.SKU = dto.SKU;
            product.Price = dto.Price;
            product.OriginalPrice = dto.OriginalPrice;
            product.CategoryId = dto.CategoryId;
            product.Subcategory = dto.Subcategory;
            product.IsOnSale = dto.IsOnSale;
            product.IsNewArrival = dto.IsNewArrival;
            product.IsTrending = dto.IsTrending;
            product.ManualSalesCount = dto.ManualSalesCount;
            product.Status = Enum.TryParse<ProductStatus>(dto.Status, true, out var updatedS) ? updatedS : product.Status;
            product.UpdatedAt = DateTime.UtcNow;

            // Sync Variants
            var currentVariants = product.Variants.ToList();
            var incomingVariants = dto.Variants ?? new List<CreateVariantDto>();

            foreach (var vDto in incomingVariants)
            {
                var existing = currentVariants.FirstOrDefault(v => 
                    v.ColorId == vDto.ColorId && 
                    v.Size.Trim().Equals(vDto.Size.Trim(), StringComparison.OrdinalIgnoreCase));

                if (existing != null)
                {
                    existing.Stock = vDto.Stock;
                    existing.LowStockThreshold = vDto.LowStockThreshold;
                    currentVariants.Remove(existing);
                }
                else
                {
                    product.Variants.Add(new ProductVariant
                    {
                        ColorId = vDto.ColorId,
                        Size = vDto.Size.Trim(),
                        Stock = vDto.Stock,
                        LowStockThreshold = vDto.LowStockThreshold,
                        ProductId = product.Id
                    });
                }
            }

            foreach (var toDelete in currentVariants)
            {
                bool isReferenced = await _context.OrderItems.AnyAsync(oi => oi.VariantId == toDelete.Id) ||
                                  await _context.CartItems.AnyAsync(ci => ci.VariantId == toDelete.Id);
                
                if (!isReferenced) _context.ProductVariants.Remove(toDelete);
                else toDelete.Stock = 0;
            }

            // Sync Images (for update)
            var imagesToRemove = product.Images
                .Where(img => !dto.ExistingImages.Contains(img.ImageUrl))
                .ToList();

            foreach (var img in imagesToRemove)
            {
                product.Images.Remove(img);
                _context.ProductImages.Remove(img);
            }

            if (dto.OtherImages != null && dto.OtherImages.Any())
            {
                foreach (var file in dto.OtherImages)
                {
                    var result = await _photoService.AddPhotoAsync(file);
                    if (result.Error == null)
                    {
                        product.Images.Add(new ProductImage { ImageUrl = result.Url, ProductId = product.Id });
                    }
                }
            }


            await _context.SaveChangesAsync();
            return MapToDetailDto(product);
        }

        public async Task UpdateStatusAsync(int id, string status)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) throw new KeyNotFoundException("Product not found");

            if (Enum.TryParse<ProductStatus>(status, true, out var s))
            {
                product.Status = s;
                await _context.SaveChangesAsync();
            }
            else
            {
                throw new InvalidOperationException("Invalid status");
            }
        }

        public async Task DeleteProductAsync(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) throw new KeyNotFoundException("Sản phẩm không tồn tại.");

            product.IsDeleted = true;
            await _context.SaveChangesAsync();
        }

        private ProductListDto MapToListDto(Product p)
        {
            var price = p.Price;
            var isOnSale = false;
            int? flashStock = null;
            int? soldCount = null;

            // Find active flash sale
            var activeSaleProduct = p.SaleEventProducts
                .Where(sp => sp.SaleEvent != null && sp.SaleEvent.IsActive && !sp.SaleEvent.IsDeleted &&
                             sp.SaleEvent.StartTime <= DateTime.UtcNow && sp.SaleEvent.EndTime >= DateTime.UtcNow)
                .FirstOrDefault();

            if (activeSaleProduct != null)
            {
                // Calculate dynamic sold count for this specific sale event period
                var saleStartUtc = activeSaleProduct.SaleEvent!.StartTime.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(activeSaleProduct.SaleEvent.StartTime, DateTimeKind.Utc)
                    : activeSaleProduct.SaleEvent.StartTime.ToUniversalTime();
                var saleEndUtc = activeSaleProduct.SaleEvent.EndTime.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(activeSaleProduct.SaleEvent.EndTime, DateTimeKind.Utc)
                    : activeSaleProduct.SaleEvent.EndTime.ToUniversalTime();

                var dynamicSoldCount = _context.OrderItems
                    .Where(oi => oi.ProductId == p.Id &&
                                 oi.Order!.CreatedAt >= saleStartUtc &&
                                 oi.Order.CreatedAt <= saleEndUtc &&
                                 !oi.Order.IsDeleted &&
                                 (oi.Order.Status == OrderStatus.Pending ||
                                  oi.Order.Status == OrderStatus.Confirmed ||
                                  oi.Order.Status == OrderStatus.Processing ||
                                  oi.Order.Status == OrderStatus.Shipping ||
                                  oi.Order.Status == OrderStatus.Delivered) &&
                                 oi.UnitPrice < p.Price)
                    .Sum(oi => (int?)oi.Quantity) ?? 0;

                if (dynamicSoldCount < activeSaleProduct.FlashStock)
                {
                    price = activeSaleProduct.SalePrice;
                    isOnSale = true;
                }
                
                flashStock = activeSaleProduct.FlashStock;
                soldCount = dynamicSoldCount;
            }

            return new ProductListDto
            {
                Id = p.Id,
                Name = p.Name,
                SKU = p.SKU,
                Price = price,
                OriginalPrice = p.OriginalPrice,
                MainImageUrl = p.MainImageUrl,
                CategorySlug = p.Category?.Slug,
                Subcategory = p.Subcategory,
                ActualSalesCount = p.ActualSalesCount,
                ManualSalesCount = p.ManualSalesCount,
                SalesCount = p.ManualSalesCount ?? p.ActualSalesCount,
                CategoryId = p.CategoryId,
                IsOnSale = isOnSale,
                IsNewArrival = p.IsNewArrival,
                IsTrending = p.IsTrending,
                Status = p.Status.ToString(),
                IsDeleted = p.IsDeleted,
                TotalStock = p.Variants.Sum(v => v.Stock),
                FlashStock = flashStock,
                SoldCount = soldCount,
                Colors = p.Variants
                    .Where(v => v.Color != null)
                    .Select(v => v.Color!)
                    .GroupBy(c => c.Id)
                    .Select(g => new ProductColorDto
                    {
                        Id = g.Key,
                        Name = g.First().Name,
                        HexCode = g.First().HexCode
                    }).ToList()
            };
        }

        private ProductDetailDto MapToDetailDto(Product product)
        {
            var dto = MapToListDto(product);
            return new ProductDetailDto
            {
                Id = dto.Id,
                Name = dto.Name,
                SKU = dto.SKU,
                Price = dto.Price,
                OriginalPrice = dto.OriginalPrice,
                MainImageUrl = dto.MainImageUrl,
                CategorySlug = dto.CategorySlug,
                Subcategory = dto.Subcategory,
                ActualSalesCount = dto.ActualSalesCount,
                ManualSalesCount = dto.ManualSalesCount,
                SalesCount = dto.SalesCount,
                CategoryId = dto.CategoryId,
                IsOnSale = dto.IsOnSale,
                IsNewArrival = dto.IsNewArrival,
                IsTrending = dto.IsTrending,
                Status = dto.Status,
                TotalStock = dto.TotalStock,
                FlashStock = dto.FlashStock,
                SoldCount = dto.SoldCount,
                Colors = dto.Colors,
                Description = product.Description,
                CategoryName = product.Category?.Name,
                Variants = product.Variants.Select(v => new VariantDto
                {
                    Id = v.Id,
                    ColorId = v.ColorId,
                    ColorName = v.Color?.Name,
                    ColorHex = v.Color?.HexCode,
                    Size = v.Size,
                    Stock = v.Stock,
                    LowStockThreshold = v.LowStockThreshold
                }).ToList(),
                Images = product.Images.Select(i => i.ImageUrl).ToList()
            };
        }
    }
}
