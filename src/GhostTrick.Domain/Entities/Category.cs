using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace GhostTrick.Domain.Entities
{
    public class Category : BaseEntity
    {
        [Required, MaxLength(100)]
        public required string Name { get; set; }

        [Required, MaxLength(120)]
        public required string Slug { get; set; }

        public string? Description { get; set; }

        public ICollection<Product> Products { get; set; } = new List<Product>();
    }
}
