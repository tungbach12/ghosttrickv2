using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Application.Services
{
    public class CatalogService : ICatalogService
    {
        private readonly IGhostTrickContext _context;

        public CatalogService(IGhostTrickContext context)
        {
            _context = context;
        }

        public async Task<List<Category>> GetCategoriesAsync()
        {
            return await _context.Categories.ToListAsync();
        }

        public async Task<Category> CreateCategoryAsync(Category category)
        {
            _context.Categories.Add(category);
            await _context.SaveChangesAsync();
            return category;
        }

        public async Task DeleteCategoryAsync(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category != null)
            {
                category.IsDeleted = true;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<List<ProductColor>> GetColorsAsync()
        {
            return await _context.ProductColors.ToListAsync();
        }

        public async Task<ProductColor> CreateColorAsync(ProductColor color)
        {
            _context.ProductColors.Add(color);
            await _context.SaveChangesAsync();
            return color;
        }

        public async Task DeleteColorAsync(int id)
        {
            var color = await _context.ProductColors.FindAsync(id);
            if (color != null)
            {
                color.IsDeleted = true;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<List<Policy>> GetPoliciesAsync()
        {
            return await _context.Policies.ToListAsync();
        }

        public async Task<Policy> GetPolicyBySlugAsync(string slug)
        {
            var policy = await _context.Policies.FirstOrDefaultAsync(p => p.Slug == slug);
            if (policy == null) throw new KeyNotFoundException("Policy not found.");
            return policy;
        }

        public async Task<Policy> UpdatePolicyAsync(string slug, Policy policy)
        {
            var existing = await _context.Policies.FirstOrDefaultAsync(p => p.Slug == slug);
            if (existing == null) throw new KeyNotFoundException("Policy not found.");

            existing.Title = policy.Title;
            existing.Content = policy.Content;
            await _context.SaveChangesAsync();
            return existing;
        }
    }
}
