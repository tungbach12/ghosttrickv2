using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
using GhostTrick.Domain.Entities;

namespace GhostTrick.Application.DTOs
{
    // ── Auth ─────────────────────────────────────────────────────────
    public class RegisterDto
    {
        [Required, MaxLength(150)]
        public required string FullName { get; set; }

        [Required, EmailAddress]
        public required string Email { get; set; }

        [Required, MinLength(8)]
        public required string Password { get; set; }

        [Required, RegularExpression(@"^(0[3|5|7|8|9])+([0-9]{8})$",
            ErrorMessage = "Số điện thoại không hợp lệ (VD: 0901234567)")]
        public required string Phone { get; set; }
    }

    public class LoginDto
    {
        [Required, EmailAddress]
        public required string Email { get; set; }

        [Required]
        public required string Password { get; set; }
    }

    public class RefreshTokenDto
    {
        [Required]
        public required string RefreshToken { get; set; }
    }

    public class AuthResponseDto
    {
        public required string AccessToken { get; set; }
        public required string RefreshToken { get; set; }
        public required UserDto User { get; set; }
    }

    public class UserDto
    {
        public required string Id { get; set; }
        public string? FullName { get; set; }
        public required string Email { get; set; }
        public string? Phone { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Role { get; set; }
    }

    public class UpdateProfileDto
    {
        [MaxLength(150)]
        public string? FullName { get; set; }

        [RegularExpression(@"^(0[3|5|7|8|9])+([0-9]{8})$",
            ErrorMessage = "Số điện thoại không hợp lệ")]
        public string? Phone { get; set; }

        public string? AvatarUrl { get; set; }
    }

    // ── Product ───────────────────────────────────────────────────────
    public class ProductListDto
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string? SKU { get; set; }
        public decimal Price { get; set; }
        public decimal? OriginalPrice { get; set; }
        public string? MainImageUrl { get; set; }
        public string? CategorySlug { get; set; }
        public string? Subcategory { get; set; }
        public int SalesCount { get; set; }
        public bool IsOnSale { get; set; }
        public bool IsNewArrival { get; set; }
        public bool IsTrending { get; set; }
        public string? Status { get; set; }
        public int TotalStock { get; set; }
        public List<string> Colors { get; set; } = new();
    }

    public class ProductDetailDto : ProductListDto
    {
        public string? Description { get; set; }
        public string? CategoryName { get; set; }
        public List<VariantDto> Variants { get; set; } = new();
        public List<string> Images { get; set; } = new();
    }

    public class VariantDto
    {
        public int Id { get; set; }
        public required string Color { get; set; }
        public required string Size { get; set; }
        public int Stock { get; set; }
        public int LowStockThreshold { get; set; }
    }

    public class CreateProductDto
    {
        [Required, MaxLength(300)]
        public required string Name { get; set; }
        public string? Description { get; set; }
        [Required, MaxLength(50)]
        public required string SKU { get; set; }
        public decimal Price { get; set; }
        public decimal? OriginalPrice { get; set; }
        public int CategoryId { get; set; }
        public string? Subcategory { get; set; }
        public bool IsOnSale { get; set; }
        public bool IsNewArrival { get; set; }
        public bool IsTrending { get; set; }
        public string? Status { get; set; } // Active, Draft, Archived
        public List<CreateVariantDto> Variants { get; set; } = new();
        public IFormFile? MainImage { get; set; }
        public List<IFormFile> OtherImages { get; set; } = new();
    }

    public class CreateVariantDto
    {
        [Required]
        public required string Color { get; set; }
        [Required]
        public required string Size { get; set; }
        public int Stock { get; set; }
        public int LowStockThreshold { get; set; }
    }

    // ── Order ─────────────────────────────────────────────────────────
    public class CreateOrderDto
    {
        [Required, MinLength(1, ErrorMessage = "Đơn hàng phải có ít nhất 1 sản phẩm")]
        public required List<OrderItemDto> Items { get; set; }

        [Required]
        public required string ShippingAddress { get; set; }

        public string? Note { get; set; }

        public string? VoucherCode { get; set; }

        [Required]
        public required string PaymentMethod { get; set; }
    }

    public class OrderItemDto
    {
        [Range(1, int.MaxValue)]
        public int VariantId { get; set; }

        [Range(1, 100, ErrorMessage = "Số lượng phải từ 1-100")]
        public int Quantity { get; set; }
    }

    public class OrderResponseDto
    {
        public int Id { get; set; }
        public string? Status { get; set; }
        public string? PaymentStatus { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal ShippingFee { get; set; }
        public decimal DiscountAmount { get; set; }
        public string? PaymentMethod { get; set; }
        public string? ShippingAddress { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<OrderItemResponseDto> Items { get; set; } = new();
        public List<OrderTimelineDto> Timeline { get; set; } = new();
    }

    public class OrderTimelineDto
    {
        public string? Status { get; set; }
        public string? Note { get; set; }
        public string? Actor { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class OrderItemResponseDto
    {
        public int ProductId { get; set; }
        public string? ProductName { get; set; }
        public string? ProductImage { get; set; }
        public string? Color { get; set; }
        public string? Size { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Subtotal { get; set; }
    }

    public class UpdateOrderStatusDto
    {
        [Required]
        public required string Status { get; set; }
        public string? Note { get; set; }
    }

    // ── Voucher ───────────────────────────────────────────────────────
    public class ValidateVoucherDto
    {
        [Required]
        public required string Code { get; set; }

        [Range(0, double.MaxValue)]
        public decimal OrderAmount { get; set; }
    }

    public class VoucherResultDto
    {
        public required string Code { get; set; }
        public string? Description { get; set; }
        public required string DiscountType { get; set; }
        public decimal DiscountValue { get; set; }
        public decimal DiscountAmount { get; set; }  // calculated
        public int LimitPerUser { get; set; }
    }

    // ── Pagination ────────────────────────────────────────────────────
    public class PagedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    }

    public class SaleEventDto
    {
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public bool IsActive { get; set; }
        public Microsoft.AspNetCore.Http.IFormFile? BannerFile { get; set; }
    }

    public class HomeBannerDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Subtitle { get; set; }
        public string? LinkUrl { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; }
        public Microsoft.AspNetCore.Http.IFormFile? ImageFile { get; set; }
    }

    public class CreateVoucherDto
    {
        [Required, MaxLength(50)]
        public required string Code { get; set; }

        [MaxLength(300)]
        public string? Description { get; set; }

        public DiscountType DiscountType { get; set; } = DiscountType.Fixed;

        [Range(0, double.MaxValue)]
        public decimal DiscountValue { get; set; }

        [Range(0, double.MaxValue)]
        public decimal MinOrderAmount { get; set; }

        [Range(0, double.MaxValue)]
        public decimal MaxDiscountAmount { get; set; }

        [Range(0, int.MaxValue)]
        public int UsageLimit { get; set; }

        [Range(0, int.MaxValue)]
        public int LimitPerUser { get; set; } = 1;

        public bool IsActive { get; set; } = true;
        
        public DateTime? EndDate { get; set; }
    }
}
