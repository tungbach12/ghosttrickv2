using System.ComponentModel.DataAnnotations;

namespace GhostTrick.Domain.Entities
{
    public class Policy
    {
        public int Id { get; set; }

        [Required, MaxLength(120)]
        public required string Slug { get; set; }

        [Required, MaxLength(200)]
        public required string Title { get; set; }

        [Required]
        public required string Content { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public bool IsDeleted { get; set; } = false;
    }
}
