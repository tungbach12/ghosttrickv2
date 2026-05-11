using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class SaleEventProductInputDto
    {
        public int ProductId { get; set; }
        public decimal SalePrice { get; set; }
        public int FlashStock { get; set; }
    }
}
