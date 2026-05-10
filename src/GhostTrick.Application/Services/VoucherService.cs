using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Application.Services
{
    public class VoucherService : IVoucherService
    {
        private readonly IGhostTrickContext _context;

        public VoucherService(IGhostTrickContext context)
        {
            _context = context;
        }

        public async Task<PagedResult<object>> GetVouchersAsync(int page, int pageSize, string? q, string? status, string? category = null, string? orderBy = null)
        {
            var query = _context.Vouchers.AsNoTracking();

            if (status == "Deleted")
            {
                query = _context.Vouchers.IgnoreQueryFilters().Where(v => v.IsDeleted).AsNoTracking();
            }
            else if (status == "Active")
            {
                query = query.Where(v => v.IsActive);
            }
            else if (status == "Inactive")
            {
                query = query.Where(v => !v.IsActive);
            }

            if (!string.IsNullOrEmpty(category) && Enum.TryParse<VoucherCategory>(category, true, out var cat))
            {
                query = query.Where(v => v.Category == cat);
            }

            if (!string.IsNullOrEmpty(q))
            {
                query = query.Where(v => v.Code.Contains(q) || v.Description.Contains(q));
            }

            var totalCount = await query.CountAsync();

            if (orderBy == "oldest")
            {
                query = query.OrderBy(v => v.Id);
            }
            else
            {
                query = query.OrderByDescending(v => v.Id);
            }

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(v => new
                {
                    v.Id,
                    v.Code,
                    v.Description,
                    v.Category,
                    v.DiscountType,
                    v.DiscountValue,
                    v.MinOrderAmount,
                    v.MaxDiscountAmount,
                    v.UsageLimit,
                    v.LimitPerUser,
                    UsedCount = v.Usages.Count,
                    RemainingCount = v.UsageLimit > 0 ? (v.UsageLimit - v.Usages.Count) : (int?)null,
                    v.StartDate,
                    v.EndDate,
                    v.IsActive,
                    v.IsDeleted
                })
                .ToListAsync();

            return new PagedResult<object>
            {
                Items = items.Cast<object>().ToList(),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<object> GetPublicVouchersAsync()
        {
            var now = DateTime.UtcNow;
            return await _context.Vouchers
                .AsNoTracking()
                .Where(v => !v.IsDeleted && 
                           v.IsActive && 
                           (v.StartDate == null || v.StartDate <= now) && 
                           (v.EndDate == null || v.EndDate >= now) &&
                           (v.UsageLimit == 0 || v.Usages.Count < v.UsageLimit))
                .OrderByDescending(v => v.Id)
                .Select(v => new
                {
                    v.Id,
                    v.Code,
                    v.Description,
                    v.Category,
                    v.DiscountType,
                    v.DiscountValue,
                    v.MinOrderAmount,
                    v.MaxDiscountAmount,
                    v.UsageLimit,
                    v.LimitPerUser,
                    UsedCount = v.Usages.Count,
                    RemainingCount = v.UsageLimit > 0 ? (v.UsageLimit - v.Usages.Count) : (int?)null,
                    v.StartDate,
                    v.EndDate
                })
                .ToListAsync();
        }

        public async Task<object> GetMyWalletAsync(string userId)
        {
            var now = DateTime.UtcNow;
            return await _context.UserVouchers
                .Include(uv => uv.Voucher)
                .Where(uv => uv.UserId == userId && 
                           !uv.Voucher!.IsDeleted && 
                           uv.Voucher.IsActive &&
                           (uv.Voucher.StartDate == null || uv.Voucher.StartDate <= now))
                .Select(uv => new
                {
                    uv.Voucher!.Id,
                    uv.Voucher.Code,
                    uv.Voucher.Description,
                    uv.Voucher.Category,
                    uv.Voucher.DiscountType,
                    uv.Voucher.DiscountValue,
                    uv.Voucher.MinOrderAmount,
                    uv.Voucher.MaxDiscountAmount,
                    uv.Voucher.EndDate,
                    UsedCount = uv.Voucher.Usages.Count,
                    RemainingCount = uv.Voucher.UsageLimit > 0 ? (uv.Voucher.UsageLimit - uv.Voucher.Usages.Count) : (int?)null,
                    IsUsed = _context.VoucherUsages.Any(vu => vu.VoucherId == uv.VoucherId && vu.UserId == userId),
                    uv.SavedAt
                })
                .ToListAsync();
        }

        public async Task SaveToWalletAsync(string code, string userId)
        {
            var voucher = await _context.Vouchers.FirstOrDefaultAsync(v => v.Code == code && !v.IsDeleted && v.IsActive);
            if (voucher == null) throw new KeyNotFoundException("Mã giảm giá không tồn tại.");

            var existing = await _context.UserVouchers.AnyAsync(uv => uv.UserId == userId && uv.VoucherId == voucher.Id);
            if (existing) throw new InvalidOperationException("Bạn đã lưu mã này rồi.");

            _context.UserVouchers.Add(new UserVoucher { UserId = userId, VoucherId = voucher.Id });
            await _context.SaveChangesAsync();
        }

        public async Task<Voucher> GetVoucherAsync(int id)
        {
            var voucher = await _context.Vouchers.FindAsync(id);
            if (voucher == null || voucher.IsDeleted) throw new KeyNotFoundException("Voucher not found.");
            return voucher;
        }

        public async Task<VoucherResultDto> ValidateVoucherAsync(ValidateVoucherDto dto, string? userId)
        {
            var now = DateTime.UtcNow;
            var voucher = await _context.Vouchers
                .Include(v => v.Usages)
                .FirstOrDefaultAsync(v =>
                    v.Code == dto.Code &&
                    v.IsActive &&
                    !v.IsDeleted &&
                    (v.StartDate == null || v.StartDate <= now) &&
                    (v.EndDate == null || v.EndDate >= now) &&
                    (v.UsageLimit == 0 || v.Usages.Count < v.UsageLimit));

            if (voucher == null) throw new InvalidOperationException("Mã giảm giá không hợp lệ hoặc đã hết hạn.");

            if (userId != null && voucher.LimitPerUser > 0)
            {
                var userUsageCount = await _context.VoucherUsages
                    .CountAsync(vu => vu.VoucherId == voucher.Id && vu.UserId == userId);
                
                if (userUsageCount >= voucher.LimitPerUser)
                    throw new InvalidOperationException($"Bạn đã hết lượt sử dụng mã này (Tối đa {voucher.LimitPerUser} lần).");
            }

            if (dto.OrderAmount < voucher.MinOrderAmount)
                throw new InvalidOperationException($"Đơn hàng tối thiểu {voucher.MinOrderAmount:N0}₫ để dùng mã này.");

            decimal discountAmount = voucher.DiscountType == DiscountType.Percent
                ? Math.Min(dto.OrderAmount * voucher.DiscountValue / 100,
                           voucher.MaxDiscountAmount > 0 ? voucher.MaxDiscountAmount : decimal.MaxValue)
                : voucher.DiscountValue;

            return new VoucherResultDto
            {
                Code = voucher.Code,
                Description = voucher.Description,
                Category = voucher.Category.ToString(),
                DiscountType = voucher.DiscountType.ToString(),
                DiscountValue = voucher.DiscountValue,
                DiscountAmount = Math.Min(discountAmount, dto.OrderAmount),
                LimitPerUser = voucher.LimitPerUser
            };
        }

        public async Task<Voucher> CreateVoucherAsync(CreateVoucherDto dto)
        {
            if (await _context.Vouchers.AnyAsync(v => v.Code == dto.Code && !v.IsDeleted))
                throw new InvalidOperationException("Mã giảm giá này đã tồn tại.");

            var voucher = new Voucher
            {
                Code = dto.Code,
                Description = dto.Description,
                Category = dto.Category,
                DiscountType = dto.DiscountType,
                DiscountValue = dto.DiscountValue,
                MinOrderAmount = dto.MinOrderAmount,
                MaxDiscountAmount = dto.MaxDiscountAmount,
                UsageLimit = dto.UsageLimit,
                LimitPerUser = dto.LimitPerUser,
                IsActive = dto.IsActive,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate
            };

            _context.Vouchers.Add(voucher);
            await _context.SaveChangesAsync();
            return voucher;
        }

        public async Task<Voucher> UpdateVoucherAsync(int id, CreateVoucherDto dto)
        {
            var voucher = await _context.Vouchers.FindAsync(id);
            if (voucher == null || voucher.IsDeleted) throw new KeyNotFoundException();

            if (await _context.Vouchers.AnyAsync(v => v.Code == dto.Code && v.Id != id && !v.IsDeleted))
                throw new InvalidOperationException("Mã giảm giá này đã tồn tại.");

            voucher.Code = dto.Code;
            voucher.Description = dto.Description;
            voucher.Category = dto.Category;
            voucher.DiscountType = dto.DiscountType;
            voucher.DiscountValue = dto.DiscountValue;
            voucher.MinOrderAmount = dto.MinOrderAmount;
            voucher.MaxDiscountAmount = dto.MaxDiscountAmount;
            voucher.UsageLimit = dto.UsageLimit;
            voucher.LimitPerUser = dto.LimitPerUser;
            voucher.IsActive = dto.IsActive;
            voucher.StartDate = dto.StartDate;
            voucher.EndDate = dto.EndDate;

            await _context.SaveChangesAsync();
            return voucher;
        }

        public async Task DeleteVoucherAsync(int id)
        {
            var voucher = await _context.Vouchers.FindAsync(id);
            if (voucher == null) throw new KeyNotFoundException();

            voucher.IsDeleted = true;
            await _context.SaveChangesAsync();
        }
    }
}
