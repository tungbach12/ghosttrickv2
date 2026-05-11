using System;

namespace GhostTrick.Domain.Entities
{
    public class TopBarPromo : BaseEntity
    {
        public string Content { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
