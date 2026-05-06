using System.ComponentModel.DataAnnotations;

namespace GhostTrick.Domain.Entities
{
    public enum InventoryTransactionType
    {
        Sale,           // Deducted on order
        Return,         // Restored on cancellation/return
        Restock,        // Manual addition
        Adjustment,     // Manual correction (damage, etc.)
        Initial         // Initial stock entry
    }

    public class InventoryTransaction
    {
        public int Id { get; set; }

        public int VariantId { get; set; }
        public ProductVariant? Variant { get; set; }

        public int Quantity { get; set; } // Can be positive or negative

        public InventoryTransactionType Type { get; set; }

        [MaxLength(255)]
        public string? Note { get; set; }

        public string? ReferenceId { get; set; } // E.g. Order ID or Batch ID

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public string? CreatedBy { get; set; } // Admin ID if manual
    }
}
