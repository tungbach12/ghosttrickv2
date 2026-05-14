using System.ComponentModel.DataAnnotations;

namespace GhostTrick.Domain.Entities
{
    public class HomeBanner : BaseEntity
    {
        public string? Title { get; set; }
        
        public string? Subtitle { get; set; }
        public string? LinkUrl { get; set; }
        
        public string? ImageUrl { get; set; }
        
        public int DisplayOrder { get; set; } = 0;
        public bool IsActive { get; set; } = true;
    }
}
