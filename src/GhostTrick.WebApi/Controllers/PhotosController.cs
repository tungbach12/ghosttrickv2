using GhostTrick.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/photos")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class PhotosController : ControllerBase
    {
        private readonly IPhotoService _photoService;

        public PhotosController(IPhotoService photoService)
        {
            _photoService = photoService;
        }

        /// <summary>
        /// General-purpose image upload endpoint (Cloudinary).
        /// Used by admin pages (size charts, banners, etc.)
        /// </summary>
        [HttpPost("upload")]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file provided.");

            var result = await _photoService.AddPhotoAsync(file);

            if (!result.Success)
                return BadRequest(result.Error);

            return Ok(new { url = result.Url, publicId = result.PublicId });
        }
    }
}
