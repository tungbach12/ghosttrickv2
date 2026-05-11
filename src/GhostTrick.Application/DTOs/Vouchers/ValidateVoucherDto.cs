using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class ValidateVoucherDto
    {
        [Required]
        public required string Code { get; set; }

        [Range(0, double.MaxValue)]
        public decimal OrderAmount { get; set; }
    }
}
