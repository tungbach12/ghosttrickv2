using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/topbar-promos")]
    [ApiController]
    public class TopBarPromosController : ControllerBase
    {
        private readonly IMarketingService _marketingService;

        public TopBarPromosController(IMarketingService marketingService)
        {
            _marketingService = marketingService;
        }

        [HttpGet]
        public async Task<IActionResult> GetPromos()
        {
            var result = await _marketingService.GetTopBarPromosAsync(activeOnly: true);
            return Ok(result);
        }

        [HttpGet("admin")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetPromosAdmin()
        {
            var result = await _marketingService.GetTopBarPromosAsync(activeOnly: false);
            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] TopBarPromoDto dto)
        {
            var result = await _marketingService.CreateTopBarPromoAsync(dto);
            return Ok(result);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] TopBarPromoDto dto)
        {
            try
            {
                var result = await _marketingService.UpdateTopBarPromoAsync(id, dto);
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
            await _marketingService.DeleteTopBarPromoAsync(id);
            return NoContent();
        }
    }
}
