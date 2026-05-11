using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class PhotoDeletionResult
    {
        public bool Success { get; set; }
        public string? Error { get; set; }
    }
}
