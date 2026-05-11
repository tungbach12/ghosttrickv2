using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class ProductReviewDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string? ProductName { get; set; }
        public string? UserId { get; set; }
        public required string UserName { get; set; }
        public string? UserAvatarUrl { get; set; }
        public int Rating { get; set; }
        public required string Comment { get; set; }
        public bool IsFake { get; set; }
        public bool IsVerifiedPurchase { get; set; }
        public int? OrderId { get; set; }
        public string? BoughtVariant { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsDeleted { get; set; }
    }
}
