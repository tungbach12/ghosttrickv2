using System.ComponentModel.DataAnnotations;

namespace GhostTrick.Domain.Entities
{
    /// <summary>Voucher Wallet: Stores vouchers saved by the user</summary>
    public class UserVoucher
    {
        public int Id { get; set; }

        public int VoucherId { get; set; }
        public Voucher? Voucher { get; set; }

        [Required]
        public required string UserId { get; set; }
        public ApplicationUser? User { get; set; }

        public DateTime SavedAt { get; set; } = DateTime.UtcNow;
        public bool IsUsed { get; set; } = false;
    }
}
