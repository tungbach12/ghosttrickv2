using System.ComponentModel.DataAnnotations;

namespace GhostTrick.Domain.Entities
{
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
