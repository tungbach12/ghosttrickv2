using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;


namespace GhostTrick.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductsController : ControllerBase
    {
        private readonly IProductService _productService;

        public ProductsController(IProductService productService)
        {
            _productService = productService;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResult<ProductListDto>>> GetProducts(
            [FromQuery] string? category = null,
            [FromQuery] string? sort = null,
            [FromQuery] bool? onSale = null,
            [FromQuery] string? q = null,
            [FromQuery] string? status = null,
            [FromQuery] decimal? minPrice = null,
            [FromQuery] decimal? maxPrice = null,
            [FromQuery] string? stockStatus = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var isAdmin = User.IsInRole("Admin");
            var result = await _productService.GetProductsAsync(category, sort, onSale, q, status, minPrice, maxPrice, stockStatus, page, pageSize, isAdmin);
            return Ok(result);
        }

        [HttpGet("best-sellers")]
        public async Task<ActionResult<List<ProductListDto>>> GetBestSellers([FromQuery] int top = 8)
        {
            var result = await _productService.GetBestSellersAsync(top);
            return Ok(result);
        }

        [HttpGet("new-arrivals")]
        public async Task<ActionResult<List<ProductListDto>>> GetNewArrivals([FromQuery] int top = 8)
        {
            var result = await _productService.GetNewArrivalsAsync(top);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ProductDetailDto>> GetProduct(int id)
        {
            var isAdmin = User.IsInRole("Admin");
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var product = await _productService.GetProductAsync(id, isAdmin, userId);

            return Ok(product);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<ProductDetailDto>> CreateProduct([FromForm] CreateProductDto dto)
        {
            var product = await _productService.CreateProductAsync(dto);
            return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, product);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<ProductDetailDto>> UpdateProduct(int id, [FromForm] CreateProductDto dto)
        {
            var product = await _productService.UpdateProductAsync(id, dto);
            return Ok(product);
        }

        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] string status)
        {
            await _productService.UpdateStatusAsync(id, status);
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            await _productService.DeleteProductAsync(id);
            return NoContent();
        }
    }
}
