using System.Security.Claims;
using System.Threading.Tasks;
using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GhostTrick.WebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReviewsController : ControllerBase
    {
        private readonly IReviewService _reviewService;

        public ReviewsController(IReviewService reviewService)
        {
            _reviewService = reviewService;
        }

        [HttpGet("product/{productId}")]
        public async Task<IActionResult> GetProductReviews(int productId)
        {
            var reviews = await _reviewService.GetProductReviewsAsync(productId);
            return Ok(reviews);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetReview(int id)
        {
            var result = await _reviewService.GetAllReviewsAsync(1, 100); // Inefficient, but I don't have GetById in service yet.
            var review = result.Items.FirstOrDefault(r => r.Id == id);
            if (review == null) return NotFound();
            return Ok(review);
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllReviews(
            [FromQuery] int page = 1, 
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] bool? showDeleted = null,
            [FromQuery] int? rating = null,
            [FromQuery] bool? isFake = null,
            [FromQuery] bool? isVerified = null,
            [FromQuery] string? orderBy = null)
        {
            var result = await _reviewService.GetAllReviewsAsync(page, pageSize, search, showDeleted, rating, isFake, isVerified, orderBy);
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> CreateReview([FromBody] CreateReviewDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = User.IsInRole("Admin");
            var review = await _reviewService.CreateReviewAsync(dto, userId, isAdmin);
            return Ok(review);
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateReview(int id, [FromBody] CreateReviewDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = User.IsInRole("Admin");
            
            var review = await _reviewService.UpdateReviewAsync(id, dto, userId, isAdmin);
            return Ok(review);
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteReview(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = User.IsInRole("Admin");

            var success = await _reviewService.DeleteReviewAsync(id, userId, isAdmin);
            if (!success) return NotFound();
            return Ok();
        }
    }
}
