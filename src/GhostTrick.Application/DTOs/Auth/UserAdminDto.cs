using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class UserAdminDto
    {
        public required string Id { get; set; }
        public string? FullName { get; set; }
        public required string Email { get; set; }
        public string? Phone { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Role { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTimeOffset? LockoutEnd { get; set; }
        public bool IsBanned => LockoutEnd.HasValue && LockoutEnd > DateTimeOffset.UtcNow;
        public int OrderCount { get; set; }
        public decimal TotalSpent { get; set; }
    }
}
