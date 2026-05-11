using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Application.Services
{
    public class VoucherService : IVoucherService
    {
        private readonly IGenericRepository<Voucher> _voucherRepo;
        private readonly IGenericRepository<UserVoucher> _userVoucherRepo;
        private readonly IGenericRepository<VoucherUsage> _usageRepo;
        private readonly IUnitOfWork _uow;

        public VoucherService(
            IGenericRepository<Voucher> voucherRepo,
            IGenericRepository<UserVoucher> userVoucherRepo,
            IGenericRepository<VoucherUsage> usageRepo,
            IUnitOfWork uow)
        {
            _voucherRepo = voucherRepo;
            _userVoucherRepo = userVoucherRepo;
            _usageRepo = usageRepo;
            _uow = uow;
        }

        public async Task<PagedResult<object>> GetVouchersAsync(int page, int pageSize, string? q, string? status, string? category = null, string? orderBy = null)
        {
            var (items, totalCount) = await _voucherRepo.GetPagedAsync(page, pageSize, query => 
            {
                if (status == "Deleted")
                {
                    query = query.Where(v => v.IsDeleted);
                }
                else if (status == "Active") query = query.Where(v => v.IsActive);
                else if (status == "Inactive") query = query.Where(v => !v.IsActive);

                if (!string.IsNullOrEmpty(category) && Enum.TryParse<VoucherCategory>(category, true, out var cat))
                    query = query.Where(v => v.Category == cat);

                if (!string.IsNullOrEmpty(q))
                    query = query.Where(v => v.Code.Contains(q) || v.Description.Contains(q));

                if (orderBy == "oldest") query = query.OrderBy(v => v.Id);
                else query = query.OrderByDescending(v => v.Id);

                return query.Include(v => v.Usages!);
            });

            var resultItems = items.Select(v => new
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
                UsedCount = v.Usages?.Count ?? 0,
                RemainingCount = v.UsageLimit > 0 ? (v.UsageLimit - (v.Usages?.Count ?? 0)) : (int?)null,
                v.StartDate,
                v.EndDate,
                v.IsActive,
                v.IsDeleted
            }).Cast<object>().ToList();

            return new PagedResult<object>
            {
                Items = resultItems,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<object> GetPublicVouchersAsync()
        {
            var now = DateTime.UtcNow;
            var vouchers = await _voucherRepo.GetAsync(q => q
                .Include(v => v.Usages)
                .Where(v => !v.IsDeleted && 
                           v.IsActive && 
                           (v.StartDate == null || v.StartDate <= now) && 
                           (v.EndDate == null || v.EndDate >= now) &&
                           (v.UsageLimit == 0 || v.Usages!.Count < v.UsageLimit))
                .OrderByDescending(v => v.Id)
            );

            return vouchers.Select(v => new
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
                UsedCount = v.Usages?.Count ?? 0,
                RemainingCount = v.UsageLimit > 0 ? (v.UsageLimit - (v.Usages?.Count ?? 0)) : (int?)null,
                v.StartDate,
                v.EndDate
            }).ToList();
        }

        public async Task<object> GetMyWalletAsync(string userId)
        {
            var now = DateTime.UtcNow;
            var userVouchers = await _userVoucherRepo.GetAsync(q => q
                .Include(uv => uv.Voucher!).ThenInclude(v => v.Usages!)
                .Where(uv => uv.UserId == userId && 
                           !uv.Voucher!.IsDeleted && 
                           uv.Voucher.IsActive &&
                           (uv.Voucher.StartDate == null || uv.Voucher.StartDate <= now))
            );

            var walletItems = new List<object>();
            foreach (var uv in userVouchers)
            {
                var usageResults = await _usageRepo.FindAsync(vu => vu.VoucherId == uv.VoucherId && vu.UserId == userId);
                walletItems.Add(new
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
                    UsedCount = uv.Voucher.Usages?.Count ?? 0,
                    RemainingCount = uv.Voucher.UsageLimit > 0 ? (uv.Voucher.UsageLimit - (uv.Voucher.Usages?.Count ?? 0)) : (int?)null,
                    IsUsed = usageResults.Any(),
                    uv.SavedAt
                });
            }
            return walletItems;
        }

        public async Task SaveToWalletAsync(string code, string userId)
        {
            var result = await _voucherRepo.FindAsync(v => v.Code == code && !v.IsDeleted && v.IsActive);
            var voucher = result.FirstOrDefault();
            if (voucher == null) throw new KeyNotFoundException("Mã giảm giá không tồn tại.");

            var existingResults = await _userVoucherRepo.FindAsync(uv => uv.UserId == userId && uv.VoucherId == voucher.Id);
            if (existingResults.Any()) throw new InvalidOperationException("Bạn đã lưu mã này rồi.");

            await _userVoucherRepo.AddAsync(new UserVoucher { UserId = userId, VoucherId = voucher.Id });
            await _uow.CompleteAsync();
        }

        public async Task<Voucher> GetVoucherAsync(int id)
        {
            var voucher = await _voucherRepo.GetByIdAsync(id);
            if (voucher == null || voucher.IsDeleted) throw new KeyNotFoundException("Voucher not found.");
            return voucher;
        }

        public async Task<VoucherResultDto> ValidateVoucherAsync(ValidateVoucherDto dto, string? userId)
        {
            var now = DateTime.UtcNow;
            var voucherList = await _voucherRepo.GetAsync(q => q
                .Include(v => v.Usages)
                .Where(v =>
                    v.Code == dto.Code &&
                    v.IsActive &&
                    !v.IsDeleted &&
                    (v.StartDate == null || v.StartDate <= now) &&
                    (v.EndDate == null || v.EndDate >= now) &&
                    (v.UsageLimit == 0 || v.Usages.Count < v.UsageLimit)));
            
            var voucher = voucherList.FirstOrDefault();

            if (voucher == null) throw new InvalidOperationException("Mã giảm giá không hợp lệ hoặc đã hết hạn.");

            if (userId != null && voucher.LimitPerUser > 0)
            {
                var userUsageCount = (await _usageRepo.FindAsync(vu => vu.VoucherId == voucher.Id && vu.UserId == userId)).Count();
                
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
            var results = await _voucherRepo.FindAsync(v => v.Code == dto.Code && !v.IsDeleted);
            if (results.Any())
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

            await _voucherRepo.AddAsync(voucher);
            await _uow.CompleteAsync();
            return voucher;
        }

        public async Task<Voucher> UpdateVoucherAsync(int id, CreateVoucherDto dto)
        {
            var voucher = await _voucherRepo.GetByIdAsync(id);
            if (voucher == null || voucher.IsDeleted) throw new KeyNotFoundException();

            var results = await _voucherRepo.FindAsync(v => v.Code == dto.Code && v.Id != id && !v.IsDeleted);
            if (results.Any())
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

            _voucherRepo.Update(voucher);
            await _uow.CompleteAsync();
            return voucher;
        }

        public async Task DeleteVoucherAsync(int id)
        {
            var voucher = await _voucherRepo.GetByIdAsync(id);
            if (voucher == null) throw new KeyNotFoundException();

            voucher.IsDeleted = true;
            _voucherRepo.Update(voucher);
            await _uow.CompleteAsync();
        }
    }
}
