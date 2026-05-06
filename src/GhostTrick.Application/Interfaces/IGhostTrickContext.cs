using GhostTrick.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;

namespace GhostTrick.Application.Interfaces
{
    public interface IGhostTrickContext
    {
        DbSet<Product> Products { get; }
        DbSet<Category> Categories { get; }
        DbSet<ProductVariant> ProductVariants { get; }
        DbSet<ProductImage> ProductImages { get; }
        DbSet<Order> Orders { get; }
        DbSet<OrderItem> OrderItems { get; }
        DbSet<SaleEvent> SaleEvents { get; }
        DbSet<SaleEventProduct> SaleEventProducts { get; }
        DbSet<HomeBanner> HomeBanners { get; }
        DbSet<Voucher> Vouchers { get; }
        DbSet<VoucherUsage> VoucherUsages { get; }
        DbSet<Policy> Policies { get; }
        DbSet<RefreshToken> RefreshTokens { get; }
        DbSet<OtpCode> OtpCodes { get; }
        DbSet<InventoryTransaction> InventoryTransactions { get; }
        DbSet<OrderTimeline> OrderTimelines { get; }

        DatabaseFacade Database { get; }

        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
