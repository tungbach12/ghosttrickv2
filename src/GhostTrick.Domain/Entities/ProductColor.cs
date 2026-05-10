using System.ComponentModel.DataAnnotations;

namespace GhostTrick.Domain.Entities
{
    public class ProductColor : BaseEntity
    {
        [Required, MaxLength(50)]
        public required string Name { get; set; }

        [Required, MaxLength(20)]
        public required string HexCode { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
