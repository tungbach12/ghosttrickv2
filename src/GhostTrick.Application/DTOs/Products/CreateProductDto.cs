using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class CreateProductDto
    {
        [Required, MaxLength(300)]
        public required string Name { get; set; }
        public string? Description { get; set; }
        [Required, MaxLength(50)]
        public required string SKU { get; set; }
        public decimal Price { get; set; }
        public decimal? OriginalPrice { get; set; }
        public int CategoryId { get; set; }
        public string? Subcategory { get; set; }
        public bool IsOnSale { get; set; }
        public bool IsNewArrival { get; set; }
        public bool IsTrending { get; set; }
        public string? Status { get; set; } // Active, Draft, Archived
        public int? ManualSalesCount { get; set; }
        public List<CreateVariantDto> Variants { get; set; } = new();
        public IFormFile? MainImage { get; set; }
        public List<IFormFile> OtherImages { get; set; } = new();
        public List<string> ExistingImages { get; set; } = new();
    }
}
