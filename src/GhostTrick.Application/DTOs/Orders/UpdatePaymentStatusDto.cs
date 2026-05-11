using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class UpdatePaymentStatusDto
    {
        [Required]
        public required string Status { get; set; }
    }
}
