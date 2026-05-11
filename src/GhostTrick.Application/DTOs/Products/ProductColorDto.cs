using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class ProductColorDto
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public required string HexCode { get; set; }
        public bool IsActive { get; set; }
    }
}
