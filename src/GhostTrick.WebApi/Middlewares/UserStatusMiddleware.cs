using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using System.Security.Claims;

namespace GhostTrick.WebApi.Middlewares
{
    public class UserStatusMiddleware
    {
        private readonly RequestDelegate _next;

        public UserStatusMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, UserManager<ApplicationUser> userManager)
        {
            if (context.User.Identity?.IsAuthenticated == true)
            {
                var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    var user = await userManager.FindByIdAsync(userId);
                    
                    if (user == null || user.IsDeleted || await userManager.IsLockedOutAsync(user))
                    {
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        await context.Response.WriteAsJsonAsync(new { message = "Tài khoản của bạn đã bị khóa hoặc không tồn tại." });
                        return;
                    }
                }
            }

            await _next(context);
        }
    }
}
