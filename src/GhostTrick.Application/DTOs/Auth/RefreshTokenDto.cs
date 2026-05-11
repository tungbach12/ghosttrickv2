using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class RefreshTokenDto
    {
        [Required]
        public required string RefreshToken { get; set; }
    }
}
