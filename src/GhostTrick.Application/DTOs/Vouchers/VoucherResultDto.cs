using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class VoucherResultDto
    {
        public required string Code { get; set; }
        public string? Description { get; set; }
        public required string Category { get; set; } // General, Shipping
        public required string DiscountType { get; set; }
        public decimal DiscountValue { get; set; }
        public decimal DiscountAmount { get; set; }  // calculated
        public int LimitPerUser { get; set; }
    }
}
