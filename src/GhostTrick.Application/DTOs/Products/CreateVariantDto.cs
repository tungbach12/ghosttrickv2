using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class CreateVariantDto
    {
        public int ColorId { get; set; }
        [Required]
        public required string Size { get; set; }
        public int Stock { get; set; }
        public int LowStockThreshold { get; set; }
    }
}
