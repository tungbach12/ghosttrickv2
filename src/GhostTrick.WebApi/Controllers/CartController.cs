using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CartController : ControllerBase
    {
        private readonly ICartService _cartService;

        public CartController(ICartService cartService)
        {
            _cartService = cartService;
        }

        private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        [HttpGet]
        public async Task<IActionResult> GetCart()
        {
            var cartItems = await _cartService.GetCartAsync(UserId);
            return Ok(cartItems);
        }

        [HttpPost]
        public async Task<IActionResult> AddToCart([FromBody] CartRequestDto request)
        {
            try
            {
                await _cartService.AddToCartAsync(request, UserId);
                return Ok(new { success = true });
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

        [HttpDelete("{variantId}")]
        public async Task<IActionResult> RemoveFromCart(int variantId)
        {
            await _cartService.RemoveFromCartAsync(variantId, UserId);
            return Ok(new { success = true });
        }

        [HttpPost("sync")]
        public async Task<IActionResult> SyncCart([FromBody] List<CartRequestDto> guestCart)
        {
            await _cartService.SyncCartAsync(guestCart, UserId);
            return Ok(new { success = true });
        }
    }
}
