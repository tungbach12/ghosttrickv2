using System;

namespace GhostTrick.Domain.Entities
{
    public class Feedback : BaseEntity
    {
        public string ImageUrl { get; set; } = string.Empty;
        public string? PublicId { get; set; }
        public bool IsActive { get; set; } = true;
        public int DisplayOrder { get; set; }
    }
}
