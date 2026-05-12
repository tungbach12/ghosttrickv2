using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SizeChartsController : ControllerBase
    {
        private readonly ISizeChartService _sizeChartService;

        public SizeChartsController(ISizeChartService sizeChartService)
        {
            _sizeChartService = sizeChartService;
        }

        [HttpGet]
        public async Task<ActionResult<List<SizeChartDto>>> GetAll()
        {
            var result = await _sizeChartService.GetAllAsync();
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<SizeChartDto>> GetById(int id)
        {
            var result = await _sizeChartService.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SizeChartDto>> Create(CreateSizeChartDto dto)
        {
            var result = await _sizeChartService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<SizeChartDto>> Update(int id, CreateSizeChartDto dto)
        {
            var result = await _sizeChartService.UpdateAsync(id, dto);
            return Ok(result);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            await _sizeChartService.DeleteAsync(id);
            return NoContent();
        }
    }
}
