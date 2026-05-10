using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GhostTrick.Domain.Entities
{
    /// <summary>Many-to-many join table: SaleEvent ↔ Product with Override Layer data</summary>
    public class SaleEventProduct
    {
        public int SaleEventId { get; set; }
        public SaleEvent? SaleEvent { get; set; }

        public int ProductId { get; set; }
        public Product? Product { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal SalePrice { get; set; }

        public int FlashStock { get; set; }

        public int SoldCount { get; set; } = 0;

        [Timestamp]
        public byte[]? RowVersion { get; set; }
    }
}
