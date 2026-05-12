namespace GhostTrick.Application.Interfaces
{
    public interface ISystemService
    {
        Task<bool> CreateBackupAsync();
    }
}
