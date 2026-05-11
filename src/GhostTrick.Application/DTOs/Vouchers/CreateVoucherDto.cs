using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class CreateVoucherDto
    {
        [Required, MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        [MaxLength(300)]
        public string? Description { get; set; }

        public VoucherCategory Category { get; set; } = VoucherCategory.General;

        public DiscountType DiscountType { get; set; } = DiscountType.Fixed;

        [Range(0, double.MaxValue)]
        public decimal DiscountValue { get; set; }

        [Range(0, double.MaxValue)]
        public decimal MinOrderAmount { get; set; }

        [Range(0, double.MaxValue)]
        public decimal MaxDiscountAmount { get; set; }

        [Range(0, int.MaxValue)]
        public int UsageLimit { get; set; }

        [Range(0, int.MaxValue)]
        public int LimitPerUser { get; set; } = 1;

        public bool IsActive { get; set; } = true;

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }
}
