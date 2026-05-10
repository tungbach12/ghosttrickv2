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

    public enum VoucherCategory
    {
        General,   // Discount on subtotal
        Shipping   // Discount on shipping fee
    }

    public class Voucher : BaseEntity
    {
        [Required, MaxLength(50)]
        public required string Code { get; set; }

        [MaxLength(300)]
        public string? Description { get; set; }

        public VoucherCategory Category { get; set; } = VoucherCategory.General;

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

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        public bool IsActive { get; set; } = true;

        [Timestamp]
        public byte[]? RowVersion { get; set; }

        public ICollection<VoucherUsage> Usages { get; set; } = new List<VoucherUsage>();
    }
}
