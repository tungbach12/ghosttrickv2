using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class CartItemResponseDto
    {
        public int VariantId { get; set; }
        public int ProductId { get; set; }
        public string? Name { get; set; }
        public decimal Price { get; set; }
        public string? MainImageUrl { get; set; }
        public string? Size { get; set; }
        public ProductColor? Color { get; set; }
        public int Quantity { get; set; }
        public int Stock { get; set; }
        public decimal? SalePrice { get; set; }
        public decimal RegularPrice { get; set; }
        public int PurchasedInSaleCount { get; set; }
    }
}
