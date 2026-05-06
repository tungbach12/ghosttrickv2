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

    public class Category
    {
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public required string Name { get; set; }

        [Required, MaxLength(120)]
        public required string Slug { get; set; }

        public string? Description { get; set; }
        public bool IsDeleted { get; set; } = false;

        public ICollection<Product> Products { get; set; } = new List<Product>();
    }

    public class Product
    {
        public int Id { get; set; }

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

        /// <summary>Aggregate sold count – updated on order completion</summary>
        public int SalesCount { get; set; } = 0;

        public bool IsOnSale { get; set; } = false;
        public bool IsNewArrival { get; set; } = false;
        public bool IsTrending { get; set; } = false;
        public ProductStatus Status { get; set; } = ProductStatus.Active;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public bool IsDeleted { get; set; } = false;

        // Navigation
        public int CategoryId { get; set; }
        public Category? Category { get; set; }

        public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
        public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
        public ICollection<SaleEventProduct> SaleEventProducts { get; set; } = new List<SaleEventProduct>();
    }

    public class ProductVariant
    {
        public int Id { get; set; }

        public int ProductId { get; set; }
        public Product? Product { get; set; }

        /// <summary>Hex color string (e.g. #000000)</summary>
        [Required, MaxLength(20)]
        public required string Color { get; set; }

        /// <summary>Size label: S, M, L, XL, etc.</summary>
        [Required, MaxLength(10)]
        public required string Size { get; set; }

        /// <summary>Stock for this specific color+size combination</summary>
        public int Stock { get; set; } = 0;

        /// <summary>Alert when stock falls below this</summary>
        public int LowStockThreshold { get; set; } = 5;
    }

    public class ProductImage
    {
        public int Id { get; set; }

        public int ProductId { get; set; }
        public Product? Product { get; set; }

        [Required]
        public required string ImageUrl { get; set; }

        /// <summary>Lower = appears first</summary>
        public int SortOrder { get; set; } = 0;

        public bool IsMain { get; set; } = false;
    }
}
