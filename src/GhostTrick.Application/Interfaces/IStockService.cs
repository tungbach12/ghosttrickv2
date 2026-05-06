namespace GhostTrick.Application.Interfaces
{
    public interface IStockService
    {
        Task<bool> CheckStockAsync(int variantId, int quantity);
        Task<Dictionary<int, bool>> CheckStockBatchAsync(IEnumerable<(int variantId, int quantity)> items);
        Task DeductStockAsync(IEnumerable<(int variantId, int quantity)> items, string? referenceId = null);
        Task RestoreStockAsync(int orderId);
    }
}
