using System.ComponentModel.DataAnnotations;

namespace GhostTrick.Domain.Entities
{
    public class ProductVariant
    {
        public int Id { get; set; }

        public int ProductId { get; set; }
        public Product? Product { get; set; }

        public int ColorId { get; set; }
        public ProductColor? Color { get; set; }

        /// <summary>Size label: S, M, L, XL, etc.</summary>
        [Required, MaxLength(10)]
        public required string Size { get; set; }

        /// <summary>Stock for this specific color+size combination</summary>
        public int Stock { get; set; } = 0;

        /// <summary>Alert when stock falls below this</summary>
        public int LowStockThreshold { get; set; } = 5;

        [Timestamp]
        public byte[]? RowVersion { get; set; }
    }
}
