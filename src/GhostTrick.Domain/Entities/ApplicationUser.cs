using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace GhostTrick.Domain.Entities
{
    public class ApplicationUser : IdentityUser
    {
        [MaxLength(150)]
        public string? FullName { get; set; }


        public string? AvatarUrl { get; set; }

        public DateTime? DateOfBirth { get; set; }
        public bool IsDeleted { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<Order> Orders { get; set; } = new List<Order>();
        public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
        public virtual ICollection<OtpCode> OtpCodes { get; set; } = new List<OtpCode>();
        public virtual ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();
    }

    public class RefreshToken
    {
        public int Id { get; set; }

        [Required]
        public required string Token { get; set; }

        public DateTime ExpiresAt { get; set; }

        public bool IsRevoked { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public required string UserId { get; set; }
        public ApplicationUser? User { get; set; }
    }

    public class OtpCode
    {
        public int Id { get; set; }

        [Required]
        public required string Code { get; set; }

        public DateTime ExpiresAt { get; set; }

        public bool IsUsed { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public required string UserId { get; set; }
        public ApplicationUser? User { get; set; }
    }
}
