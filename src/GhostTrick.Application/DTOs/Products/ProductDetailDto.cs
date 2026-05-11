using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class ProductDetailDto : ProductListDto
    {
        public string? Description { get; set; }
        public string? CategoryName { get; set; }
        public List<VariantDto> Variants { get; set; } = new();
        public List<string> Images { get; set; } = new();
        public bool IsEligibleToReview { get; set; }
        public int? EligibleOrderId { get; set; }
    }
}
