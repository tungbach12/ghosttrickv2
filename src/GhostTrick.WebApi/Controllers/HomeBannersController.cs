using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using GhostTrick.Infrastructure.Persistence;
using GhostTrick.Application.DTOs;
using GhostTrick.Domain.Entities;
using GhostTrick.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HomeBannersController : ControllerBase
    {
        private readonly GhostTrickContext _context;
        private readonly IPhotoService _photoService;

        public HomeBannersController(GhostTrickContext context, IPhotoService photoService)
        {
            _context = context;
            _photoService = photoService;
        }

        [HttpGet]
        public async Task<IActionResult> GetActiveBanners()
        {
            var banners = await _context.HomeBanners
                .Where(b => !b.IsDeleted && b.IsActive)
                .OrderBy(b => b.DisplayOrder)
                .Select(b => new {
                    b.Id,
                    b.Title,
                    b.Subtitle,
                    b.LinkUrl,
                    b.ImageUrl
                })
                .ToListAsync();
            return Ok(banners);
        }

        [HttpGet("admin")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAdminBanners()
        {
            var banners = await _context.HomeBanners
                .Where(b => !b.IsDeleted)
                .OrderBy(b => b.DisplayOrder)
                .ToListAsync();
            return Ok(banners);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateBanner([FromForm] HomeBannerDto dto)
        {
            if (dto.ImageFile == null)
                return BadRequest("Image file is required.");

            var uploadResult = await _photoService.AddPhotoAsync(dto.ImageFile);
            if (uploadResult.Error != null)
                return BadRequest(uploadResult.Error);

            var banner = new HomeBanner
            {
                Title = dto.Title,
                Subtitle = dto.Subtitle,
                LinkUrl = dto.LinkUrl,
                DisplayOrder = dto.DisplayOrder,
                IsActive = dto.IsActive,
                ImageUrl = uploadResult.Url
            };

            _context.HomeBanners.Add(banner);
            await _context.SaveChangesAsync();

            return Ok(banner);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateBanner(int id, [FromForm] HomeBannerDto dto)
        {
            var banner = await _context.HomeBanners.FindAsync(id);
            if (banner == null || banner.IsDeleted)
                return NotFound();

            banner.Title = dto.Title;
            banner.Subtitle = dto.Subtitle;
            banner.LinkUrl = dto.LinkUrl;
            banner.DisplayOrder = dto.DisplayOrder;
            banner.IsActive = dto.IsActive;

            if (dto.ImageFile != null)
            {
                var uploadResult = await _photoService.AddPhotoAsync(dto.ImageFile);
                if (uploadResult.Error != null)
                    return BadRequest(uploadResult.Error);

                banner.ImageUrl = uploadResult.Url;
            }

            await _context.SaveChangesAsync();
            return Ok(banner);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteBanner(int id)
        {
            var banner = await _context.HomeBanners.FindAsync(id);
            if (banner == null)
                return NotFound();

            banner.IsDeleted = true;
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
