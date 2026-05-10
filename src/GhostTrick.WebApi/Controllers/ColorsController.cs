using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ColorsController : ControllerBase
    {
        private readonly ICatalogService _catalogService;

        public ColorsController(ICatalogService catalogService)
        {
            _catalogService = catalogService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProductColor>>> GetColors()
        {
            var result = await _catalogService.GetColorsAsync();
            return Ok(result);
        }

        [HttpPost]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<ActionResult<ProductColor>> CreateColor(ProductColor color)
        {
            var result = await _catalogService.CreateColorAsync(color);
            return CreatedAtAction(nameof(GetColors), new { id = result.Id }, result);
        }

        [HttpDelete("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteColor(int id)
        {
            await _catalogService.DeleteColorAsync(id);
            return NoContent();
        }
    }
}
