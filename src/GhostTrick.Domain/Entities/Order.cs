using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GhostTrick.Domain.Entities
{
    public enum OrderStatus
    {
        Pending,        // Just placed
        Confirmed,      // Admin confirmed
        Processing,     // Preparing/Packing
        Shipping,       // On the way
        Delivered,      // Received
        Cancelled,      // Cancelled by user/admin
        Refunded,       // Returned & money back
        Failed          // Delivery or payment failed
    }

    public enum PaymentStatus
    {
        Unpaid,
        Paid,
        PartiallyRefunded,
        Refunded
    }

    public enum PaymentMethod
    {
        COD,
        BankTransfer,
        Momo,
        ZaloPay,
        VNPay
    }

    public class Order : BaseEntity
    {
        [Required]
        public required string UserId { get; set; }
        public ApplicationUser? User { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal ShippingFee { get; set; } = 0;

        public OrderStatus Status { get; set; } = OrderStatus.Pending;
        public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Unpaid;

        public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.COD;

        /// <summary>Stored as JSON or full string: address, city...</summary>
        [Required]
        public required string ShippingAddress { get; set; }

        public string? ReceiverName { get; set; }
        public string? Phone { get; set; }

        public string? Note { get; set; }

        // Voucher applied
        public int? VoucherId { get; set; }
        public Voucher? Voucher { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal DiscountAmount { get; set; } = 0;

        public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
        public ICollection<OrderTimeline> Timeline { get; set; } = new List<OrderTimeline>();
    }
}
