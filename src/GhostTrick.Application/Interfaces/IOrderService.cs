using GhostTrick.Application.DTOs;

namespace GhostTrick.Application.Interfaces
{
    public interface IOrderService
    {
        Task<PagedResult<OrderResponseDto>> GetMyOrdersAsync(string userId, int page, int pageSize);
        Task<OrderResponseDto> GetOrderAsync(int id, string userId);
        Task<OrderResponseDto> CreateOrderAsync(CreateOrderDto dto, string userId);
        Task CancelOrderAsync(int id, string userId);
        
        // Admin methods
        Task<PagedResult<OrderResponseDto>> GetAllOrdersAsync(
            int page, 
            int pageSize, 
            string? q, 
            string? status,
            DateTime? startDate = null,
            DateTime? endDate = null,
            decimal? minAmount = null,
            decimal? maxAmount = null,
            string? paymentMethod = null,
            string? paymentStatus = null,
            string? orderBy = null,
            string? category = null);
        Task UpdateOrderStatusAsync(int id, UpdateOrderStatusDto dto);
        Task UpdatePaymentStatusAsync(int id, UpdatePaymentStatusDto dto);
        Task SoftDeleteOrderAsync(int id);
        Task<OrderResponseDto> GetOrderByIdAsync(int id);
    }
}
