using GhostTrick.Domain.Entities;

namespace GhostTrick.Application.Interfaces
{
    public interface ICatalogService
    {
        // Categories
        Task<List<Category>> GetCategoriesAsync();
        Task<Category> CreateCategoryAsync(Category category);
        Task DeleteCategoryAsync(int id);

        // Colors
        Task<List<ProductColor>> GetColorsAsync();
        Task<ProductColor> CreateColorAsync(ProductColor color);
        Task DeleteColorAsync(int id);
        
        // Policies
        Task<List<Policy>> GetPoliciesAsync();
        Task<Policy> GetPolicyBySlugAsync(string slug);
        Task<Policy> UpdatePolicyAsync(string slug, Policy policy);
    }
}
