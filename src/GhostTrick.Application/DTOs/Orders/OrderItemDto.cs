using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class OrderItemDto
    {
        [Range(1, int.MaxValue)]
        public int VariantId { get; set; }

        [Range(1, 100, ErrorMessage = "Số lượng phải từ 1-100")]
        public int Quantity { get; set; }
    }
}
