using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderService _orderService;

        public OrdersController(IOrderService orderService)
        {
            _orderService = orderService;
        }

        private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        [HttpGet]
        public async Task<ActionResult<List<OrderResponseDto>>> GetMyOrders()
        {
            var orders = await _orderService.GetMyOrdersAsync(UserId);
            return Ok(orders);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<OrderResponseDto>> GetOrder(int id)
        {
            if (User.IsInRole("Admin"))
            {
                var orderAdmin = await _orderService.GetOrderByIdAsync(id);
                return Ok(orderAdmin);
            }

            var order = await _orderService.GetOrderAsync(id, UserId);
            return Ok(order);
        }

        [HttpPost]
        public async Task<ActionResult<OrderResponseDto>> CreateOrder([FromBody] CreateOrderDto dto)
        {
            var order = await _orderService.CreateOrderAsync(dto, UserId);
            return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, order);
        }

        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> CancelOrder(int id)
        {
            await _orderService.CancelOrderAsync(id, UserId);
            return Ok(new { message = "Đơn hàng đã được hủy thành công." });
        }

        [HttpGet("all")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<PagedResult<OrderResponseDto>>> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? q = null,
            [FromQuery] string? status = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] decimal? minAmount = null,
            [FromQuery] decimal? maxAmount = null,
            [FromQuery] string? paymentMethod = null,
            [FromQuery] string? paymentStatus = null,
            [FromQuery] string? orderBy = null,
            [FromQuery] string? category = null)
        {
            var result = await _orderService.GetAllOrdersAsync(page, pageSize, q, status, startDate, endDate, minAmount, maxAmount, paymentMethod, paymentStatus, orderBy, category);
            return Ok(result);
        }

        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusDto dto)
        {
            await _orderService.UpdateOrderStatusAsync(id, dto);
            return Ok(new { message = "Cập nhật trạng thái thành công." });
        }

        [HttpPut("{id}/payment-status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdatePaymentStatus(int id, [FromBody] UpdatePaymentStatusDto dto)
        {
            await _orderService.UpdatePaymentStatusAsync(id, dto);
            return Ok(new { message = "Cập nhật trạng thái thanh toán thành công." });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteOrder(int id)
        {
            await _orderService.SoftDeleteOrderAsync(id);
            return NoContent();
        }
    }
}
