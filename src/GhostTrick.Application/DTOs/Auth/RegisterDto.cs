using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class RegisterDto
    {
        [Required, MaxLength(150)]
        public required string FullName { get; set; }

        [Required, EmailAddress]
        public required string Email { get; set; }

        [Required, MinLength(8)]
        public required string Password { get; set; }

        [Required, RegularExpression(@"^(0[3|5|7|8|9])+([0-9]{8})$",
            ErrorMessage = "Số điện thoại không hợp lệ (VD: 0901234567)")]
        public required string Phone { get; set; }
    }
}
