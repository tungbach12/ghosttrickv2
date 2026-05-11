using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Application.Services
{
    public class MarketingService : IMarketingService
    {
        private readonly IGenericRepository<SaleEvent> _saleRepo;
        private readonly IGenericRepository<SaleEventProduct> _saleProductRepo;
        private readonly IGenericRepository<HomeBanner> _bannerRepo;
        private readonly IGenericRepository<TopBarPromo> _topBarRepo;
        private readonly IGenericRepository<OrderItem> _orderItemRepo;
        private readonly IUnitOfWork _uow;
        private readonly IPhotoService _photoService;

        public MarketingService(
            IGenericRepository<SaleEvent> saleRepo,
            IGenericRepository<SaleEventProduct> saleProductRepo,
            IGenericRepository<HomeBanner> bannerRepo,
            IGenericRepository<TopBarPromo> topBarRepo,
            IGenericRepository<OrderItem> orderItemRepo,
            IUnitOfWork uow,
            IPhotoService photoService)
        {
            _saleRepo = saleRepo;
            _saleProductRepo = saleProductRepo;
            _bannerRepo = bannerRepo;
            _topBarRepo = topBarRepo;
            _orderItemRepo = orderItemRepo;
            _uow = uow;
            _photoService = photoService;
        }

        public async Task<List<SaleEvent>> GetSaleEventsAsync()
        {
            var result = await _saleRepo.FindAsync(s => !s.IsDeleted);
            return result.OrderByDescending(s => s.Id).ToList();
        }

        public async Task<SaleEventResponseDto> GetSaleEventAsync(string slug)
        {
            var result = await _saleRepo.FindAsync(
                s => s.Slug == slug && !s.IsDeleted,
                q => q.Include(s => s.SaleEventProducts)
                        .ThenInclude(sp => sp.Product!)
                            .ThenInclude(p => p.Variants)
                                .ThenInclude(v => v.Color!)
            );
            
            var sale = result.FirstOrDefault();
            
            if (sale == null) throw new KeyNotFoundException("Sale event not found.");
            return await MapToResponseDtoAsync(sale);
        }

        public async Task<SaleEventResponseDto> GetSaleEventByIdAsync(int id)
        {
            var result = await _saleRepo.FindAsync(
                s => s.Id == id && !s.IsDeleted,
                q => q.Include(s => s.SaleEventProducts)
                        .ThenInclude(sp => sp.Product!)
                            .ThenInclude(p => p.Variants)
                                .ThenInclude(v => v.Color!)
            );
            
            var sale = result.FirstOrDefault();
            
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

                var result = await _orderItemRepo.FindAsync(
                    oi => oi.ProductId == sp.ProductId &&
                          oi.Order!.CreatedAt >= saleStartUtc &&
                          oi.Order.CreatedAt <= saleEndUtc &&
                          !oi.Order.IsDeleted &&
                          (oi.Order.Status == OrderStatus.Pending ||
                           oi.Order.Status == OrderStatus.Confirmed || 
                           oi.Order.Status == OrderStatus.Processing || 
                           oi.Order.Status == OrderStatus.Shipping || 
                           oi.Order.Status == OrderStatus.Delivered) &&
                          oi.UnitPrice < sp.Product!.Price,
                    q => q.Include(oi => oi.Order)
                );
                var soldCount = result.Sum(oi => (int?)oi.Quantity) ?? 0;

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

            await _saleRepo.AddAsync(sale);
            await _uow.CompleteAsync();
            return sale;
        }

        public async Task<SaleEvent> UpdateSaleEventAsync(int id, SaleEventDto dto)
        {
            var result = await _saleRepo.FindAsync(s => s.Id == id && !s.IsDeleted);
            var sale = result.FirstOrDefault();
            if (sale == null) throw new KeyNotFoundException("Sale event not found.");

            if (dto.BannerFile != null)
            {
                var uploadResult = await _photoService.AddPhotoAsync(dto.BannerFile);
                sale.BannerUrl = uploadResult.Url;
            }

            sale.Name = dto.Name;
            sale.Slug = dto.Slug;
            sale.Description = dto.Description;
            sale.StartTime = dto.StartTime;
            sale.EndTime = dto.EndTime;
            sale.IsActive = dto.IsActive;

            _saleRepo.Update(sale);
            await _uow.CompleteAsync();
            return sale;
        }

        public async Task DeleteSaleEventAsync(int id)
        {
            var result = await _saleRepo.FindAsync(s => s.Id == id && !s.IsDeleted);
            var sale = result.FirstOrDefault();
            if (sale != null)
            {
                sale.IsDeleted = true;
                _saleRepo.Update(sale);
                await _uow.CompleteAsync();
            }
        }

        public async Task UpdateSaleProductsAsync(int saleEventId, List<SaleEventProductInputDto> products)
        {
            var result = await _saleRepo.FindAsync(
                s => s.Id == saleEventId,
                q => q.Include(s => s.SaleEventProducts)
            );
            var sale = result.FirstOrDefault();
            
            if (sale == null) throw new KeyNotFoundException("Sale event not found.");

            // Clear existing
            _saleProductRepo.RemoveRange(sale.SaleEventProducts);

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

            await _uow.CompleteAsync();
        }

        public async Task<List<HomeBanner>> GetBannersAsync()
        {
            var result = await _bannerRepo.FindAsync(b => !b.IsDeleted);
            return result.OrderBy(b => b.DisplayOrder).ToList();
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

            await _bannerRepo.AddAsync(banner);
            await _uow.CompleteAsync();
            return banner;
        }

        public async Task<HomeBanner> UpdateBannerAsync(int id, HomeBannerDto dto)
        {
            var result = await _bannerRepo.FindAsync(b => b.Id == id && !b.IsDeleted);
            var banner = result.FirstOrDefault();
            if (banner == null) throw new KeyNotFoundException("Banner not found.");

            if (dto.ImageFile != null)
            {
                var uploadResult = await _photoService.AddPhotoAsync(dto.ImageFile);
                banner.ImageUrl = uploadResult.Url;
            }

            banner.Title = dto.Title;
            banner.Subtitle = dto.Subtitle;
            banner.LinkUrl = dto.LinkUrl;
            banner.DisplayOrder = dto.DisplayOrder;
            banner.IsActive = dto.IsActive;

            _bannerRepo.Update(banner);
            await _uow.CompleteAsync();
            return banner;
        }

        public async Task DeleteBannerAsync(int id)
        {
            var result = await _bannerRepo.FindAsync(b => b.Id == id && !b.IsDeleted);
            var banner = result.FirstOrDefault();
            if (banner != null)
            {
                banner.IsDeleted = true;
                _bannerRepo.Update(banner);
                await _uow.CompleteAsync();
            }
        }

        public async Task<List<TopBarPromo>> GetTopBarPromosAsync(bool activeOnly = true)
        {
            var result = await _topBarRepo.FindAsync(p => !p.IsDeleted);
            var query = result.AsQueryable();
            if (activeOnly)
            {
                query = query.Where(p => p.IsActive);
            }
            return query.OrderBy(p => p.DisplayOrder).ToList();
        }

        public async Task<TopBarPromo> CreateTopBarPromoAsync(TopBarPromoDto dto)
        {
            var promo = new TopBarPromo
            {
                Content = dto.Content,
                DisplayOrder = dto.DisplayOrder,
                IsActive = dto.IsActive
            };
            await _topBarRepo.AddAsync(promo);
            await _uow.CompleteAsync();
            return promo;
        }

        public async Task<TopBarPromo> UpdateTopBarPromoAsync(int id, TopBarPromoDto dto)
        {
            var result = await _topBarRepo.FindAsync(p => p.Id == id && !p.IsDeleted);
            var promo = result.FirstOrDefault();
            if (promo == null) throw new KeyNotFoundException("Promo not found.");

            promo.Content = dto.Content;
            promo.DisplayOrder = dto.DisplayOrder;
            promo.IsActive = dto.IsActive;

            _topBarRepo.Update(promo);
            await _uow.CompleteAsync();
            return promo;
        }

        public async Task DeleteTopBarPromoAsync(int id)
        {
            var result = await _topBarRepo.FindAsync(p => p.Id == id && !p.IsDeleted);
            var promo = result.FirstOrDefault();
            if (promo != null)
            {
                promo.IsDeleted = true;
                _topBarRepo.Update(promo);
                await _uow.CompleteAsync();
            }
        }
    }
}
