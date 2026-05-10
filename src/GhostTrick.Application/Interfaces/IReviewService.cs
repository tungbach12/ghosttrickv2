using System.Collections.Generic;
using System.Threading.Tasks;
using GhostTrick.Application.DTOs;

namespace GhostTrick.Application.Interfaces
{
    public interface IReviewService
    {
        Task<List<ProductReviewDto>> GetProductReviewsAsync(int productId);
        Task<PagedResult<ProductReviewDto>> GetAllReviewsAsync(int page, int pageSize, 
            string? searchTerm = null, 
            bool? showDeleted = null,
            int? rating = null,
            bool? isFake = null,
            bool? isVerified = null,
            string? orderBy = null);
        Task<ProductReviewDto> CreateReviewAsync(CreateReviewDto dto, string? userId, bool isAdmin = false);
        Task<bool> DeleteReviewAsync(int id, string? userId = null, bool isAdmin = false);
        Task<ProductReviewDto> UpdateReviewAsync(int id, CreateReviewDto dto, string? userId = null, bool isAdmin = false);
    }
}
