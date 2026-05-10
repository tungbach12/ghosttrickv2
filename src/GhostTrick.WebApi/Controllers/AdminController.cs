using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;
        private readonly IUserService _userService;

        public AdminController(IAdminService adminService, IUserService userService)
        {
            _adminService = adminService;
            _userService = userService;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
        {
            var stats = await _adminService.GetDashboardStatsAsync(startDate, endDate);
            return Ok(stats);
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? q = null)
        {
            var result = await _userService.GetUsersAsync(page, pageSize, q);
            return Ok(result);
        }

        [HttpPost("users/{id}/toggle-lock")]
        public async Task<IActionResult> ToggleUserLock(string id)
        {
            var isLocked = await _userService.ToggleUserLockAsync(id);
            return Ok(new { isLocked });
        }

        [HttpPut("users/{id}")]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserAdminDto dto)
        {
            try
            {
                await _userService.UpdateUserByAdminAsync(id, dto);
                return Ok(new { message = "Cập nhật người dùng thành công." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
