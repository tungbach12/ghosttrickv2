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
        private readonly IPhotoService _photoService;

        public FeedbacksController(IFeedbackService feedbackService, IPhotoService photoService)
        {
            _feedbackService = feedbackService;
            _photoService = photoService;
        }

        // GET: api/Feedbacks (Public - returns flat list)
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

        // --- Feedback Items ---

        [HttpPost("upload")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            var result = await _photoService.AddPhotoAsync(file);
            
            if (!result.Success)
                return BadRequest(result.Error);

            return Ok(new { url = result.Url, publicId = result.PublicId });
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
