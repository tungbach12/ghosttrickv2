using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using GhostTrick.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PoliciesController : ControllerBase
    {
        private readonly GhostTrickContext _context;

        public PoliciesController(GhostTrickContext context)
        {
            _context = context;
        }

        /// <summary>GET /api/policies</summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var policies = await _context.Policies
                .Select(p => new { p.Slug, p.Title, p.UpdatedAt })
                .ToListAsync();
            return Ok(policies);
        }

        /// <summary>GET /api/policies/{slug}</summary>
        [HttpGet("{slug}")]
        public async Task<IActionResult> GetBySlug(string slug)
        {
            var policy = await _context.Policies
                .FirstOrDefaultAsync(p => p.Slug == slug);

            if (policy == null)
                return NotFound(new { message = "Chính sách không tồn tại." });

            return Ok(policy);
        }
    }
}
