using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Infrastructure.Persistence
{
    public static class DbSeeder
    {
        public static async Task Seed(GhostTrickContext context, UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager)
        {
            // ── Roles ─────────────────────────────────────────────────
            string[] roles = { "Admin", "Customer" };
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole(role));
                }
            }

            // ── Admin User ────────────────────────────────────────────
            var adminEmail = "admin@ghosttrick.com";
            var adminUser = await userManager.FindByEmailAsync(adminEmail);
            if (adminUser == null)
            {
                adminUser = new ApplicationUser
                {
                    UserName = adminEmail,
                    Email = adminEmail,
                    FullName = "Ghosttrick Admin",
                    Phone = "0900000000",
                    EmailConfirmed = true
                };
                await userManager.CreateAsync(adminUser, "Admin@123");
                await userManager.AddToRoleAsync(adminUser, "Admin");
            }

            // ── Categories ────────────────────────────────────────────
            if (!context.Categories.IgnoreQueryFilters().Any())
            {
                var tops = new Category { Name = "Tops", Slug = "tops" };
                var outerwear = new Category { Name = "OuterWear", Slug = "outerwear" };
                context.Categories.AddRange(tops, outerwear);
                context.SaveChanges();
            }

            var categoryList = context.Categories.IgnoreQueryFilters().ToList();
            var topsId = categoryList.First(c => c.Slug == "tops").Id;
            var outerwearId = categoryList.First(c => c.Slug == "outerwear").Id;

            // ── Products ──────────────────────────────────────────────
            if (!context.Products.IgnoreQueryFilters().Any())
            {
                var products = new List<Product>
                {
                    new() { Name = "Áo Thun Phom Boxy Phối Viền Cổ In Chữ - AKIKO", SKU = "GT-001", Price = 240000, CategoryId = topsId, Subcategory = "Áo thun", MainImageUrl = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800", SalesCount = 150, IsNewArrival = true },
                    new() { Name = "Đầm 2 Dây Caro Dáng Chữ A Tùng Đuôi Cá - LAINE", SKU = "GT-002", Price = 380000, CategoryId = topsId, Subcategory = "Đầm xòe", MainImageUrl = "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=800", SalesCount = 85 },
                    new() { Name = "Áo Sơ Mi Sọc Phom Rộng Phối Túi Đắp Cầu Vai - YERIN", SKU = "GT-003", Price = 320000, CategoryId = topsId, Subcategory = "Áo sơ mi", MainImageUrl = "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=80&w=800", SalesCount = 120 },
                    new() { Name = "Áo Khoác Blazer Dáng Rộng - ZENI", SKU = "GT-014", Price = 520000, OriginalPrice = 650000, IsOnSale = true, CategoryId = outerwearId, Subcategory = "Áo blazer", MainImageUrl = "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800", SalesCount = 220 },
                };
                context.Products.AddRange(products);
                context.SaveChanges();
            }

            // ── Sale Event ────────────────────────────────────────────
            if (!context.SaleEvents.IgnoreQueryFilters().Any(s => s.Slug == "mid-season-sale"))
            {
                var saleEvent = new SaleEvent
                {
                    Name = "Mid Season Sale",
                    Slug = "mid-season-sale",
                    Description = "Giảm giá giữa mùa cực sốc lên đến 50% cho tất cả các sản phẩm streetwear mới nhất.",
                    BannerUrl = "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=2070",
                    StartTime = DateTime.UtcNow.AddDays(-1),
                    EndTime = DateTime.UtcNow.AddDays(30),
                    IsActive = true,
                    IsDeleted = false
                };
                context.SaleEvents.Add(saleEvent);
                context.SaveChanges();

                // Gán một số sản phẩm vào đợt Sale
                var productsToAssign = context.Products.Take(5).ToList();
                foreach (var p in productsToAssign)
                {
                    context.SaleEventProducts.Add(new SaleEventProduct
                    {
                        SaleEventId = saleEvent.Id,
                        ProductId = p.Id
                    });
                }
                context.SaveChanges();
            }

            // ── Vouchers ──────────────────────────────────────────────
            if (!context.Vouchers.IgnoreQueryFilters().Any())
            {
                context.Vouchers.AddRange(
                    new Voucher { Code = "FREESHIP50K", Description = "Giảm 50K phí vận chuyển", DiscountType = DiscountType.Fixed, DiscountValue = 50000, MinOrderAmount = 0 },
                    new Voucher { Code = "SALE10", Description = "Giảm 10% đơn từ 500K", DiscountType = DiscountType.Percent, DiscountValue = 10, MinOrderAmount = 500000, MaxDiscountAmount = 100000 }
                );
                context.SaveChanges();
            }

            // ── Policies ──────────────────────────────────────────────
            if (!context.Policies.IgnoreQueryFilters().Any())
            {
                context.Policies.AddRange(
                    new Policy { Slug = "doi-tra", Title = "Chính sách đổi trả", Content = "Hỗ trợ đổi trả trong 7 ngày." },
                    new Policy { Slug = "van-chuyen", Title = "Chính sách vận chuyển", Content = "Giao hàng toàn quốc." }
                );
                context.SaveChanges();
            }
        }
    }
}
