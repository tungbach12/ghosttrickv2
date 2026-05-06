using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using GhostTrick.Infrastructure.Persistence;
using GhostTrick.Application.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductsController : ControllerBase
    {
        private readonly GhostTrickContext _context;
        private readonly IPhotoService _photoService;

        public ProductsController(GhostTrickContext context, IPhotoService photoService)
        {
            _context = context;
            _photoService = photoService;
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<ProductDetailDto>> CreateProduct([FromForm] CreateProductDto dto)
        {
            // 1. Upload Main Image to Cloudinary
            string? mainImageUrl = null;
            if (dto.MainImage != null)
            {
                var result = await _photoService.AddPhotoAsync(dto.MainImage);
                if (result.Error != null) return BadRequest(result.Error);
                mainImageUrl = result.Url;
            }

            // 2. Create Product
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
                Status = Enum.TryParse<ProductStatus>(dto.Status, true, out var s) ? s : ProductStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Variants = dto.Variants.Select(v => new ProductVariant
                {
                    Color = v.Color,
                    Size = v.Size,
                    Stock = v.Stock,
                    LowStockThreshold = v.LowStockThreshold
                }).ToList()
            };

            // 3. Upload Other Images
            if (dto.OtherImages != null && dto.OtherImages.Any())
            {
                foreach (var file in dto.OtherImages)
                {
                    var result = await _photoService.AddPhotoAsync(file);
                    if (result.Error == null)
                    {
                        product.Images.Add(new ProductImage
                        {
                            ImageUrl = result.Url,
                            IsMain = false
                        });
                    }
                }
            }

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, MapToDetailDto(product));
        }

        private static ProductDetailDto MapToDetailDto(Product product)
        {
            return new ProductDetailDto
            {
                Id = product.Id,
                Name = product.Name,
                SKU = product.SKU,
                Description = product.Description,
                Price = product.Price,
                OriginalPrice = product.OriginalPrice,
                MainImageUrl = product.MainImageUrl,
                CategorySlug = product.Category?.Slug,
                CategoryName = product.Category?.Name,
                Subcategory = product.Subcategory,
                SalesCount = product.SalesCount,
                IsOnSale = product.IsOnSale,
                IsNewArrival = product.IsNewArrival,
                IsTrending = product.IsTrending,
                Status = product.Status.ToString(),
                Colors = product.Variants.Select(v => v.Color).Distinct().ToList(),
                Variants = product.Variants.Select(v => new VariantDto
                {
                    Id = v.Id,
                    Color = v.Color,
                    Size = v.Size,
                    Stock = v.Stock
                }).ToList(),
                Images = product.Images.Select(i => i.ImageUrl).ToList()
            };
        }

        /// <summary>
        /// GET /api/products?category=tops&sort=price-asc&page=1&pageSize=12&onSale=true
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<PagedResult<ProductListDto>>> GetProducts(
            [FromQuery] string? category = null,
            [FromQuery] string? sort = null,
            [FromQuery] bool? onSale = null,
            [FromQuery] string? q = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = _context.Products
                .Include(p => p.Category)
                .Include(p => p.Variants)
                .AsQueryable();

            if (!User.IsInRole("Admin"))
            {
                query = query.Where(p => p.Status == ProductStatus.Active);
            }

            if (!string.IsNullOrEmpty(category))
                query = query.Where(p => p.Category!.Slug == category);

            if (onSale == true)
                query = query.Where(p => p.IsOnSale);

            if (!string.IsNullOrEmpty(q))
                query = query.Where(p => p.Name.Contains(q));

            query = sort switch
            {
                "price-asc" => query.OrderBy(p => p.Price),
                "price-desc" => query.OrderByDescending(p => p.Price),
                "name-asc" => query.OrderBy(p => p.Name),
                "name-desc" => query.OrderByDescending(p => p.Name),
                "newest" => query.OrderByDescending(p => p.CreatedAt),
                "best-sellers" => query.OrderByDescending(p => p.SalesCount),
                _ => query.OrderByDescending(p => p.CreatedAt)
            };

            var total = await query.CountAsync();
            var products = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new PagedResult<ProductListDto>
            {
                Items = products.Select(MapToListDto).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            });
        }

        /// <summary>GET /api/products/best-sellers?top=8</summary>
        [HttpGet("best-sellers")]
        public async Task<ActionResult<List<ProductListDto>>> GetBestSellers([FromQuery] int top = 8)
        {
            var products = await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Variants)
                .OrderByDescending(p => p.SalesCount)
                .Take(top)
                .ToListAsync();

            return Ok(products.Select(MapToListDto));
        }

        /// <summary>GET /api/products/new-arrivals?top=8</summary>
        [HttpGet("new-arrivals")]
        public async Task<ActionResult<List<ProductListDto>>> GetNewArrivals([FromQuery] int top = 8)
        {
            var products = await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Variants)
                .OrderByDescending(p => p.CreatedAt)
                .Take(top)
                .ToListAsync();

            return Ok(products.Select(MapToListDto));
        }

        /// <summary>PUT /api/products/{id} — (Admin only) update product</summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<ProductDetailDto>> UpdateProduct(int id, [FromForm] CreateProductDto dto)
        {
            var product = await _context.Products
                .Include(p => p.Variants)
                .Include(p => p.Images)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (product == null) return NotFound(new { message = "Sản phẩm không tồn tại." });

            // 1. Update Main Image if provided
            if (dto.MainImage != null)
            {
                var result = await _photoService.AddPhotoAsync(dto.MainImage);
                if (result.Error != null) return BadRequest(result.Error);
                product.MainImageUrl = result.Url;
            }

            // 2. Update Fields
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
            product.Status = Enum.TryParse<ProductStatus>(dto.Status, true, out var updatedS) ? updatedS : product.Status;
            product.UpdatedAt = DateTime.UtcNow;

            // 3. Update Variants (simple way: clear and re-add)
            _context.ProductVariants.RemoveRange(product.Variants);
            product.Variants = dto.Variants.Select(v => new ProductVariant
            {
                Color = v.Color,
                Size = v.Size,
                Stock = v.Stock,
                LowStockThreshold = v.LowStockThreshold
            }).ToList();

            // 4. Upload Other Images
            if (dto.OtherImages != null && dto.OtherImages.Any())
            {
                foreach (var file in dto.OtherImages)
                {
                    var result = await _photoService.AddPhotoAsync(file);
                    if (result.Error == null)
                    {
                        product.Images.Add(new ProductImage
                        {
                            ImageUrl = result.Url,
                            IsMain = false
                        });
                    }
                }
            }

            await _context.SaveChangesAsync();

            return Ok(MapToDetailDto(product));
        }

        /// <summary>DELETE /api/products/{id} — (Admin only) delete product</summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound(new { message = "Sản phẩm không tồn tại." });

            product.IsDeleted = true;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>GET /api/products/{id}</summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<ProductDetailDto>> GetProduct(int id)
        {
            var product = await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Variants)
                .Include(p => p.Images.OrderBy(i => i.SortOrder))
                .FirstOrDefaultAsync(p => p.Id == id);

            if (product == null) return NotFound(new { message = "Sản phẩm không tồn tại." });

            if (!User.IsInRole("Admin") && product.Status != ProductStatus.Active)
                return NotFound(new { message = "Sản phẩm không khả dụng." });

            return Ok(MapToDetailDto(product));
        }

        // ── Helper ──────────────────────────────────────────────────────
        private static ProductListDto MapToListDto(Product p) => new()
        {
            Id = p.Id,
            Name = p.Name,
            SKU = p.SKU,
            Price = p.Price,
            OriginalPrice = p.OriginalPrice,
            MainImageUrl = p.MainImageUrl,
            CategorySlug = p.Category?.Slug,
            Subcategory = p.Subcategory,
            SalesCount = p.SalesCount,
            IsOnSale = p.IsOnSale,
            IsNewArrival = p.IsNewArrival,
            IsTrending = p.IsTrending,
            Status = p.Status.ToString(),
            TotalStock = p.Variants.Sum(v => v.Stock),
            Colors = p.Variants.Select(v => v.Color).Distinct().ToList()
        };
    }
}
