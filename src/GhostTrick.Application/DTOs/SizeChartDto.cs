namespace GhostTrick.Application.DTOs
{
    public class SizeChartDto
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string? ImageUrl { get; set; }
    }

    public class CreateSizeChartDto
    {
        public string? Name { get; set; }
        public string? ImageUrl { get; set; }
    }
}
