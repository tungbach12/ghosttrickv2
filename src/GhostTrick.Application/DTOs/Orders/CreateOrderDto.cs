using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System;

namespace GhostTrick.Application.DTOs
{
    public class CreateOrderDto
    {
        [Required, MinLength(1, ErrorMessage = "Đơn hàng phải có ít nhất 1 sản phẩm")]
        public required List<OrderItemDto> Items { get; set; }

        [Required]
        public required string ShippingAddress { get; set; }
        public string? ReceiverName { get; set; }
        public string? Phone { get; set; }

        public string? Note { get; set; }
        public string? Email { get; set; }

        public string? VoucherCode { get; set; }

        [Required]
        public required string PaymentMethod { get; set; }
    }
}
