using System.ComponentModel.DataAnnotations.Schema;

namespace GhostTrick.Domain.Entities
{
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
    }
}
