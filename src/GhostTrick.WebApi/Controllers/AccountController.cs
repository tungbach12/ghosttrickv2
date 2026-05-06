using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using GhostTrick.Domain.Entities;
using GhostTrick.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/account")]
    [ApiController]
    [Authorize]
    public class AccountController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IPhotoService _photoService;

        public AccountController(UserManager<ApplicationUser> userManager, IPhotoService photoService)
        {
            _userManager = userManager;
            _photoService = photoService;
        }

        [HttpPost("avatar")]
        public async Task<IActionResult> UploadAvatar([FromForm] AvatarUploadDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByIdAsync(userId!);

            if (user == null) return NotFound("User not found");

            if (dto.File == null || dto.File.Length == 0) return BadRequest("No file uploaded");

            var result = await _photoService.AddPhotoAsync(dto.File);

            if (result.Error != null) return BadRequest(result.Error);

            // Update user avatar
            user.AvatarUrl = result.Url;
            await _userManager.UpdateAsync(user);

            return Ok(new { avatarUrl = user.AvatarUrl });
        }

        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await _userManager.FindByIdAsync(userId!);

            if (user == null) return NotFound("User not found");

            user.FullName = dto.FullName;
            user.PhoneNumber = dto.Phone; // IdentityUser uses PhoneNumber
            // user.Phone is a custom field in ApplicationUser, let's use both to be safe or clarify which one is used
            user.Phone = dto.Phone; 
            
            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded) return BadRequest(result.Errors);

            return Ok(new { 
                fullName = user.FullName, 
                phone = user.Phone,
                email = user.Email
            });
        }
    }

    public class UpdateProfileDto
    {
        public string? FullName { get; set; }
        public string? Phone { get; set; }
    }

    public class AvatarUploadDto
    {
        public IFormFile? File { get; set; }
    }
}
