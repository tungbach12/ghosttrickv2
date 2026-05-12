using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace GhostTrick.Domain.Entities
{
    public class SizeChart : BaseEntity
    {
        [Required, MaxLength(200)]
        public required string Name { get; set; }

        [Required]
        public required string ImageUrl { get; set; }

        // Navigation
        public ICollection<Product> Products { get; set; } = new List<Product>();
    }
}
