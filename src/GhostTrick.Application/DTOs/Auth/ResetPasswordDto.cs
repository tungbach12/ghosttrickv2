using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class ResetPasswordDto
    {
        [Required, EmailAddress]
        public required string Email { get; set; }

        [Required]
        public required string Code { get; set; }

        [Required, MinLength(8)]
        public required string NewPassword { get; set; }
    }
}
