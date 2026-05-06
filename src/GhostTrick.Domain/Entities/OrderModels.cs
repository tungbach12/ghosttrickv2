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

    public class Order
    {
        public int Id { get; set; }

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

        /// <summary>Stored as JSON: { name, phone, address, city }</summary>
        [Required]
        public required string ShippingAddress { get; set; }

        public string? Note { get; set; }

        // Voucher applied
        public int? VoucherId { get; set; }
        public Voucher? Voucher { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal DiscountAmount { get; set; } = 0;

        public bool IsDeleted { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
        public ICollection<OrderTimeline> Timeline { get; set; } = new List<OrderTimeline>();
    }

    public class OrderItem
    {
        public int Id { get; set; }

        public int OrderId { get; set; }
        public Order? Order { get; set; }

        public int ProductId { get; set; }
        public Product? Product { get; set; }

        public int VariantId { get; set; }
        public ProductVariant? Variant { get; set; }

        public int Quantity { get; set; }

        /// <summary>Price at time of purchase (snapshot)</summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal UnitPrice { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Subtotal { get; set; }
    }
}
