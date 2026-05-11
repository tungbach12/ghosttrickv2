using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class UpdateUserAdminDto
    {
        [MaxLength(150)]
        public string? FullName { get; set; }

        [EmailAddress]
        public string? Email { get; set; }

        [RegularExpression(@"^(0[3|5|7|8|9])+([0-9]{8})$",
            ErrorMessage = "Số điện thoại không hợp lệ")]
        public string? Phone { get; set; }

        [MinLength(8)]
        public string? Password { get; set; }
    }
}
