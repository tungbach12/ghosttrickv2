using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using GhostTrick.Infrastructure.Persistence;
using GhostTrick.Application.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GhostTrick.Domain.Entities;
using System.Collections.Generic;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/sale-events")]
    [ApiController]
    public class SaleEventsController : ControllerBase
    {
        private readonly GhostTrickContext _context;
        private readonly IPhotoService _photoService;

        public SaleEventsController(GhostTrickContext context, IPhotoService photoService)
        {
            _context = context;
            _photoService = photoService;
        }

        /// <summary>GET /api/sale-events — currently active event only</summary>
        [HttpGet]
        public async Task<IActionResult> GetActiveEvents()
        {
            var events = await _context.SaleEvents
                .Where(e => !e.IsDeleted && e.IsActive)
                .Select(e => new
                {
                    e.Id,
                    e.Name,
                    e.Slug,
                    e.Description,
                    e.BannerUrl,
                    e.StartTime,
                    e.EndTime,
                    e.IsActive
                })
                .ToListAsync();

            return Ok(events);
        }

        /// <summary>GET /api/sale-events/{slug}</summary>
        [HttpGet("{slug}")]
        public async Task<IActionResult> GetEvent(string slug)
        {
            var now = DateTime.UtcNow;
            var saleEvent = await _context.SaleEvents
                .Include(e => e.SaleEventProducts)
                    .ThenInclude(sep => sep.Product)
                        .ThenInclude(p => p!.Category)
                .Include(e => e.SaleEventProducts)
                    .ThenInclude(sep => sep.Product)
                        .ThenInclude(p => p!.Variants)
                .FirstOrDefaultAsync(e => e.Slug == slug && !e.IsDeleted);

            if (saleEvent == null)
                return NotFound(new { message = "Chương trình sale không tồn tại." });

            return Ok(new
            {
                saleEvent.Id,
                saleEvent.Name,
                saleEvent.Slug,
                saleEvent.Description,
                saleEvent.BannerUrl,
                saleEvent.StartTime,
                saleEvent.EndTime,
                IsActive = saleEvent.IsActive,
                Products = saleEvent.SaleEventProducts.Select(sep => new ProductListDto
                {
                    Id = sep.Product!.Id,
                    Name = sep.Product.Name,
                    SKU = sep.Product.SKU,
                    Price = sep.Product.Price,
                    OriginalPrice = sep.Product.OriginalPrice,
                    MainImageUrl = sep.Product.MainImageUrl,
                    CategorySlug = sep.Product.Category?.Slug,
                    Subcategory = sep.Product.Subcategory,
                    SalesCount = sep.Product.SalesCount,
                    IsOnSale = sep.Product.IsOnSale,
                    Colors = sep.Product.Variants.Select(v => v.Color).Distinct().ToList()
                })
            });
        }

        /// <summary>GET /api/sale-events/id/{id}</summary>
        [HttpGet("id/{id}")]
        public async Task<IActionResult> GetEventById(int id)
        {
            var saleEvent = await _context.SaleEvents
                .Include(e => e.SaleEventProducts)
                .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);

            if (saleEvent == null)
                return NotFound(new { message = "Chương trình sale không tồn tại." });

            return Ok(new
            {
                saleEvent.Id,
                saleEvent.Name,
                saleEvent.Slug,
                saleEvent.Description,
                saleEvent.BannerUrl,
                saleEvent.StartTime,
                saleEvent.EndTime,
                IsActive = saleEvent.IsActive,
                ProductIds = saleEvent.SaleEventProducts.Select(sep => sep.ProductId).ToList()
            });
        }

        /// <summary>GET /api/sale-events/admin — all events</summary>
        [HttpGet("admin")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAdminEvents()
        {
            var events = await _context.SaleEvents
                .Where(e => !e.IsDeleted)
                .OrderByDescending(e => e.StartTime)
                .ToListAsync();

            return Ok(events);
        }

        /// <summary>POST /api/sale-events</summary>
        [HttpPost]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateEvent([FromForm] SaleEventDto dto)
        {
            string? bannerUrl = null;
            if (dto.BannerFile != null)
            {
                var uploadResult = await _photoService.AddPhotoAsync(dto.BannerFile);
                if (uploadResult.Error != null) return BadRequest(uploadResult.Error);
                bannerUrl = uploadResult.Url;
            }

            if (string.IsNullOrEmpty(dto.Slug))
            {
                dto.Slug = dto.Name.ToLower().Replace(" ", "-");
            }

            var saleEvent = new SaleEvent
            {
                Name = dto.Name,
                Slug = dto.Slug,
                Description = dto.Description,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                IsActive = dto.IsActive,
                BannerUrl = bannerUrl
            };

            _context.SaleEvents.Add(saleEvent);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEvent), new { slug = saleEvent.Slug }, saleEvent);
        }

        /// <summary>PUT /api/sale-events/{id}</summary>
        [HttpPut("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateEvent(int id, [FromForm] SaleEventDto dto)
        {
            var saleEvent = await _context.SaleEvents.FindAsync(id);
            if (saleEvent == null) return NotFound();

            if (dto.BannerFile != null)
            {
                var uploadResult = await _photoService.AddPhotoAsync(dto.BannerFile);
                if (uploadResult.Error != null) return BadRequest(uploadResult.Error);
                saleEvent.BannerUrl = uploadResult.Url;
            }

            saleEvent.Name = dto.Name;
            saleEvent.Description = dto.Description;
            saleEvent.StartTime = dto.StartTime;
            saleEvent.EndTime = dto.EndTime;
            saleEvent.Slug = dto.Slug;
            saleEvent.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        /// <summary>DELETE /api/sale-events/{id}</summary>
        [HttpDelete("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteEvent(int id)
        {
            var saleEvent = await _context.SaleEvents.FindAsync(id);
            if (saleEvent == null) return NotFound();

            saleEvent.IsDeleted = true;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        /// <summary>POST /api/sale-events/{id}/products — assign multiple products</summary>
        [HttpPost("{id}/products")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> AssignProducts(int id, [FromBody] List<int> productIds)
        {
            var saleEvent = await _context.SaleEvents
                .Include(e => e.SaleEventProducts)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (saleEvent == null) return NotFound();

            // Clear existing
            _context.SaleEventProducts.RemoveRange(saleEvent.SaleEventProducts);

            // Add new
            foreach (var pid in productIds)
            {
                _context.SaleEventProducts.Add(new SaleEventProduct
                {
                    SaleEventId = id,
                    ProductId = pid
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Gán sản phẩm thành công." });
        }

        /// <summary>POST /api/sale-events/{id}/activate — set as the only active event</summary>
        [HttpPost("{id}/activate")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> ActivateEvent(int id)
        {
            var saleEvent = await _context.SaleEvents.FindAsync(id);
            if (saleEvent == null) return NotFound();

            // Deactivate all others
            var allEvents = await _context.SaleEvents.Where(e => !e.IsDeleted).ToListAsync();
            foreach (var e in allEvents)
            {
                e.IsActive = (e.Id == id);
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Kích hoạt đợt Sale thành công. Các đợt khác đã được tạm dừng." });
        }
    }
}
