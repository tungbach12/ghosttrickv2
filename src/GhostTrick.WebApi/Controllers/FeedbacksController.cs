using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FeedbacksController : ControllerBase
    {
        private readonly IFeedbackService _feedbackService;

        public FeedbacksController(IFeedbackService feedbackService)
        {
            _feedbackService = feedbackService;
        }

        // GET: api/Feedbacks
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Feedback>>> GetFeedbacks()
        {
            var results = await _feedbackService.GetActiveFeedbacksAsync();
            return Ok(results);
        }

        // GET: api/Feedbacks/admin
        [HttpGet("admin")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<Feedback>>> GetFeedbacksAdmin()
        {
            var results = await _feedbackService.GetAllFeedbacksAdminAsync();
            return Ok(results);
        }

        [HttpPost("upload")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "feedbacks");
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            var fileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
            var filePath = Path.Combine(uploadsFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var url = $"{Request.Scheme}://{Request.Host}/uploads/feedbacks/{fileName}";
            return Ok(new { url });
        }

        // POST: api/Feedbacks
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<Feedback>> PostFeedback(Feedback feedback)
        {
            await _feedbackService.CreateFeedbackAsync(feedback);
            return CreatedAtAction("GetFeedbacks", new { id = feedback.Id }, feedback);
        }

        // PUT: api/Feedbacks/5
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> PutFeedback(int id, Feedback feedback)
        {
            if (id != feedback.Id)
            {
                return BadRequest();
            }

            await _feedbackService.UpdateFeedbackAsync(id, feedback);
            return NoContent();
        }

        // DELETE: api/Feedbacks/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteFeedback(int id)
        {
            await _feedbackService.DeleteFeedbackAsync(id);
            return NoContent();
        }
    }
}
