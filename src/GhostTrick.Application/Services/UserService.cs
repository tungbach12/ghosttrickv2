using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Application.Services
{
    public class UserService : IUserService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IPhotoService _photoService;
        private readonly IGhostTrickContext _context;

        public UserService(UserManager<ApplicationUser> userManager, IPhotoService photoService, IGhostTrickContext context)
        {
            _userManager = userManager;
            _photoService = photoService;
            _context = context;
        }

        public async Task<string> UpdateAvatarAsync(string userId, IFormFile file)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) throw new KeyNotFoundException("User not found");

            var result = await _photoService.AddPhotoAsync(file);
            if (result.Error != null) throw new InvalidOperationException(result.Error);

            user.AvatarUrl = result.Url;
            await _userManager.UpdateAsync(user);

            return user.AvatarUrl;
        }

        public async Task<object> UpdateProfileAsync(string userId, UpdateProfileDto dto)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) throw new KeyNotFoundException("User not found");

            user.FullName = dto.FullName ?? user.FullName;
            user.PhoneNumber = dto.Phone ?? user.PhoneNumber;
            
            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded) 
                throw new InvalidOperationException(string.Join(", ", result.Errors.Select(e => e.Description)));

            return new { 
                fullName = user.FullName, 
                phone = user.PhoneNumber,
                email = user.Email
            };
        }
        public async Task<PagedResult<UserAdminDto>> GetUsersAsync(int page, int pageSize, string? searchTerm)
        {
            var query = _userManager.Users
                .Include(u => u.Orders)
                .Where(u => !u.IsDeleted);

            if (!string.IsNullOrEmpty(searchTerm))
            {
                query = query.Where(u => u.FullName!.Contains(searchTerm) || u.Email!.Contains(searchTerm) || u.PhoneNumber!.Contains(searchTerm));
            }

            var total = await query.CountAsync();
            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = new List<UserAdminDto>();
            foreach (var user in users)
            {
                var roles = await _userManager.GetRolesAsync(user);
                dtos.Add(new UserAdminDto
                {
                    Id = user.Id,
                    FullName = user.FullName,
                    Email = user.Email!,
                    Phone = user.PhoneNumber,
                    AvatarUrl = user.AvatarUrl,
                    Role = roles.FirstOrDefault(),
                    CreatedAt = user.CreatedAt,
                    LockoutEnd = user.LockoutEnd,
                    OrderCount = user.Orders.Count,
                    TotalSpent = user.Orders.Where(o => o.Status == OrderStatus.Delivered).Sum(o => o.TotalAmount)
                });
            }

            return new PagedResult<UserAdminDto>
            {
                Items = dtos,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<bool> ToggleUserLockAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) throw new KeyNotFoundException("User not found");

            // Don't allow locking admins
            var roles = await _userManager.GetRolesAsync(user);
            if (roles.Contains("Admin")) throw new InvalidOperationException("Cannot lock an admin account");

            if (user.LockoutEnd != null && user.LockoutEnd > DateTimeOffset.UtcNow)
            {
                // Unlock
                await _userManager.SetLockoutEndDateAsync(user, null);
                return false; // Not locked
            }
            else
            {
                // Ensure lockout is enabled for this user
                await _userManager.SetLockoutEnabledAsync(user, true);

                // Lock for 100 years
                await _userManager.SetLockoutEndDateAsync(user, DateTimeOffset.UtcNow.AddYears(100));
                
                // Revoke all refresh tokens for this user
                var tokens = await _context.RefreshTokens
                    .Where(rt => rt.UserId == userId && !rt.IsRevoked)
                    .ToListAsync();
                
                foreach (var token in tokens)
                {
                    token.IsRevoked = true;
                }
                
                await _context.SaveChangesAsync();
                
                return true; // Locked
            }
        }
        public async Task UpdateUserByAdminAsync(string userId, UpdateUserAdminDto dto)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) throw new KeyNotFoundException("User not found");

            user.FullName = dto.FullName ?? user.FullName;
            user.PhoneNumber = dto.Phone ?? user.PhoneNumber;
            
            if (!string.IsNullOrEmpty(dto.Email) && dto.Email != user.Email)
            {
                var existing = await _userManager.FindByEmailAsync(dto.Email);
                if (existing != null) throw new InvalidOperationException("Email đã được sử dụng bởi người dùng khác");
                user.Email = dto.Email;
                user.UserName = dto.Email;
            }

            if (!string.IsNullOrEmpty(dto.Password))
            {
                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                var resetResult = await _userManager.ResetPasswordAsync(user, token, dto.Password);
                if (!resetResult.Succeeded)
                    throw new InvalidOperationException(string.Join(", ", resetResult.Errors.Select(e => e.Description)));
            }

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
                throw new InvalidOperationException(string.Join(", ", result.Errors.Select(e => e.Description)));
        }

        public async Task ChangePasswordAsync(string userId, ChangePasswordDto dto)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) throw new KeyNotFoundException("User not found");

            var result = await _userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
            if (!result.Succeeded)
                throw new InvalidOperationException(string.Join(", ", result.Errors.Select(e => e.Description)));
        }
    }
}
