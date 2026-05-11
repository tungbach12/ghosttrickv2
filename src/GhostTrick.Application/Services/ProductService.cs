using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Application.Services
{
    public class ProductService : IProductService
    {
        private readonly IGenericRepository<Product> _productRepo;
        private readonly IGenericRepository<ProductVariant> _variantRepo;
        private readonly IGenericRepository<ProductImage> _imageRepo;
        private readonly IGenericRepository<Order> _orderRepo;
        private readonly IGenericRepository<OrderItem> _orderItemRepo;
        private readonly IGenericRepository<CartItem> _cartRepo;
        private readonly IGenericRepository<Category> _categoryRepo;
        private readonly IUnitOfWork _uow;
        private readonly IPhotoService _photoService;

        public ProductService(
            IGenericRepository<Product> productRepo,
            IGenericRepository<ProductVariant> variantRepo,
            IGenericRepository<ProductImage> imageRepo,
            IGenericRepository<Order> orderRepo,
            IGenericRepository<OrderItem> orderItemRepo,
            IGenericRepository<CartItem> cartRepo,
            IGenericRepository<Category> categoryRepo,
            IUnitOfWork uow,
            IPhotoService photoService)
        {
            _productRepo = productRepo;
            _variantRepo = variantRepo;
            _imageRepo = imageRepo;
            _orderRepo = orderRepo;
            _orderItemRepo = orderItemRepo;
            _cartRepo = cartRepo;
            _categoryRepo = categoryRepo;
            _uow = uow;
            _photoService = photoService;
        }

        public async Task<PagedResult<ProductListDto>> GetProductsAsync(string? category, string? sort, bool? onSale, string? q, string? status, decimal? minPrice, decimal? maxPrice, string? stockStatus, int page, int pageSize, bool isAdmin)
        {
            var (items, totalCount) = await _productRepo.GetPagedAsync(page, pageSize, query => 
            {
                query = query
                    .AsNoTracking()
                    .AsSplitQuery()
                    .Include(p => p.Category)
                    .Include(p => p.Variants).ThenInclude(v => v.Color)
                    .Include(p => p.SaleEventProducts).ThenInclude(sp => sp.SaleEvent);

                // Nếu lọc 'Deleted', ưu tiên lấy các bản ghi đã xóa (cần ignoreQueryFilters: true)
                if (isAdmin && status == "Deleted")
                {
                    query = query.Where(p => p.IsDeleted);
                }
                else if (!isAdmin)
                {
                    // Khách hàng bình thường chỉ thấy sản phẩm Active và chưa xóa
                    query = query.Where(p => p.Status == ProductStatus.Active && !p.IsDeleted);
                }
                else if (!string.IsNullOrEmpty(status))
                {
                    if (Enum.TryParse<ProductStatus>(status, true, out var productStatus))
                    {
                        query = query.Where(p => p.Status == productStatus && !p.IsDeleted);
                    }
                }
                else 
                {
                    // Admin mặc định thấy các sản phẩm chưa xóa (Active, Draft, Archived)
                    query = query.Where(p => !p.IsDeleted);
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
                    "price-asc" => query.OrderBy(p => p.Price).ThenByDescending(p => p.Id),
                    "price-desc" => query.OrderByDescending(p => p.Price).ThenByDescending(p => p.Id),
                    "name-asc" => query.OrderBy(p => p.Name).ThenByDescending(p => p.Id),
                    "name-desc" => query.OrderByDescending(p => p.Name).ThenByDescending(p => p.Id),
                    "newest" => query.OrderByDescending(p => p.CreatedAt).ThenByDescending(p => p.Id),
                    "best-sellers" => query.OrderByDescending(p => p.ManualSalesCount ?? p.ActualSalesCount).ThenByDescending(p => p.Id),
                    "best-sellers-actual" when isAdmin => query.OrderByDescending(p => p.ActualSalesCount).ThenByDescending(p => p.Id),
                    _ => query.OrderByDescending(p => p.CreatedAt).ThenByDescending(p => p.Id)
                };

                return query;
            }, ignoreQueryFilters: isAdmin && status == "Deleted");

            var dtos = new List<ProductListDto>();
            foreach (var item in items)
            {
                dtos.Add(await MapToListDto(item));
            }

            return new PagedResult<ProductListDto>
            {
                Items = dtos,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<List<ProductListDto>> GetBestSellersAsync(int top)
        {
            var products = await _productRepo.GetAsync(q => q
                .AsNoTracking()
                .AsSplitQuery()
                .Include(p => p.Category)
                .Include(p => p.Variants).ThenInclude(v => v.Color)
                .Include(p => p.SaleEventProducts).ThenInclude(sp => sp.SaleEvent)
                .Where(p => p.Status == ProductStatus.Active)
                .OrderByDescending(p => p.ManualSalesCount ?? p.ActualSalesCount)
                .ThenByDescending(p => p.Id)
                .Take(top)
            );

            var dtos = new List<ProductListDto>();
            foreach (var p in products)
            {
                dtos.Add(await MapToListDto(p));
            }
            return dtos;
        }

        public async Task<List<ProductListDto>> GetNewArrivalsAsync(int top)
        {
            var products = await _productRepo.GetAsync(q => q
                .AsNoTracking()
                .AsSplitQuery()
                .Include(p => p.Category)
                .Include(p => p.Variants).ThenInclude(v => v.Color)
                .Include(p => p.SaleEventProducts).ThenInclude(sp => sp.SaleEvent)
                .Where(p => p.Status == ProductStatus.Active)
                .OrderByDescending(p => p.CreatedAt)
                .ThenByDescending(p => p.Id)
                .Take(top)
            );

            var dtos = new List<ProductListDto>();
            foreach (var p in products)
            {
                dtos.Add(await MapToListDto(p));
            }
            return dtos;
        }

        public async Task<ProductDetailDto> GetProductAsync(int id, bool isAdmin, string? userId = null)
        {
            var result = await _productRepo.FindAsync(
                p => p.Id == id,
                q => q.AsNoTracking()
                      .AsSplitQuery()
                      .Include(p => p.Category)
                      .Include(p => p.Variants).ThenInclude(v => v.Color)
                      .Include(p => p.Images.OrderBy(i => i.SortOrder))
                      .Include(p => p.SaleEventProducts).ThenInclude(sp => sp.SaleEvent)
            );
            var product = result.FirstOrDefault();

            if (product == null) throw new KeyNotFoundException("Sản phẩm không tồn tại.");

            if (!isAdmin && product.Status != ProductStatus.Active)
                throw new KeyNotFoundException("Sản phẩm không khả dụng.");

            var dto = await MapToDetailDto(product);

            if (!string.IsNullOrEmpty(userId))
            {
                var orderResults = await _orderRepo.FindAsync(
                    o => o.UserId == userId && o.Status == OrderStatus.Delivered && o.Items!.Any(i => i.ProductId == id),
                    q => q.OrderByDescending(o => o.CreatedAt)
                );
                var eligibleOrder = orderResults.FirstOrDefault();

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
            var existingSku = await _productRepo.FindAsync(p => p.SKU == dto.SKU);
            if (existingSku.Any())
            {
                throw new InvalidOperationException($"Mã SKU '{dto.SKU}' đã tồn tại trong hệ thống. Vui lòng sử dụng mã khác.");
            }

            string? mainImageUrl = null;
            if (dto.MainImage != null)
            {
                var uploadResult = await _photoService.AddPhotoAsync(dto.MainImage);
                if (uploadResult.Error != null) throw new InvalidOperationException(uploadResult.Error);
                mainImageUrl = uploadResult.Url;
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
                    var uploadResult = await _photoService.AddPhotoAsync(file);
                    if (uploadResult.Error == null)
                    {
                        product.Images.Add(new ProductImage { ImageUrl = uploadResult.Url });
                    }
                }
            }

            await _productRepo.AddAsync(product);
            await _uow.CompleteAsync();

            return await MapToDetailDto(product);
        }

        public async Task<ProductDetailDto> UpdateProductAsync(int id, CreateProductDto dto)
        {
            var existingSku = await _productRepo.FindAsync(p => p.SKU == dto.SKU && p.Id != id);
            if (existingSku.Any())
            {
                throw new InvalidOperationException($"Mã SKU '{dto.SKU}' đã tồn tại trong hệ thống. Vui lòng sử dụng mã khác.");
            }

            var result = await _productRepo.FindAsync(
                p => p.Id == id,
                q => q.Include(p => p.Variants).ThenInclude(v => v.Color)
                      .Include(p => p.Images)
            );
            var product = result.FirstOrDefault();

            if (product == null) throw new KeyNotFoundException("Sản phẩm không tồn tại.");

            if (dto.MainImage != null)
            {
                var uploadResult = await _photoService.AddPhotoAsync(dto.MainImage);
                if (uploadResult.Error != null) throw new InvalidOperationException(uploadResult.Error);
                product.MainImageUrl = uploadResult.Url;
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
                    _variantRepo.Update(existing);
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
                var orderResults = await _orderItemRepo.FindAsync(oi => oi.VariantId == toDelete.Id);
                var cartResults = await _cartRepo.FindAsync(ci => ci.VariantId == toDelete.Id);
                bool isReferenced = orderResults.Any() || cartResults.Any();
                
                if (!isReferenced) _variantRepo.Remove(toDelete);
                else toDelete.Stock = 0;
            }

            // Sync Images
            var imagesToRemove = product.Images
                .Where(img => !dto.ExistingImages.Contains(img.ImageUrl))
                .ToList();

            foreach (var img in imagesToRemove)
            {
                product.Images.Remove(img);
                _imageRepo.Remove(img);
            }

            if (dto.OtherImages != null && dto.OtherImages.Any())
            {
                foreach (var file in dto.OtherImages)
                {
                    var uploadResult = await _photoService.AddPhotoAsync(file);
                    if (uploadResult.Error == null)
                    {
                        product.Images.Add(new ProductImage { ImageUrl = uploadResult.Url, ProductId = product.Id });
                    }
                }
            }

            _productRepo.Update(product);
            await _uow.CompleteAsync();
            return await MapToDetailDto(product);
        }

        public async Task UpdateStatusAsync(int id, string status)
        {
            var product = await _productRepo.GetByIdAsync(id);
            if (product == null) throw new KeyNotFoundException("Product not found");

            if (Enum.TryParse<ProductStatus>(status, true, out var s))
            {
                product.Status = s;
                _productRepo.Update(product);
                await _uow.CompleteAsync();
            }
            else
            {
                throw new InvalidOperationException("Invalid status");
            }
        }

        public async Task DeleteProductAsync(int id)
        {
            var product = await _productRepo.GetByIdAsync(id);
            if (product == null) throw new KeyNotFoundException("Sản phẩm không tồn tại.");

            product.IsDeleted = true;
            _productRepo.Update(product);
            await _uow.CompleteAsync();
        }

        public async Task RestoreProductAsync(int id)
        {
            // Repo query filter is active, but GetByIdAsync uses FindAsync which might respect it.
            // Let's use FindAsync with IgnoreQueryFilters if needed, but here we assume the product was soft deleted.
            var results = await _productRepo.FindAsync(p => p.Id == id);
            var product = results.FirstOrDefault();
            
            if (product == null) throw new KeyNotFoundException("Sản phẩm không tồn tại.");

            // Kiểm tra category của sản phẩm có đang bị xóa không
            var category = await _categoryRepo.GetByIdAsync(product.CategoryId);
            if (category == null || category.IsDeleted)
            {
                throw new InvalidOperationException("Không thể khôi phục sản phẩm này vì danh mục của nó đã bị xóa. Vui lòng khôi phục danh mục trước.");
            }

            product.IsDeleted = false;
            _productRepo.Update(product);
            await _uow.CompleteAsync();
        }

        private async Task<ProductListDto> MapToListDto(Product p)
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

                var soldItems = await _orderItemRepo.GetAsync(q => q
                    .Include(oi => oi.Order)
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
                );

                var dynamicSoldCount = soldItems.Sum(oi => oi.Quantity);

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
                Status = p.IsDeleted ? "Deleted" : p.Status.ToString(),
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

        private async Task<ProductDetailDto> MapToDetailDto(Product product)
        {
            var dto = await MapToListDto(product);
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
