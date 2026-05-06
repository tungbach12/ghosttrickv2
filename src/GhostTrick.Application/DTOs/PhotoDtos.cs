namespace GhostTrick.Application.DTOs
{
    public class PhotoUploadResult
    {
        public string? PublicId { get; set; }
        public string? Url { get; set; }
        public bool Success { get; set; }
        public string? Error { get; set; }
    }

    public class PhotoDeletionResult
    {
        public bool Success { get; set; }
        public string? Error { get; set; }
    }
}
