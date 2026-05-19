using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class ProductListDto
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string? SKU { get; set; }
        public decimal Price { get; set; }
        public decimal? OriginalPrice { get; set; }
        public string? MainImageUrl { get; set; }
        public string? CategorySlug { get; set; }
        public string? Subcategory { get; set; }
        public int ActualSalesCount { get; set; }
        public int? ManualSalesCount { get; set; }
        public int SalesCount { get; set; } // Representing the displayed value
        public int CategoryId { get; set; }
        public bool IsOnSale { get; set; }
        public bool IsNewArrival { get; set; }
        public bool IsTrending { get; set; }
        public string? Status { get; set; }
        public int TotalStock { get; set; }
        public int? FlashStock { get; set; }
        public int? SoldCount { get; set; }
        public bool IsDeleted { get; set; }
        public int? SizeChartId { get; set; }
        public DateTime RefreshedAt { get; set; }
        public List<ProductColorDto> Colors { get; set; } = new();
    }
}
