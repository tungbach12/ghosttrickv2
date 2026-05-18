using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Application.Services
{
    public class CatalogService : ICatalogService
    {
        private readonly IGenericRepository<Category> _categoryRepo;
        private readonly IGenericRepository<Product> _productRepo;
        private readonly IGenericRepository<ProductColor> _colorRepo;
        private readonly IGenericRepository<Policy> _policyRepo;
        private readonly IUnitOfWork _uow;

        public CatalogService(
            IGenericRepository<Category> categoryRepo,
            IGenericRepository<Product> productRepo,
            IGenericRepository<ProductColor> colorRepo,
            IGenericRepository<Policy> policyRepo,
            IUnitOfWork uow)
        {
            _categoryRepo = categoryRepo;
            _productRepo = productRepo;
            _colorRepo = colorRepo;
            _policyRepo = policyRepo;
            _uow = uow;
        }

        public async Task<List<Category>> GetCategoriesAsync()
        {
            return (await _categoryRepo.GetAsync()).ToList();
        }

        public async Task<Category> CreateCategoryAsync(Category category)
        {
            category.Name = category.Name?.Trim();
            category.Slug = category.Slug?.Trim().ToLowerInvariant();

            // Check if there is an existing category (including soft-deleted ones) with the same Slug
            var existingBySlugList = await _categoryRepo.GetAsync(q => q.IgnoreQueryFilters().Where(c => c.Slug == category.Slug));
            var existingBySlug = existingBySlugList.FirstOrDefault();

            if (existingBySlug != null)
            {
                if (existingBySlug.IsDeleted)
                {
                    // Restore it!
                    existingBySlug.IsDeleted = false;
                    existingBySlug.Name = category.Name;
                    existingBySlug.Description = category.Description;
                    existingBySlug.UpdatedAt = DateTime.UtcNow;
                    _categoryRepo.Update(existingBySlug);
                    await _uow.CompleteAsync();
                    return existingBySlug;
                }
                else
                {
                    throw new InvalidOperationException("Đường dẫn (Slug) này đã tồn tại và đang hoạt động.");
                }
            }

            // Check if there is an existing category (including soft-deleted ones) with the same Name
            var existingByNameList = await _categoryRepo.GetAsync(q => q.IgnoreQueryFilters().Where(c => c.Name.ToLower() == category.Name.ToLower()));
            var existingByName = existingByNameList.FirstOrDefault();

            if (existingByName != null)
            {
                if (existingByName.IsDeleted)
                {
                    // Restore it!
                    existingByName.IsDeleted = false;
                    existingByName.Slug = category.Slug;
                    existingByName.Description = category.Description;
                    existingByName.UpdatedAt = DateTime.UtcNow;
                    _categoryRepo.Update(existingByName);
                    await _uow.CompleteAsync();
                    return existingByName;
                }
                else
                {
                    throw new InvalidOperationException("Tên danh mục này đã tồn tại.");
                }
            }

            await _categoryRepo.AddAsync(category);
            await _uow.CompleteAsync();
            return category;
        }

        public async Task DeleteCategoryAsync(int id)
        {
            var category = await _categoryRepo.GetByIdAsync(id);
            if (category == null) return;

            // Kiểm tra xem còn sản phẩm nào thuộc danh mục này không (bao gồm cả sản phẩm đã xóa nếu cần, 
            // nhưng chuyên nghiệp nhất là kiểm tra sản phẩm hiện hữu)
            var hasProducts = (await _productRepo.FindAsync(p => p.CategoryId == id && !p.IsDeleted)).Any();
            if (hasProducts)
            {
                throw new InvalidOperationException("Không thể xóa danh mục này vì vẫn còn sản phẩm bên trong. Vui lòng chuyển sản phẩm sang danh mục khác hoặc xóa sản phẩm trước.");
            }

            category.IsDeleted = true;
            _categoryRepo.Update(category);
            await _uow.CompleteAsync();
        }

        public async Task<List<ProductColor>> GetColorsAsync()
        {
            return (await _colorRepo.GetAsync()).ToList();
        }

        public async Task<ProductColor> CreateColorAsync(ProductColor color)
        {
            await _colorRepo.AddAsync(color);
            await _uow.CompleteAsync();
            return color;
        }

        public async Task DeleteColorAsync(int id)
        {
            var color = await _colorRepo.GetByIdAsync(id);
            if (color != null)
            {
                color.IsDeleted = true;
                _colorRepo.Update(color);
                await _uow.CompleteAsync();
            }
        }

        public async Task<List<Policy>> GetPoliciesAsync()
        {
            return (await _policyRepo.GetAsync()).ToList();
        }

        public async Task<Policy> GetPolicyBySlugAsync(string slug)
        {
            var results = await _policyRepo.FindAsync(p => p.Slug == slug);
            var policy = results.FirstOrDefault();
            if (policy == null) throw new KeyNotFoundException("Policy not found.");
            return policy;
        }

        public async Task<Policy> UpdatePolicyAsync(string slug, Policy policy)
        {
            var results = await _policyRepo.FindAsync(p => p.Slug == slug);
            var existing = results.FirstOrDefault();
            if (existing == null) throw new KeyNotFoundException("Policy not found.");

            existing.Title = policy.Title;
            existing.Content = policy.Content;
            _policyRepo.Update(existing);
            await _uow.CompleteAsync();
            return existing;
        }
    }
}
