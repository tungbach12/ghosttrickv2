using GhostTrick.Application.DTOs;

namespace GhostTrick.Application.Interfaces
{
    public interface ICartService
    {
        Task<List<CartItemResponseDto>> GetCartAsync(string userId);
        Task AddToCartAsync(CartRequestDto request, string userId);
        Task RemoveFromCartAsync(int variantId, string userId);
        Task SyncCartAsync(List<CartRequestDto> guestCart, string userId);
    }
}
