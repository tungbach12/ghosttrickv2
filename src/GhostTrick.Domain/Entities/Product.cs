using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GhostTrick.Domain.Entities
{
    public enum ProductStatus
    {
        Active,
        Draft,
        Archived
    }

    public class Product : BaseEntity
    {
        [Required, MaxLength(300)]
        public required string Name { get; set; }

        public string? Description { get; set; }

        [Required, MaxLength(50)]
        public required string SKU { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? OriginalPrice { get; set; }

        /// <summary>Main/thumbnail image URL</summary>
        public string? MainImageUrl { get; set; }

        /// <summary>Subcategory label (e.g. Áo thun, Đầm xòe)</summary>
        [MaxLength(100)]
        public string? Subcategory { get; set; }

        /// <summary>Actual sales tracked from completed orders</summary>
        public int ActualSalesCount { get; set; } = 0;

        /// <summary>Manual sales count override by admin</summary>
        public int? ManualSalesCount { get; set; }

        public bool IsOnSale { get; set; } = false;
        public bool IsNewArrival { get; set; } = false;
        public bool IsTrending { get; set; } = false;
        public ProductStatus Status { get; set; } = ProductStatus.Active;

        // Navigation
        public int CategoryId { get; set; }
        public Category? Category { get; set; }

        public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
        public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
        public ICollection<SaleEventProduct> SaleEventProducts { get; set; } = new List<SaleEventProduct>();
    }
}
