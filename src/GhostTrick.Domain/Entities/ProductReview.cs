using System;
using System.ComponentModel.DataAnnotations;

namespace GhostTrick.Domain.Entities
{
    public class ProductReview : BaseEntity
    {
        public int ProductId { get; set; }
        public virtual Product? Product { get; set; }

        public string? UserId { get; set; }
        public virtual ApplicationUser? User { get; set; }

        public int? OrderId { get; set; }
        public virtual Order? Order { get; set; }


        [Required, MaxLength(100)]
        public required string UserName { get; set; }

        public string? UserAvatarUrl { get; set; }

        [Range(1, 5)]
        public int Rating { get; set; }

        [Required, MaxLength(1000)]
        public required string Comment { get; set; }

        public bool IsApproved { get; set; } = true;
        public bool IsFake { get; set; } = false;
        public bool IsVerifiedPurchase { get; set; } = false;
    }
}
