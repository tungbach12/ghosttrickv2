using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GhostTrick.Domain.Entities
{
    public enum DiscountType
    {
        Percent,   // e.g. 10 = 10% off
        Fixed      // e.g. 50000 = 50,000₫ off
    }

    public class Voucher
    {
        public int Id { get; set; }

        [Required, MaxLength(50)]
        public required string Code { get; set; }

        [MaxLength(300)]
        public string? Description { get; set; }

        public DiscountType DiscountType { get; set; } = DiscountType.Fixed;

        [Column(TypeName = "decimal(18,2)")]
        public decimal DiscountValue { get; set; }

        /// <summary>Minimum order amount to apply this voucher</summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal MinOrderAmount { get; set; } = 0;

        /// <summary>Cap for Percent type (0 = no cap)</summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal MaxDiscountAmount { get; set; } = 0;

        /// <summary>0 = unlimited</summary>
        public int UsageLimit { get; set; } = 0;

        /// <summary>How many times a single user can use this voucher (0 = unlimited)</summary>
        public int LimitPerUser { get; set; } = 1;

        public int UsedCount { get; set; } = 0;

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        public bool IsActive { get; set; } = true;
        public bool IsDeleted { get; set; } = false;

        public ICollection<VoucherUsage> Usages { get; set; } = new List<VoucherUsage>();
    }

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
