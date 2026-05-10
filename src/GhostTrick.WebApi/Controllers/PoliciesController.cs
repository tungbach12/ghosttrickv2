using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PoliciesController : ControllerBase
    {
        private readonly ICatalogService _catalogService;

        public PoliciesController(ICatalogService catalogService)
        {
            _catalogService = catalogService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Policy>>> GetPolicies()
        {
            var result = await _catalogService.GetPoliciesAsync();
            return Ok(result);
        }

        [HttpGet("{slug}")]
        public async Task<ActionResult<Policy>> GetPolicy(string slug)
        {
            try
            {
                var result = await _catalogService.GetPolicyBySlugAsync(slug);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPut("{slug}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdatePolicy(string slug, Policy policy)
        {
            try
            {
                var result = await _catalogService.UpdatePolicyAsync(slug, policy);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }
    }
}
