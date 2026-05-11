namespace GhostTrick.Application.Interfaces
{
    public interface IUnitOfWork : IDisposable
    {
        Task<int> CompleteAsync();
        Task<IDisposable> BeginTransactionAsync();
        Task CommitAsync();
        Task RollbackAsync();
    }
}
