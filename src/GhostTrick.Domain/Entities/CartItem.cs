using System;
using System.ComponentModel.DataAnnotations;

namespace GhostTrick.Domain.Entities
{
    public class CartItem
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        public string UserId { get; set; } = default!;
        public virtual ApplicationUser User { get; set; } = default!;

        public int ProductId { get; set; }
        public virtual Product Product { get; set; } = default!;

        public int VariantId { get; set; }
        public virtual ProductVariant Variant { get; set; } = default!;

        public int Quantity { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
