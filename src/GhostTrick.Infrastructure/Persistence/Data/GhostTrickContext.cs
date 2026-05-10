using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Infrastructure.Persistence
{
    public class GhostTrickContext : IdentityDbContext<ApplicationUser>, IGhostTrickContext
    {
        public GhostTrickContext(DbContextOptions<GhostTrickContext> options) : base(options) { }

        // Products
        public DbSet<Product> Products { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<ProductColor> ProductColors { get; set; }
        public DbSet<ProductVariant> ProductVariants { get; set; }
        public DbSet<ProductImage> ProductImages { get; set; }

        // Orders
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }

        // Sale Events
        public DbSet<SaleEvent> SaleEvents { get; set; }
        public DbSet<SaleEventProduct> SaleEventProducts { get; set; }
        public DbSet<HomeBanner> HomeBanners { get; set; }

        // Vouchers
        public DbSet<Voucher> Vouchers { get; set; }
        public DbSet<VoucherUsage> VoucherUsages { get; set; }
        public DbSet<UserVoucher> UserVouchers { get; set; }

        // Misc
        public DbSet<Policy> Policies { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<OtpCode> OtpCodes { get; set; }
        
        // Carts
        public DbSet<CartItem> CartItems { get; set; }
        
        // Tracking & History
        public DbSet<InventoryTransaction> InventoryTransactions { get; set; }
        public DbSet<OrderTimeline> OrderTimelines { get; set; }
        public DbSet<Feedback> Feedbacks { get; set; }
        public DbSet<ProductReview> ProductReviews { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            builder.Entity<ApplicationUser>().HasQueryFilter(u => !u.IsDeleted);

            // ── CartItem ──────────────────────────────────────────────
            builder.Entity<CartItem>()
                .HasOne(ci => ci.User)
                .WithMany(u => u.CartItems)
                .HasForeignKey(ci => ci.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<CartItem>()
                .HasOne(ci => ci.Product)
                .WithMany()
                .HasForeignKey(ci => ci.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<CartItem>()
                .HasOne(ci => ci.Variant)
                .WithMany()
                .HasForeignKey(ci => ci.VariantId)
                .OnDelete(DeleteBehavior.Restrict);

            // ── Category ──────────────────────────────────────────────
            builder.Entity<Category>()
                .HasIndex(c => c.Slug).IsUnique();
            builder.Entity<Category>().HasQueryFilter(c => !c.IsDeleted);

            // ── Product ───────────────────────────────────────────────
            builder.Entity<Product>()
                .HasIndex(p => p.SKU).IsUnique();
            builder.Entity<Product>().HasQueryFilter(p => !p.IsDeleted);

            builder.Entity<Product>()
                .HasOne(p => p.Category)
                .WithMany(c => c.Products)
                .HasForeignKey(p => p.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            // ── ProductColor ──────────────────────────────────────────
            builder.Entity<ProductColor>().HasQueryFilter(c => !c.IsDeleted && c.IsActive);

            // ── ProductVariant ────────────────────────────────────────
            builder.Entity<ProductVariant>()
                .HasOne(v => v.Product)
                .WithMany(p => p.Variants)
                .HasForeignKey(v => v.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<ProductVariant>()
                .HasOne(v => v.Color)
                .WithMany()
                .HasForeignKey(v => v.ColorId)
                .OnDelete(DeleteBehavior.Restrict);

            // Stock cannot go negative
            builder.Entity<ProductVariant>()
                .ToTable(t => t.HasCheckConstraint("CK_ProductVariant_Stock", "[Stock] >= 0"));

            // ── ProductImage ──────────────────────────────────────────
            builder.Entity<ProductImage>()
                .HasOne(i => i.Product)
                .WithMany(p => p.Images)
                .HasForeignKey(i => i.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<SaleEvent>()
                .HasIndex(s => s.Slug).IsUnique();
            builder.Entity<SaleEvent>().HasQueryFilter(s => !s.IsDeleted);

            // SaleEventProduct — composite PK (many-to-many)
            builder.Entity<SaleEventProduct>()
                .HasKey(sep => new { sep.SaleEventId, sep.ProductId });

            builder.Entity<SaleEventProduct>()
                .HasOne(sep => sep.SaleEvent)
                .WithMany(se => se.SaleEventProducts)
                .HasForeignKey(sep => sep.SaleEventId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<SaleEventProduct>()
                .HasOne(sep => sep.Product)
                .WithMany(p => p.SaleEventProducts)
                .HasForeignKey(sep => sep.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            // ── Order ─────────────────────────────────────────────────
            builder.Entity<Order>()
                .HasOne(o => o.User)
                .WithMany(u => u.Orders)
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Order>().HasQueryFilter(o => !o.IsDeleted);

            builder.Entity<Order>()
                .HasOne(o => o.Voucher)
                .WithMany()
                .HasForeignKey(o => o.VoucherId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Order>()
                .Property(o => o.Status)
                .HasConversion<string>();

            builder.Entity<Order>()
                .Property(o => o.PaymentMethod)
                .HasConversion<string>();

            builder.Entity<Order>()
                .Property(o => o.PaymentStatus)
                .HasConversion<string>();

            // Indexes for performance
            builder.Entity<Order>().HasIndex(o => o.CreatedAt);
            builder.Entity<Order>().HasIndex(o => o.Status);
            builder.Entity<Order>().HasIndex(o => o.PaymentStatus);
            builder.Entity<Order>().HasIndex(o => o.TotalAmount);
            builder.Entity<Order>().HasIndex(o => o.IsDeleted);

            // ── OrderTimeline ─────────────────────────────────────────
            builder.Entity<OrderTimeline>()
                .HasOne(t => t.Order)
                .WithMany(o => o.Timeline)
                .HasForeignKey(t => t.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            // ── OrderItem ─────────────────────────────────────────────
            builder.Entity<OrderItem>()
                .HasOne(oi => oi.Order)
                .WithMany(o => o.Items)
                .HasForeignKey(oi => oi.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<OrderItem>()
                .HasOne(oi => oi.Product)
                .WithMany()
                .HasForeignKey(oi => oi.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<OrderItem>()
                .HasOne(oi => oi.Variant)
                .WithMany()
                .HasForeignKey(oi => oi.VariantId)
                .OnDelete(DeleteBehavior.Restrict);

            // ── Voucher ───────────────────────────────────────────────
            builder.Entity<Voucher>()
                .HasIndex(v => v.Code).IsUnique();
            builder.Entity<Voucher>().HasQueryFilter(v => !v.IsDeleted);

            builder.Entity<Voucher>()
                .Property(v => v.DiscountType)
                .HasConversion<string>();

            // ── VoucherUsage ──────────────────────────────────────────
            builder.Entity<VoucherUsage>()
                .HasOne(vu => vu.Voucher)
                .WithMany(v => v.Usages)
                .HasForeignKey(vu => vu.VoucherId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<VoucherUsage>()
                .HasOne(vu => vu.User)
                .WithMany()
                .HasForeignKey(vu => vu.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<VoucherUsage>()
                .HasOne(vu => vu.Order)
                .WithMany()
                .HasForeignKey(vu => vu.OrderId)
                .OnDelete(DeleteBehavior.Restrict);

            // ── Policy ────────────────────────────────────────────────
            builder.Entity<Policy>()
                .HasIndex(p => p.Slug).IsUnique();
            builder.Entity<Policy>().HasQueryFilter(p => !p.IsDeleted);

            // ── InventoryTransaction ──────────────────────────────────
            builder.Entity<InventoryTransaction>()
                .Property(i => i.Type)
                .HasConversion<string>();

            builder.Entity<InventoryTransaction>()
                .HasOne(i => i.Variant)
                .WithMany()
                .HasForeignKey(i => i.VariantId)
                .OnDelete(DeleteBehavior.Cascade);

            // ── RefreshToken ──────────────────────────────────────────
            builder.Entity<RefreshToken>()
                .HasOne(rt => rt.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(rt => rt.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // ── OtpCode ───────────────────────────────────────────────
            builder.Entity<OtpCode>()
                .HasOne(oc => oc.User)
                .WithMany(u => u.OtpCodes)
                .HasForeignKey(oc => oc.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            // ── ProductReview ─────────────────────────────────────────
            builder.Entity<ProductReview>()
                .HasOne(pr => pr.Product)
                .WithMany()
                .HasForeignKey(pr => pr.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<ProductReview>()
                .HasOne(pr => pr.User)
                .WithMany()
                .HasForeignKey(pr => pr.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<ProductReview>().HasQueryFilter(pr => !pr.IsDeleted);
        }
    }
}
