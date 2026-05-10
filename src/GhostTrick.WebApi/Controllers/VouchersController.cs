using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VouchersController : ControllerBase
    {
        private readonly IVoucherService _voucherService;

        public VouchersController(IVoucherService voucherService)
        {
            _voucherService = voucherService;
        }

        private string? UserId => User.FindFirstValue(ClaimTypes.NameIdentifier);

        [HttpGet]
        public async Task<IActionResult> GetVouchers(
            [FromQuery] int page = 1, 
            [FromQuery] int pageSize = 10, 
            [FromQuery] string? q = null, 
            [FromQuery] string? status = null,
            [FromQuery] string? category = null,
            [FromQuery] string? orderBy = null)
        {
            var result = await _voucherService.GetVouchersAsync(page, pageSize, q, status, category, orderBy);
            return Ok(result);
        }

        [HttpGet("public")]
        public async Task<IActionResult> GetPublicVouchers()
        {
            var vouchers = await _voucherService.GetPublicVouchersAsync();
            return Ok(vouchers);
        }

        [HttpGet("my-wallet")]
        [Authorize]
        public async Task<IActionResult> GetMyWallet()
        {
            if (UserId == null) return Unauthorized();
            var wallet = await _voucherService.GetMyWalletAsync(UserId);
            return Ok(wallet);
        }

        [HttpPost("save/{code}")]
        [Authorize]
        public async Task<IActionResult> SaveToWallet(string code)
        {
            try
            {
                if (UserId == null) return Unauthorized();
                await _voucherService.SaveToWalletAsync(code, UserId);
                return Ok(new { message = "Đã lưu mã vào ví của bạn!" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetVoucher(int id)
        {
            try
            {
                var voucher = await _voucherService.GetVoucherAsync(id);
                return Ok(voucher);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPost("validate")]
        public async Task<ActionResult<VoucherResultDto>> Validate([FromBody] ValidateVoucherDto dto)
        {
            try
            {
                var result = await _voucherService.ValidateVoucherAsync(dto, UserId);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateVoucher([FromBody] CreateVoucherDto dto)
        {
            try
            {
                var voucher = await _voucherService.CreateVoucherAsync(dto);
                return CreatedAtAction(nameof(GetVoucher), new { id = voucher.Id }, voucher);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateVoucher(int id, [FromBody] CreateVoucherDto dto)
        {
            try
            {
                var voucher = await _voucherService.UpdateVoucherAsync(id, dto);
                return Ok(voucher);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteVoucher(int id)
        {
            try
            {
                await _voucherService.DeleteVoucherAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }
    }
}
