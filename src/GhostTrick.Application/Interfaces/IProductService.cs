using GhostTrick.Application.DTOs;

namespace GhostTrick.Application.Interfaces
{
    public interface IProductService
    {
        Task<PagedResult<ProductListDto>> GetProductsAsync(string? category, string? sort, bool? onSale, string? q, string? status, decimal? minPrice, decimal? maxPrice, string? stockStatus, int page, int pageSize, bool isAdmin);
        Task<List<ProductListDto>> GetBestSellersAsync(int top);
        Task<List<ProductListDto>> GetNewArrivalsAsync(int top);
        Task<ProductDetailDto> GetProductAsync(int id, bool isAdmin, string? userId = null);

        
        // Admin methods
        Task<ProductDetailDto> CreateProductAsync(CreateProductDto dto);
        Task<ProductDetailDto> UpdateProductAsync(int id, CreateProductDto dto);
        Task UpdateStatusAsync(int id, string status);
        Task DeleteProductAsync(int id);
        Task RestoreProductAsync(int id);
    }
}
