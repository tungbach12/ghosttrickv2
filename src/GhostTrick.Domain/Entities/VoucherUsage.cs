using System.ComponentModel.DataAnnotations;

namespace GhostTrick.Domain.Entities
{
    public class VoucherUsage
    {
        public int Id { get; set; }

        public int VoucherId { get; set; }
        public Voucher? Voucher { get; set; }

        [Required]
        public required string UserId { get; set; }
        public ApplicationUser? User { get; set; }

        public int OrderId { get; set; }
        public Order? Order { get; set; }

        public DateTime UsedAt { get; set; } = DateTime.UtcNow;
    }
}
