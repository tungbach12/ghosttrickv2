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
        private readonly IGenericRepository<ProductReview> _reviewRepo;
        private readonly IGenericRepository<Order> _orderRepo;
        private readonly IGenericRepository<ApplicationUser> _userRepo;
        private readonly IUnitOfWork _uow;

        public ReviewService(
            IGenericRepository<ProductReview> reviewRepo,
            IGenericRepository<Order> orderRepo,
            IGenericRepository<ApplicationUser> userRepo,
            IUnitOfWork uow)
        {
            _reviewRepo = reviewRepo;
            _orderRepo = orderRepo;
            _userRepo = userRepo;
            _uow = uow;
        }

        public async Task<List<ProductReviewDto>> GetProductReviewsAsync(int productId)
        {
            var reviews = await _reviewRepo.GetAsync(q => q
                .Where(r => r.ProductId == productId && r.IsApproved)
                .Include(r => r.Order!).ThenInclude(o => o.Items!).ThenInclude(i => i.Variant!).ThenInclude(v => v.Color)
                .OrderByDescending(r => r.CreatedAt)
            );
                
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
            var (items, totalCount) = await _reviewRepo.GetPagedAsync(page, pageSize, query => 
            {
                if (showDeleted == true) query = query.Where(r => r.IsDeleted);
                else if (showDeleted == false) query = query.Where(r => !r.IsDeleted);

                if (rating.HasValue) query = query.Where(r => r.Rating == rating.Value);
                if (isFake.HasValue) query = query.Where(r => r.IsFake == isFake.Value);
                if (isVerified.HasValue) query = query.Where(r => r.IsVerifiedPurchase == isVerified.Value);

                if (!string.IsNullOrEmpty(searchTerm))
                    query = query.Where(r => r.UserName.Contains(searchTerm) || r.Comment.Contains(searchTerm) || (r.Product != null && r.Product.Name.Contains(searchTerm)));

                if (orderBy == "oldest") query = query.OrderBy(r => r.CreatedAt);
                else query = query.OrderByDescending(r => r.CreatedAt);

                return query.Include(r => r.Order!).ThenInclude(o => o.Items!).ThenInclude(i => i.Variant!).ThenInclude(v => v.Color);
            });

            return new PagedResult<ProductReviewDto>
            {
                Items = items.Select(MapToDto).ToList(),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<ProductReviewDto> CreateReviewAsync(CreateReviewDto dto, string? userId, bool isAdmin = false)
        {
            if (!isAdmin && !string.IsNullOrEmpty(userId))
            {
                var existingResults = await _reviewRepo.FindAsync(r => r.ProductId == dto.ProductId && r.UserId == userId && r.OrderId == dto.OrderId);
                var existingReview = existingResults.FirstOrDefault();

                if (existingReview != null)
                {
                    existingReview.Rating = dto.Rating;
                    existingReview.Comment = dto.Comment;
                    existingReview.UpdatedAt = DateTime.UtcNow;
                    
                    if (!existingReview.IsVerifiedPurchase)
                    {
                        var orderResults = await _orderRepo.FindAsync(o => o.UserId == userId && o.Status == OrderStatus.Delivered && o.Items!.Any(i => i.ProductId == dto.ProductId));
                        existingReview.IsVerifiedPurchase = orderResults.Any();
                    }

                    _reviewRepo.Update(existingReview);
                    await _uow.CompleteAsync();
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
                UserName = "Pending..."
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
                var userResults = await _userRepo.FindAsync(u => u.Id == userId);
                var user = userResults.FirstOrDefault();
                review.UserName = user?.FullName ?? "User";
                review.UserAvatarUrl = user?.AvatarUrl;
                
                if (dto.OrderId.HasValue)
                {
                    var orderResults = await _orderRepo.FindAsync(o => o.Id == dto.OrderId && o.UserId == userId && o.Status == OrderStatus.Delivered);
                    review.IsVerifiedPurchase = orderResults.Any();
                }
                else
                {
                    var orderResults = await _orderRepo.FindAsync(o => o.UserId == userId && o.Status == OrderStatus.Delivered && o.Items!.Any(i => i.ProductId == dto.ProductId));
                    review.IsVerifiedPurchase = orderResults.Any();
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

            await _reviewRepo.AddAsync(review);
            await _uow.CompleteAsync();

            return MapToDto(review);
        }

        public async Task<bool> DeleteReviewAsync(int id, string? userId = null, bool isAdmin = false)
        {
            var review = await _reviewRepo.GetByIdAsync(id);
            if (review == null) return false;

            if (!isAdmin && review.UserId != userId)
                throw new UnauthorizedAccessException("You can only delete your own reviews");

            review.IsDeleted = true;
            _reviewRepo.Update(review);
            await _uow.CompleteAsync();
            return true;
        }

        public async Task<ProductReviewDto> UpdateReviewAsync(int id, CreateReviewDto dto, string? userId = null, bool isAdmin = false)
        {
            var review = await _reviewRepo.GetByIdAsync(id);
            if (review == null) throw new Exception("Review not found");

            if (!isAdmin && review.UserId != userId)
                throw new UnauthorizedAccessException("You can only edit your own reviews");

            review.Rating = dto.Rating;
            review.Comment = dto.Comment;
            if (isAdmin && !string.IsNullOrEmpty(dto.FakeUserName)) review.UserName = dto.FakeUserName;
            if (isAdmin && !string.IsNullOrEmpty(dto.FakeAvatarUrl)) review.UserAvatarUrl = dto.FakeAvatarUrl;
            if (isAdmin && dto.ForceVerifiedPurchase.HasValue) review.IsVerifiedPurchase = dto.ForceVerifiedPurchase.Value;

            _reviewRepo.Update(review);
            await _uow.CompleteAsync();
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
