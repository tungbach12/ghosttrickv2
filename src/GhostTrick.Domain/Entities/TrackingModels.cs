using System.ComponentModel.DataAnnotations;

namespace GhostTrick.Domain.Entities
{
    public class OrderTimeline
    {
        public int Id { get; set; }

        public int OrderId { get; set; }
        public Order? Order { get; set; }

        [Required, MaxLength(50)]
        public required string Status { get; set; } // Can store composite status like "Order Placed" or "Payment Confirmed"

        [MaxLength(500)]
        public string? Note { get; set; }

        public string? Actor { get; set; } // "Customer", "System", or Admin Name

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
