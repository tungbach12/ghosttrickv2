using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class VariantDto
    {
        public int Id { get; set; }
        public int ColorId { get; set; }
        public string? ColorName { get; set; }
        public string? ColorHex { get; set; }
        public required string Size { get; set; }
        public int Stock { get; set; }
        public int LowStockThreshold { get; set; }
    }
}
