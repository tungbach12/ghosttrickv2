using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class OrderTimelineDto
    {
        public string? Status { get; set; }
        public string? Note { get; set; }
        public string? Actor { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
