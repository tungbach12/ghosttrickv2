using GhostTrick.Application.DTOs;
using GhostTrick.Domain.Entities;

namespace GhostTrick.Application.Interfaces
{
    public interface IVoucherService
    {
        Task<PagedResult<object>> GetVouchersAsync(int page, int pageSize, string? q, string? status, string? category = null, string? orderBy = null);
        Task<object> GetPublicVouchersAsync();
        Task<object> GetMyWalletAsync(string userId);
        Task SaveToWalletAsync(string code, string userId);
        Task<Voucher> GetVoucherAsync(int id);
        Task<VoucherResultDto> ValidateVoucherAsync(ValidateVoucherDto dto, string? userId);
        
        // Admin methods
        Task<Voucher> CreateVoucherAsync(CreateVoucherDto dto);
        Task<Voucher> UpdateVoucherAsync(int id, CreateVoucherDto dto);
        Task DeleteVoucherAsync(int id);
    }
}
