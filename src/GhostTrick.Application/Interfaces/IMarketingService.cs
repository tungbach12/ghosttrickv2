using GhostTrick.Application.DTOs;
using GhostTrick.Domain.Entities;

namespace GhostTrick.Application.Interfaces
{
    public interface IMarketingService
    {
        // SaleEvents
        Task<List<SaleEvent>> GetSaleEventsAsync();
        Task<SaleEventResponseDto> GetSaleEventAsync(string slug);
        Task<SaleEventResponseDto> GetSaleEventByIdAsync(int id);
        Task<SaleEvent> CreateSaleEventAsync(SaleEventDto dto);
        Task<SaleEvent> UpdateSaleEventAsync(int id, SaleEventDto dto);
        Task ActivateSaleEventAsync(int id);
        Task DeleteSaleEventAsync(int id);
        Task UpdateSaleProductsAsync(int saleEventId, List<SaleEventProductInputDto> products);

        // HomeBanners
        Task<List<HomeBanner>> GetBannersAsync();
        Task<HomeBanner> CreateBannerAsync(HomeBannerDto dto);
        Task<HomeBanner> UpdateBannerAsync(int id, HomeBannerDto dto);
        Task DeleteBannerAsync(int id);
        // TopBarPromos
        Task<List<TopBarPromo>> GetTopBarPromosAsync(bool activeOnly = true);
        Task<TopBarPromo> CreateTopBarPromoAsync(TopBarPromoDto dto);
        Task<TopBarPromo> UpdateTopBarPromoAsync(int id, TopBarPromoDto dto);
        Task DeleteTopBarPromoAsync(int id);
    }
}
