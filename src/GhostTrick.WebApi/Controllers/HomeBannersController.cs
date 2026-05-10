using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/home-banners")]
    [ApiController]
    public class HomeBannersController : ControllerBase
    {
        private readonly IMarketingService _marketingService;

        public HomeBannersController(IMarketingService marketingService)
        {
            _marketingService = marketingService;
        }

        [HttpGet]
        public async Task<IActionResult> GetBanners()
        {
            var result = await _marketingService.GetBannersAsync();
            return Ok(result);
        }

        [HttpGet("admin")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetBannersAdmin()
        {
            var result = await _marketingService.GetBannersAsync();
            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromForm] HomeBannerDto dto)
        {
            var result = await _marketingService.CreateBannerAsync(dto);
            return Ok(result);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromForm] HomeBannerDto dto)
        {
            try
            {
                var result = await _marketingService.UpdateBannerAsync(id, dto);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            await _marketingService.DeleteBannerAsync(id);
            return NoContent();
        }
    }
}
