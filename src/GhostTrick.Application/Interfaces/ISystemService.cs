namespace GhostTrick.Application.Interfaces
{
    public interface ISystemService
    {
        Task<(bool Success, string Message)> CreateBackupAsync();
    }
}
