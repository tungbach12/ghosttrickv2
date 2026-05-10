using GhostTrick.Application.DTOs;
using Microsoft.AspNetCore.Http;

namespace GhostTrick.Application.Interfaces
{
    public interface IUserService
    {
        Task<string> UpdateAvatarAsync(string userId, IFormFile file);
        Task<object> UpdateProfileAsync(string userId, UpdateProfileDto dto);
        Task<PagedResult<UserAdminDto>> GetUsersAsync(int page, int pageSize, string? searchTerm);
        Task<bool> ToggleUserLockAsync(string userId);
        Task UpdateUserByAdminAsync(string userId, UpdateUserAdminDto dto);
        Task ChangePasswordAsync(string userId, ChangePasswordDto dto);
    }
}
