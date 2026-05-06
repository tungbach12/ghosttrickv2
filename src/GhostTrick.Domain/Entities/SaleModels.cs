using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace GhostTrick.Domain.Entities
{
    public class SaleEvent
    {
        public int Id { get; set; }

        [Required, MaxLength(200)]
        public required string Name { get; set; }

        [Required, MaxLength(220)]
        public required string Slug { get; set; }

        public string? Description { get; set; }

        public string? BannerUrl { get; set; }

        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }

        public bool IsActive { get; set; } = false;
        public bool IsDeleted { get; set; } = false;

        public ICollection<SaleEventProduct> SaleEventProducts { get; set; } = new List<SaleEventProduct>();
    }

    /// <summary>Many-to-many join table: SaleEvent ↔ Product</summary>
    public class SaleEventProduct
    {
        public int SaleEventId { get; set; }
        public SaleEvent? SaleEvent { get; set; }

        public int ProductId { get; set; }
        public Product? Product { get; set; }
    }
}
