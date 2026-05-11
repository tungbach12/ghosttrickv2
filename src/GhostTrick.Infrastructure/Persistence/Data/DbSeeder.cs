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
                    PhoneNumber = "0900000000",
                    EmailConfirmed = true
                };
                await userManager.CreateAsync(adminUser, "Admin@123");
                await userManager.AddToRoleAsync(adminUser, "Admin");
            }



            // ── Categories ────────────────────────────────────────────
            if (!context.Categories.IgnoreQueryFilters().Any())
            {
                var tops = new Category { Name = "Tops", Slug = "tops" };
                var bottoms = new Category { Name = "Bottoms", Slug = "bottoms" };
                var outerwear = new Category { Name = "OuterWear", Slug = "outerwear" };
                context.Categories.AddRange(tops, bottoms, outerwear);
                context.SaveChanges();
            }

            var categoryList = context.Categories.IgnoreQueryFilters().ToList();
            var topsId = categoryList.First(c => c.Slug == "tops").Id;
            var outerwearId = categoryList.First(c => c.Slug == "outerwear").Id;

            // ── Colors ────────────────────────────────────────────────
            if (!context.ProductColors.IgnoreQueryFilters().Any())
            {
                context.ProductColors.AddRange(
                    new ProductColor { Name = "Đen", HexCode = "#000000", IsActive = true },
                    new ProductColor { Name = "Trắng", HexCode = "#FFFFFF", IsActive = true },
                    new ProductColor { Name = "Xám", HexCode = "#808080", IsActive = true }
                );
                context.SaveChanges();
            }
            var colors = context.ProductColors.IgnoreQueryFilters().ToList();



            // ── Vouchers ──────────────────────────────────────────────
            if (!context.Vouchers.IgnoreQueryFilters().Any())
            {
                context.Vouchers.AddRange(
                    new Voucher { Code = "FREESHIP", Description = "Miễn phí vận chuyển", DiscountType = DiscountType.Fixed, DiscountValue = 30000, MinOrderAmount = 0, Category = VoucherCategory.Shipping },
                    new Voucher { Code = "GHOST10", Description = "Giảm 10% cho đơn đầu tiên", DiscountType = DiscountType.Percent, DiscountValue = 10, MinOrderAmount = 100000, Category = VoucherCategory.General },
                    new Voucher { Code = "WELCOME2026", Description = "Chào mừng năm mới 2026", DiscountType = DiscountType.Fixed, DiscountValue = 50000, MinOrderAmount = 500000, Category = VoucherCategory.General },
                    new Voucher { Code = "SUMMERVIBE", Description = "Rực rỡ mùa hè", DiscountType = DiscountType.Percent, DiscountValue = 15, MinOrderAmount = 300000, MaxDiscountAmount = 100000, Category = VoucherCategory.General },
                    new Voucher { Code = "SHIPHAY", Description = "Hỗ trợ phí ship 20k", DiscountType = DiscountType.Fixed, DiscountValue = 20000, MinOrderAmount = 200000, Category = VoucherCategory.Shipping },
                    new Voucher { Code = "LUCKY777", Description = "Voucher may mắn", DiscountType = DiscountType.Percent, DiscountValue = 7, MinOrderAmount = 77000, Category = VoucherCategory.General },
                    new Voucher { Code = "MIDNIGHT", Description = "Sale đêm khuya", DiscountType = DiscountType.Fixed, DiscountValue = 100000, MinOrderAmount = 1000000, Category = VoucherCategory.General },
                    new Voucher { Code = "BACKTOSCHOOL", Description = "Ưu đãi học đường", DiscountType = DiscountType.Percent, DiscountValue = 12, MinOrderAmount = 150000, Category = VoucherCategory.General },
                    new Voucher { Code = "FREESHIPMAX", Description = "Siêu cấp freeship", DiscountType = DiscountType.Fixed, DiscountValue = 50000, MinOrderAmount = 400000, Category = VoucherCategory.Shipping },
                    new Voucher { Code = "BLACKFRIDAY", Description = "Ngày thứ 6 đen tối", DiscountType = DiscountType.Percent, DiscountValue = 50, MinOrderAmount = 1000000, MaxDiscountAmount = 300000, Category = VoucherCategory.General },
                    new Voucher { Code = "XMAS2026", Description = "Giáng sinh an lành", DiscountType = DiscountType.Fixed, DiscountValue = 80000, MinOrderAmount = 600000, Category = VoucherCategory.General },
                    new Voucher { Code = "WEEKEND", Description = "Cuối tuần rực rỡ", DiscountType = DiscountType.Percent, DiscountValue = 5, MinOrderAmount = 50000, Category = VoucherCategory.General }
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


            // ── TopBarPromos ──────────────────────────────────────────
            if (!context.TopBarPromos.IgnoreQueryFilters().Any())
            {
                context.TopBarPromos.AddRange(
                    new TopBarPromo { Content = "Chào mừng bạn đến với Ghosttrick!", DisplayOrder = 1, IsActive = true },
                    new TopBarPromo { Content = "Freeship cho đơn hàng từ 500K", DisplayOrder = 2, IsActive = true },
                    new TopBarPromo { Content = "Giảm ngay 10% khi đăng ký thành viên", DisplayOrder = 3, IsActive = true },
                    new TopBarPromo { Content = "Hàng mới về - Mua ngay kẻo lỡ!", DisplayOrder = 4, IsActive = true }
                );
                context.SaveChanges();
            }

            // ── SystemSettings ─────────────────────────────────────────
            if (!context.SystemSettings.IgnoreQueryFilters().Any())
            {
                context.SystemSettings.AddRange(
                    new SystemSetting { Key = "OrderNotificationEmail", Value = "admin@ghosttrick.com", Description = "Email nhận thông báo khi có đơn hàng mới" }
                );
                context.SaveChanges();
            }
        }
    }
}

