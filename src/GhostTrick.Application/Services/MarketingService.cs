using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Application.Services
{
    public class MarketingService : IMarketingService
    {
        private readonly IGhostTrickContext _context;
        private readonly IPhotoService _photoService;

        public MarketingService(IGhostTrickContext context, IPhotoService photoService)
        {
            _context = context;
            _photoService = photoService;
        }

        public async Task<List<SaleEvent>> GetSaleEventsAsync()
        {
            return await _context.SaleEvents
                .Where(s => !s.IsDeleted)
                .OrderByDescending(s => s.Id)
                .ToListAsync();
        }

        public async Task<SaleEventResponseDto> GetSaleEventAsync(string slug)
        {
            var sale = await _context.SaleEvents
                .Include(s => s.SaleEventProducts)
                    .ThenInclude(sp => sp.Product)
                        .ThenInclude(p => p.Variants)
                            .ThenInclude(v => v.Color)
                .FirstOrDefaultAsync(s => s.Slug == slug && !s.IsDeleted);
            
            if (sale == null) throw new KeyNotFoundException("Sale event not found.");
            return await MapToResponseDtoAsync(sale);
        }

        public async Task<SaleEventResponseDto> GetSaleEventByIdAsync(int id)
        {
            var sale = await _context.SaleEvents
                .Include(s => s.SaleEventProducts)
                    .ThenInclude(sp => sp.Product)
                        .ThenInclude(p => p.Variants)
                            .ThenInclude(v => v.Color)
                .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
            
            if (sale == null) throw new KeyNotFoundException("Sale event not found.");
            return await MapToResponseDtoAsync(sale);
        }

        private async Task<SaleEventResponseDto> MapToResponseDtoAsync(SaleEvent sale)
        {
            var productDtos = new List<ProductListDto>();
            foreach (var sp in sale.SaleEventProducts.Where(sp => sp.Product != null && !sp.Product.IsDeleted))
            {
                // Calculate dynamic sold count from actual orders
                // Convert sale times to UTC to match Order.CreatedAt (which is DateTime.UtcNow)
                var saleStartUtc = sale.StartTime.Kind == DateTimeKind.Unspecified 
                    ? DateTime.SpecifyKind(sale.StartTime, DateTimeKind.Utc) 
                    : sale.StartTime.ToUniversalTime();
                var saleEndUtc = sale.EndTime.Kind == DateTimeKind.Unspecified 
                    ? DateTime.SpecifyKind(sale.EndTime, DateTimeKind.Utc) 
                    : sale.EndTime.ToUniversalTime();

                var soldCount = await _context.OrderItems
                    .Where(oi => oi.ProductId == sp.ProductId &&
                                 oi.Order!.CreatedAt >= saleStartUtc &&
                                 oi.Order.CreatedAt <= saleEndUtc &&
                                 !oi.Order.IsDeleted &&
                                 (oi.Order.Status == OrderStatus.Pending ||
                                  oi.Order.Status == OrderStatus.Confirmed || 
                                  oi.Order.Status == OrderStatus.Processing || 
                                  oi.Order.Status == OrderStatus.Shipping || 
                                  oi.Order.Status == OrderStatus.Delivered) &&
                                 oi.UnitPrice < sp.Product!.Price)
                    .SumAsync(oi => (int?)oi.Quantity) ?? 0;

                productDtos.Add(new ProductListDto
                {
                    Id = sp.Product!.Id,
                    Name = sp.Product.Name,
                    SKU = sp.Product.SKU,
                    Price = sp.SalePrice > 0 ? sp.SalePrice : sp.Product.Price, 
                    OriginalPrice = sp.Product.Price,
                    MainImageUrl = sp.Product.MainImageUrl,
                    IsOnSale = true,
                    FlashStock = sp.FlashStock,
                    SoldCount = soldCount, // Dynamic value
                    Colors = sp.Product.Variants
                        .Where(v => v.Color != null)
                        .Select(v => new ProductColorDto
                        {
                            Id = v.Color!.Id,
                            Name = v.Color.Name,
                            HexCode = v.Color.HexCode
                        })
                        .GroupBy(c => c.Id)
                        .Select(g => g.First())
                        .ToList()
                });
            }

            return new SaleEventResponseDto
            {
                Id = sale.Id,
                Name = sale.Name,
                Slug = sale.Slug,
                Description = sale.Description,
                BannerUrl = sale.BannerUrl,
                StartTime = sale.StartTime,
                EndTime = sale.EndTime,
                IsActive = sale.IsActive,
                Products = productDtos
            };
        }

        public async Task<SaleEvent> CreateSaleEventAsync(SaleEventDto dto)
        {
            string? bannerUrl = null;
            if (dto.BannerFile != null)
            {
                var result = await _photoService.AddPhotoAsync(dto.BannerFile);
                bannerUrl = result.Url;
            }

            var sale = new SaleEvent
            {
                Name = dto.Name,
                Slug = dto.Slug,
                Description = dto.Description,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                IsActive = dto.IsActive,
                BannerUrl = bannerUrl
            };

            _context.SaleEvents.Add(sale);
            await _context.SaveChangesAsync();
            return sale;
        }

        public async Task<SaleEvent> UpdateSaleEventAsync(int id, SaleEventDto dto)
        {
            var sale = await _context.SaleEvents.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
            if (sale == null) throw new KeyNotFoundException("Sale event not found.");

            if (dto.BannerFile != null)
            {
                var result = await _photoService.AddPhotoAsync(dto.BannerFile);
                sale.BannerUrl = result.Url;
            }

            sale.Name = dto.Name;
            sale.Slug = dto.Slug;
            sale.Description = dto.Description;
            sale.StartTime = dto.StartTime;
            sale.EndTime = dto.EndTime;
            sale.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();
            return sale;
        }

        public async Task DeleteSaleEventAsync(int id)
        {
            var sale = await _context.SaleEvents.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
            if (sale != null)
            {
                sale.IsDeleted = true;
                await _context.SaveChangesAsync();
            }
        }

        public async Task UpdateSaleProductsAsync(int saleEventId, List<SaleEventProductInputDto> products)
        {
            var sale = await _context.SaleEvents
                .Include(s => s.SaleEventProducts)
                .FirstOrDefaultAsync(s => s.Id == saleEventId);
            
            if (sale == null) throw new KeyNotFoundException("Sale event not found.");

            // Clear existing
            _context.SaleEventProducts.RemoveRange(sale.SaleEventProducts);

            // Add new with override data
            foreach (var p in products)
            {
                sale.SaleEventProducts.Add(new SaleEventProduct
                {
                    SaleEventId = saleEventId,
                    ProductId = p.ProductId,
                    SalePrice = p.SalePrice,
                    FlashStock = p.FlashStock,
                    SoldCount = 0
                });
            }

            await _context.SaveChangesAsync();
        }

        public async Task<List<HomeBanner>> GetBannersAsync()
        {
            return await _context.HomeBanners
                .Where(b => !b.IsDeleted)
                .OrderBy(b => b.DisplayOrder)
                .ToListAsync();
        }

        public async Task<HomeBanner> CreateBannerAsync(HomeBannerDto dto)
        {
            string? imageUrl = null;
            if (dto.ImageFile != null)
            {
                var result = await _photoService.AddPhotoAsync(dto.ImageFile);
                imageUrl = result.Url;
            }

            var banner = new HomeBanner
            {
                Title = dto.Title,
                Subtitle = dto.Subtitle,
                LinkUrl = dto.LinkUrl,
                DisplayOrder = dto.DisplayOrder,
                IsActive = dto.IsActive,
                ImageUrl = imageUrl
            };

            _context.HomeBanners.Add(banner);
            await _context.SaveChangesAsync();
            return banner;
        }

        public async Task<HomeBanner> UpdateBannerAsync(int id, HomeBannerDto dto)
        {
            var banner = await _context.HomeBanners.FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted);
            if (banner == null) throw new KeyNotFoundException("Banner not found.");

            if (dto.ImageFile != null)
            {
                var result = await _photoService.AddPhotoAsync(dto.ImageFile);
                banner.ImageUrl = result.Url;
            }

            banner.Title = dto.Title;
            banner.Subtitle = dto.Subtitle;
            banner.LinkUrl = dto.LinkUrl;
            banner.DisplayOrder = dto.DisplayOrder;
            banner.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();
            return banner;
        }

        public async Task DeleteBannerAsync(int id)
        {
            var banner = await _context.HomeBanners.FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted);
            if (banner != null)
            {
                banner.IsDeleted = true;
                await _context.SaveChangesAsync();
            }
        }
    }
}
