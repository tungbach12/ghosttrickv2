using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using GhostTrick.Infrastructure.Persistence;
using GhostTrick.Application.DTOs;
using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VouchersController : ControllerBase
    {
        private readonly GhostTrickContext _context;

        public VouchersController(GhostTrickContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetVouchers()
        {
            var now = DateTime.UtcNow;
            var vouchers = await _context.Vouchers
                .Where(v => !v.IsDeleted && v.IsActive && (v.EndDate == null || v.EndDate >= now))
                .Select(v => new
                {
                    v.Id,
                    v.Code,
                    v.Description,
                    v.DiscountType,
                    v.DiscountValue,
                    v.MinOrderAmount,
                    v.MaxDiscountAmount,
                    v.UsageLimit,
                    v.LimitPerUser,
                    v.UsedCount,
                    v.EndDate,
                    v.IsActive
                })
                .ToListAsync();

            return Ok(vouchers);
        }

        [HttpGet("my-wallet")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> GetMyWallet()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var wallet = await _context.UserVouchers
                .Include(uv => uv.Voucher)
                .Where(uv => uv.UserId == userId && !uv.Voucher!.IsDeleted)
                .Select(uv => new
                {
                    uv.Voucher!.Id,
                    uv.Voucher.Code,
                    uv.Voucher.Description,
                    uv.Voucher.DiscountType,
                    uv.Voucher.DiscountValue,
                    uv.Voucher.MinOrderAmount,
                    uv.Voucher.MaxDiscountAmount,
                    uv.Voucher.EndDate,
                    uv.IsUsed,
                    uv.SavedAt
                })
                .ToListAsync();

            return Ok(wallet);
        }

        [HttpPost("save/{code}")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> SaveToWallet(string code)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var voucher = await _context.Vouchers.FirstOrDefaultAsync(v => v.Code == code && !v.IsDeleted && v.IsActive);
            if (voucher == null) return NotFound(new { message = "Mã giảm giá không tồn tại." });

            var existing = await _context.UserVouchers.AnyAsync(uv => uv.UserId == userId && uv.VoucherId == voucher.Id);
            if (existing) return BadRequest(new { message = "Bạn đã lưu mã này rồi." });

            var userVoucher = new UserVoucher
            {
                UserId = userId,
                VoucherId = voucher.Id
            };

            _context.UserVouchers.Add(userVoucher);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã lưu mã vào ví của bạn!" });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Voucher>> GetVoucher(int id)
        {
            var voucher = await _context.Vouchers.FindAsync(id);
            if (voucher == null || voucher.IsDeleted) return NotFound();
            return Ok(voucher);
        }

        /// <summary>POST /api/vouchers/validate</summary>
        [HttpPost("validate")]
        public async Task<ActionResult<VoucherResultDto>> Validate([FromBody] ValidateVoucherDto dto)
        {
            var now = DateTime.UtcNow;
            var voucher = await _context.Vouchers.FirstOrDefaultAsync(v =>
                v.Code == dto.Code &&
                v.IsActive &&
                (v.EndDate == null || v.EndDate >= now) &&
                (v.UsageLimit == 0 || v.UsedCount < v.UsageLimit));

            if (voucher == null)
                return BadRequest(new { message = "Mã giảm giá không hợp lệ hoặc đã hết hạn." });

            // Check limit per user
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId != null && voucher.LimitPerUser > 0)
            {
                var userUsageCount = await _context.VoucherUsages
                    .CountAsync(vu => vu.VoucherId == voucher.Id && vu.UserId == userId);
                
                if (userUsageCount >= voucher.LimitPerUser)
                {
                    return BadRequest(new { message = $"Bạn đã hết lượt sử dụng mã này (Tối đa {voucher.LimitPerUser} lần)." });
                }
            }

            if (dto.OrderAmount < voucher.MinOrderAmount)
                return BadRequest(new
                {
                    message = $"Đơn hàng tối thiểu {voucher.MinOrderAmount:N0}₫ để dùng mã này."
                });

            decimal discountAmount = voucher.DiscountType == DiscountType.Percent
                ? Math.Min(dto.OrderAmount * voucher.DiscountValue / 100,
                           voucher.MaxDiscountAmount > 0 ? voucher.MaxDiscountAmount : decimal.MaxValue)
                : voucher.DiscountValue;

            return Ok(new VoucherResultDto
            {
                Code = voucher.Code,
                Description = voucher.Description,
                DiscountType = voucher.DiscountType.ToString(),
                DiscountValue = voucher.DiscountValue,
                DiscountAmount = Math.Min(discountAmount, dto.OrderAmount),
                LimitPerUser = voucher.LimitPerUser
            });
        }
        [HttpPost]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<ActionResult<Voucher>> CreateVoucher(CreateVoucherDto dto)
        {
            // Check if code exists
            if (await _context.Vouchers.AnyAsync(v => v.Code == dto.Code && !v.IsDeleted))
            {
                return BadRequest(new { message = "Mã giảm giá này đã tồn tại." });
            }

            var voucher = new Voucher
            {
                Code = dto.Code,
                Description = dto.Description,
                DiscountType = dto.DiscountType,
                DiscountValue = dto.DiscountValue,
                MinOrderAmount = dto.MinOrderAmount,
                MaxDiscountAmount = dto.MaxDiscountAmount,
                UsageLimit = dto.UsageLimit,
                LimitPerUser = dto.LimitPerUser,
                IsActive = dto.IsActive,
                EndDate = dto.EndDate
            };

            _context.Vouchers.Add(voucher);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetVoucher), new { id = voucher.Id }, voucher);
        }

        [HttpDelete("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteVoucher(int id)
        {
            var voucher = await _context.Vouchers.FindAsync(id);
            if (voucher == null) return NotFound();

            voucher.IsDeleted = true;
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
