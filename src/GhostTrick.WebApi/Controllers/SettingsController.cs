using GhostTrick.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/settings")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class SettingsController : ControllerBase
    {
        private readonly ISettingsService _settingsService;

        public SettingsController(ISettingsService settingsService)
        {
            _settingsService = settingsService;
        }

        [HttpGet]
        public async Task<IActionResult> GetSettings()
        {
            var settings = await _settingsService.GetAllSettingsAsync();
            
            // Mask sensitive fields for the UI
            foreach (var setting in settings)
            {
                if (setting.Key == "TelegramToken" && !string.IsNullOrEmpty(setting.Value))
                {
                    setting.Value = "********************";
                }
            }
            
            return Ok(settings);
        }

        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicSettings()
        {
            var publicKeys = new[] 
            { 
                "FeedbackSection_Title", 
                "FeedbackSection_Subtitle", 
                "FeedbackSection_ButtonText", 
                "FeedbackSection_ButtonUrl",
                "FeedbackSection_ShowButton",
                "PaymentQRCodeUrl"
            };
            
            var allSettings = await _settingsService.GetAllSettingsAsync();
            var publicSettings = allSettings
                .Where(s => publicKeys.Contains(s.Key))
                .ToDictionary(s => s.Key, s => s.Value);
                
            return Ok(publicSettings);
        }

        [HttpPut("{key}")]
        public async Task<IActionResult> UpdateSetting(string key, [FromBody] UpdateSettingDto dto)
        {
            // Security check: If key is sensitive and value is the mask, skip update
            if (key == "TelegramToken" && dto.Value == "********************")
            {
                return NoContent();
            }

            await _settingsService.UpdateSettingAsync(key, dto.Value);
            return NoContent();
        }
    }

    public class UpdateSettingDto
    {
        public required string Value { get; set; }
    }
}
