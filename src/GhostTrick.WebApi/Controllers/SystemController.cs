using GhostTrick.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GhostTrick.WebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class SystemController : ControllerBase
    {
        private readonly ISystemService _systemService;

        public SystemController(ISystemService systemService)
        {
            _systemService = systemService;
        }

        [HttpPost("backup-now")]
        public async Task<IActionResult> BackupNow()
        {
            var success = await _systemService.CreateBackupAsync();
            if (success)
            {
                return Ok(new { message = "Backup đã được tạo và gửi qua Telegram thành công!" });
            }
            return BadRequest(new { message = "Có lỗi xảy ra khi tạo backup hoặc gửi qua Telegram. Vui lòng kiểm tra lại cấu hình." });
        }
    }
}
