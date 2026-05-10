using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Application.Services
{
    public class ReviewService : IReviewService
    {
        private readonly IGhostTrickContext _context;

        public ReviewService(IGhostTrickContext context)
        {
            _context = context;
        }

        public async Task<List<ProductReviewDto>> GetProductReviewsAsync(int productId)
        {
            var reviews = await _context.ProductReviews
                .AsNoTracking()
                .Where(r => r.ProductId == productId && r.IsApproved)
                .Include(r => r.Order).ThenInclude(o => o.Items).ThenInclude(i => i.Variant).ThenInclude(v => v.Color)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
                
            return reviews.Select(r => MapToDto(r)).ToList();
        }


        public async Task<PagedResult<ProductReviewDto>> GetAllReviewsAsync(int page, int pageSize, 
            string? searchTerm = null, 
            bool? showDeleted = null,
            int? rating = null,
            bool? isFake = null,
            bool? isVerified = null,
            string? orderBy = null)
        {
            var query = _context.ProductReviews.IgnoreQueryFilters().AsNoTracking();

            if (showDeleted == true)
            {
                query = query.Where(r => r.IsDeleted);
            }
            else if (showDeleted == false)
            {
                query = query.Where(r => !r.IsDeleted);
            }

            if (rating.HasValue)
            {
                query = query.Where(r => r.Rating == rating.Value);
            }

            if (isFake.HasValue)
            {
                query = query.Where(r => r.IsFake == isFake.Value);
            }

            if (isVerified.HasValue)
            {
                query = query.Where(r => r.IsVerifiedPurchase == isVerified.Value);
            }

            if (!string.IsNullOrEmpty(searchTerm))
            {
                query = query.Where(r => r.UserName.Contains(searchTerm) || r.Comment.Contains(searchTerm) || (r.Product != null && r.Product.Name.Contains(searchTerm)));
            }

            if (orderBy == "oldest")
            {
                query = query.OrderBy(r => r.CreatedAt);
            }
            else
            {
                query = query.OrderByDescending(r => r.CreatedAt);
            }
            var total = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize)
                .Include(r => r.Order).ThenInclude(o => o.Items).ThenInclude(i => i.Variant).ThenInclude(v => v.Color)
                .ToListAsync();

            return new PagedResult<ProductReviewDto>
            {
                Items = items.Select(r => MapToDto(r)).ToList(),

                TotalCount = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<ProductReviewDto> CreateReviewAsync(CreateReviewDto dto, string? userId, bool isAdmin = false)
        {
            // If not admin, check if user already reviewed this product
            if (!isAdmin && !string.IsNullOrEmpty(userId))
            {
                var existingReview = await _context.ProductReviews
                    .FirstOrDefaultAsync(r => r.ProductId == dto.ProductId && r.UserId == userId && r.OrderId == dto.OrderId);

                
                if (existingReview != null)
                {
                    // Update existing instead of creating new
                    existingReview.Rating = dto.Rating;
                    existingReview.Comment = dto.Comment;
                    existingReview.UpdatedAt = DateTime.UtcNow;
                    
                    // Re-check verified purchase if not already true
                    if (!existingReview.IsVerifiedPurchase)
                    {
                        existingReview.IsVerifiedPurchase = await _context.Orders
                            .AnyAsync(o => o.UserId == userId && o.Status == OrderStatus.Delivered && o.Items.Any(i => i.ProductId == dto.ProductId));
                    }

                    await _context.SaveChangesAsync();
                    return MapToDto(existingReview);
                }
            }

            var review = new ProductReview
            {
                ProductId = dto.ProductId,
                OrderId = dto.OrderId,
                Rating = dto.Rating,
                Comment = dto.Comment,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                UserName = "Pending..." // Temporary value until set below

            };

            if (isAdmin && !string.IsNullOrEmpty(dto.FakeUserName))
            {
                review.UserName = dto.FakeUserName;
                review.UserAvatarUrl = dto.FakeAvatarUrl;
                review.IsFake = true;
                review.IsVerifiedPurchase = dto.ForceVerifiedPurchase ?? false;
            }
            else if (!string.IsNullOrEmpty(userId))
            {
                var user = await _context.Users.FindAsync(userId);
                review.UserName = user?.FullName ?? "User";
                review.UserAvatarUrl = user?.AvatarUrl;
                
                // Automatic Verified Purchase detection
                if (dto.OrderId.HasValue)
                {
                    review.IsVerifiedPurchase = await _context.Orders
                        .AnyAsync(o => o.Id == dto.OrderId && o.UserId == userId && o.Status == OrderStatus.Delivered);
                }
                else
                {
                    review.IsVerifiedPurchase = await _context.Orders
                        .AnyAsync(o => o.UserId == userId && o.Status == OrderStatus.Delivered && o.Items.Any(i => i.ProductId == dto.ProductId));
                }

                if (!review.IsVerifiedPurchase)
                {
                    throw new InvalidOperationException("Bạn chỉ có thể đánh giá những sản phẩm đã mua và đã nhận hàng thành công.");
                }
            }
            else
            {
                throw new UnauthorizedAccessException("Khách vãng lai không được phép đánh giá sản phẩm. Vui lòng đăng nhập và mua hàng để thực hiện đánh giá.");
            }

            _context.ProductReviews.Add(review);
            await _context.SaveChangesAsync();

            return MapToDto(review);
        }

        public async Task<bool> DeleteReviewAsync(int id, string? userId = null, bool isAdmin = false)
        {
            var review = await _context.ProductReviews.FindAsync(id);
            if (review == null) return false;

            if (!isAdmin && review.UserId != userId)
                throw new UnauthorizedAccessException("You can only delete your own reviews");

            review.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<ProductReviewDto> UpdateReviewAsync(int id, CreateReviewDto dto, string? userId = null, bool isAdmin = false)
        {
            var review = await _context.ProductReviews.FindAsync(id);
            if (review == null) throw new Exception("Review not found");

            if (!isAdmin && review.UserId != userId)
                throw new UnauthorizedAccessException("You can only edit your own reviews");

            review.Rating = dto.Rating;
            review.Comment = dto.Comment;
            if (isAdmin && !string.IsNullOrEmpty(dto.FakeUserName)) review.UserName = dto.FakeUserName;
            if (isAdmin && !string.IsNullOrEmpty(dto.FakeAvatarUrl)) review.UserAvatarUrl = dto.FakeAvatarUrl;
            if (isAdmin && dto.ForceVerifiedPurchase.HasValue) review.IsVerifiedPurchase = dto.ForceVerifiedPurchase.Value;

            await _context.SaveChangesAsync();
            return MapToDto(review);
        }

        private static ProductReviewDto MapToDto(ProductReview r)
        {
            var dto = new ProductReviewDto
            {
                Id = r.Id,
                ProductId = r.ProductId,
                ProductName = r.Product?.Name,
                UserId = r.UserId,
                UserName = r.UserName,
                UserAvatarUrl = r.UserAvatarUrl,
                Rating = r.Rating,
                Comment = r.Comment,
                IsFake = r.IsFake,
                IsVerifiedPurchase = r.IsVerifiedPurchase,
                OrderId = r.OrderId,
                CreatedAt = r.CreatedAt,
                IsDeleted = r.IsDeleted
            };

            if (r.Order != null)
            {
                var orderItems = r.Order.Items.Where(i => i.ProductId == r.ProductId).ToList();
                if (orderItems.Any())
                {
                    dto.BoughtVariant = string.Join("; ", orderItems.Select(i => 
                        $"Phân loại: {i.Variant?.Color?.Name ?? "N/A"}, {i.Variant?.Size ?? "N/A"}"));
                }
            }

            return dto;
        }

    }
}
