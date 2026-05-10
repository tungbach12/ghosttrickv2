using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/sale-events")]
    [ApiController]
    public class SaleEventsController : ControllerBase
    {
        private readonly IMarketingService _marketingService;

        public SaleEventsController(IMarketingService marketingService)
        {
            _marketingService = marketingService;
        }

        [HttpGet]
        public async Task<IActionResult> GetSaleEvents()
        {
            var result = await _marketingService.GetSaleEventsAsync();
            return Ok(result);
        }

        [HttpGet("admin")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetSaleEventsAdmin()
        {
            // For now, reuse service, or you might want to add a specific admin method in service
            var result = await _marketingService.GetSaleEventsAsync();
            return Ok(result);
        }

        [HttpGet("{slug}")]
        public async Task<IActionResult> GetSaleEvent(string slug)
        {
            try
            {
                var result = await _marketingService.GetSaleEventAsync(slug);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpGet("id/{id}")]
        public async Task<IActionResult> GetSaleEventById(int id)
        {
            try
            {
                var result = await _marketingService.GetSaleEventByIdAsync(id);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromForm] SaleEventDto dto)
        {
            var result = await _marketingService.CreateSaleEventAsync(dto);
            return Ok(result);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromForm] SaleEventDto dto)
        {
            try
            {
                var result = await _marketingService.UpdateSaleEventAsync(id, dto);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            await _marketingService.DeleteSaleEventAsync(id);
            return NoContent();
        }

        [HttpPost("{id}/products")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateProducts(int id, [FromBody] List<SaleEventProductInputDto> products)
        {
            await _marketingService.UpdateSaleProductsAsync(id, products);
            return Ok();
        }
    }
}
