using System.ComponentModel.DataAnnotations;

namespace GhostTrick.Domain.Entities
{
    public class HomeBanner : BaseEntity
    {
        [Required]
        public string Title { get; set; } = string.Empty;
        
        public string? Subtitle { get; set; }
        public string? LinkUrl { get; set; }
        
        [Required]
        public string ImageUrl { get; set; } = string.Empty;
        
        public int DisplayOrder { get; set; } = 0;
        public bool IsActive { get; set; } = true;
    }
}
