namespace GhostTrick.Application.Interfaces
{
    public interface IAdminService
    {
        Task<object> GetDashboardStatsAsync(DateTime? startDate = null, DateTime? endDate = null);
    }
}
