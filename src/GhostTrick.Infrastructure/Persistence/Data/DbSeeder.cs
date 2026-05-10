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

            // ── Customer Users ─────────────────────────────────────────
            var customerEmails = new[] { "customer1@gmail.com", "customer2@gmail.com", "customer3@gmail.com" };
            var customerNames = new[] { "Nguyễn Văn A", "Trần Thị B", "Lê Văn C" };
            
            for (int i = 0; i < customerEmails.Length; i++)
            {
                var email = customerEmails[i];
                if (await userManager.FindByEmailAsync(email) == null)
                {
                    var user = new ApplicationUser
                    {
                        UserName = email,
                        Email = email,
                        FullName = customerNames[i],
                        PhoneNumber = $"098765432{i}",
                        EmailConfirmed = true
                    };
                    await userManager.CreateAsync(user, "User@123");
                    await userManager.AddToRoleAsync(user, "Customer");
                }
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

            // ── Products ──────────────────────────────────────────────
            int currentProductCount = context.Products.IgnoreQueryFilters().Count();
            if (currentProductCount < 60)
            {
                var random = new Random();
                var subcategories = new[] { "Áo thun", "Áo sơ mi", "Quần jean", "Váy ngắn", "Áo khoác", "Đầm xòe", "Chân váy", "Quần tây" };
                var names = new[] { "AKIKO", "LAINE", "YERIN", "ZENI", "HANA", "YUKO", "MIRA", "SORA", "KIRA", "NAMI", "MOMO", "LISA", "ROSE", "JENNIE", "JISOO" };
                var categories = context.Categories.IgnoreQueryFilters().ToList();

                if (!categories.Any())
                {
                    // Fallback if categories were not seeded in this run
                    categories.Add(new Category { Name = "Tops", Slug = "tops" });
                    context.SaveChanges();
                }

                for (int i = currentProductCount + 1; i <= 60; i++)
                {
                    var cat = categories[random.Next(categories.Count)];
                    var sub = subcategories[random.Next(subcategories.Length)];
                    var nameSuffix = names[random.Next(names.Length)];
                    var price = random.Next(150, 800) * 1000;
                    
                    var p = new Product
                    {
                        Name = $"{sub} {nameSuffix} GT-{i}",
                        SKU = $"GT-{i:D3}",
                        Price = price,
                        OriginalPrice = random.Next(10) < 3 ? price + 50000 : null,
                        CategoryId = cat.Id,
                        Subcategory = sub,
                        MainImageUrl = $"https://picsum.photos/seed/{i}/800/1000",
                        ActualSalesCount = random.Next(0, 500),
                        IsNewArrival = random.Next(10) < 2,
                        IsOnSale = random.Next(10) < 2
                    };

                    foreach (var color in colors)
                    {
                        p.Variants.Add(new ProductVariant { ColorId = color.Id, Size = "S", Stock = random.Next(10, 50) });
                        p.Variants.Add(new ProductVariant { ColorId = color.Id, Size = "M", Stock = random.Next(10, 50) });
                        p.Variants.Add(new ProductVariant { ColorId = color.Id, Size = "L", Stock = random.Next(10, 50) });
                    }
                    context.Products.Add(p);
                }
                context.SaveChanges();
            }

            // ── Sale Event ────────────────────────────────────────────
            if (!context.SaleEvents.IgnoreQueryFilters().Any(s => s.Slug == "mid-season-sale"))
            {
                var saleEvent = new SaleEvent
                {
                    Name = "Mid Season Sale",
                    Slug = "mid-season-sale",
                    Description = "Giảm giá giữa mùa cực sốc lên đến 50%.",
                    BannerUrl = "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=2070",
                    StartTime = DateTime.UtcNow.AddDays(-1),
                    EndTime = DateTime.UtcNow.AddDays(30),
                    IsActive = true,
                    IsDeleted = false
                };
                context.SaleEvents.Add(saleEvent);
                context.SaveChanges();

                var productsToAssign = context.Products.Take(2).ToList();
                foreach (var p in productsToAssign)
                {
                    context.SaleEventProducts.Add(new SaleEventProduct
                    {
                        SaleEventId = saleEvent.Id,
                        ProductId = p.Id,
                        SalePrice = p.Price * 0.8m,
                        FlashStock = 100
                    });
                }
                context.SaveChanges();
            }

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

            // ── Historical Orders ──────────────────────────────────────
            if (!context.Orders.IgnoreQueryFilters().Any(o => o.CreatedAt < DateTime.UtcNow.AddDays(-1)))
            {
                Console.WriteLine("[SEED] Generating historical orders...");
            var random = new Random();
            var customers = await userManager.GetUsersInRoleAsync("Customer");
            var variants = context.ProductVariants.Include(v => v.Product).ToList();
            
            if (customers.Any() && variants.Any())
            {
                for (int i = 5; i >= 1; i--) // Last 5 months (excluding current)
                {
                    var monthDate = DateTime.UtcNow.AddMonths(-i);
                    int ordersInMonth = random.Next(10, 20);
                    
                    for (int j = 0; j < ordersInMonth; j++)
                    {
                        var user = customers[random.Next(customers.Count)];
                        var orderDate = new DateTime(monthDate.Year, monthDate.Month, random.Next(1, 28), random.Next(8, 20), random.Next(0, 59), 0, DateTimeKind.Utc);
                        
                        var order = new Order
                        {
                            UserId = user.Id,
                            Status = random.Next(10) < 8 ? OrderStatus.Delivered : (random.Next(2) == 0 ? OrderStatus.Confirmed : OrderStatus.Cancelled),
                            PaymentStatus = PaymentStatus.Paid,
                            PaymentMethod = PaymentMethod.BankTransfer,
                            ShippingAddress = "Address " + random.Next(100),
                            CreatedAt = orderDate,
                            UpdatedAt = orderDate
                        };

                        int itemCount = random.Next(1, 4);
                        decimal orderTotal = 0;
                        
                        for (int k = 0; k < itemCount; k++)
                        {
                            var variant = variants[random.Next(variants.Count)];
                            var qty = random.Next(1, 3);
                            var itemPrice = variant.Product!.Price;
                            
                            order.Items.Add(new OrderItem
                            {
                                ProductId = variant.ProductId,
                                VariantId = variant.Id,
                                Quantity = qty,
                                UnitPrice = itemPrice
                            });
                            
                            orderTotal += itemPrice * qty;
                        }

                        order.TotalAmount = orderTotal;
                        context.Orders.Add(order);
                    }
                }
                context.SaveChanges();
                Console.WriteLine("[SEED] Historical orders generated successfully.");
            }
        }

            // ── Reviews ──────────────────────────────────────────────
            if (context.ProductReviews.IgnoreQueryFilters().Count() < 300)
            {
                var random = new Random();
                var products = context.Products.IgnoreQueryFilters().ToList();
                var customers = await userManager.GetUsersInRoleAsync("Customer");
                var comments = new[] {
                    "Sản phẩm tuyệt vời!", "Chất lượng rất tốt, đáng tiền.", "Giao hàng nhanh, đóng gói cẩn thận.",
                    "Sẽ quay lại ủng hộ shop.", "Màu sắc đẹp, đúng như hình.", "Vải hơi mỏng nhưng mát.",
                    "Form đẹp, mặc rất vừa vặn.", "Giá cả hợp lý.", "Dịch vụ chăm sóc khách hàng tốt.",
                    "Sản phẩm bị lỗi nhẹ nhưng shop đã hỗ trợ đổi trả nhiệt tình.",
                    "Đóng gói rất kỹ, sản phẩm không bị nhăn.", "Giao hàng hơi lâu nhưng sản phẩm rất đẹp.",
                    "Chất liệu vải cao cấp, mặc rất sướng.", "Hợp với đi tiệc và đi làm.",
                    "Màu đen rất sang trọng, dễ phối đồ.", "Tuyệt vời, 5 sao!", "Khá ổn so với giá tiền.",
                    "Giao hàng siêu tốc luôn.", "Đóng gói đẹp như quà tặng.", "Chất vải hơi dày nhưng ấm."
                };

                if (products.Any() && customers.Any())
                {
                    int reviewsToCreate = 300 - context.ProductReviews.IgnoreQueryFilters().Count();
                    for (int i = 0; i < reviewsToCreate; i++)
                    {
                        var product = products[random.Next(products.Count)];
                        var user = customers[random.Next(customers.Count)];
                        
                        context.ProductReviews.Add(new ProductReview
                        {
                            ProductId = product.Id,
                            UserId = user.Id,
                            UserName = user.FullName ?? "Khách hàng",
                            UserAvatarUrl = null,
                            Rating = random.Next(3, 6), // 3-5 stars
                            Comment = comments[random.Next(comments.Length)],
                            IsApproved = true,
                            IsFake = random.Next(10) < 2,
                            IsVerifiedPurchase = random.Next(10) < 8,
                            CreatedAt = DateTime.UtcNow.AddDays(-random.Next(1, 30))
                        });
                    }
                    context.SaveChanges();
                    Console.WriteLine("[SEED] 100 Product reviews generated successfully.");
                }
            }
    }
}
}

