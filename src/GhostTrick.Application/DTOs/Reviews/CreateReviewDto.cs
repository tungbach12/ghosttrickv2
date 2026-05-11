using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class CreateReviewDto
    {
        public int ProductId { get; set; }
        public int Rating { get; set; }
        public required string Comment { get; set; }
        public int? OrderId { get; set; }


        // Admin only fields for "fake" reviews
        public string? FakeUserName { get; set; }
        public string? FakeAvatarUrl { get; set; }
        public bool? ForceVerifiedPurchase { get; set; }
    }
}
