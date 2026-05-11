using System.Net;
using System.Text.Json;

namespace GhostTrick.WebApi.Middlewares
{
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionMiddleware> _logger;
        private readonly IHostEnvironment _env;

        public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger, IHostEnvironment env)
        {
            _next = next;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, ex.Message);
                context.Response.ContentType = "application/json";
                
                var statusCode = (int)HttpStatusCode.InternalServerError;
                var message = "Internal Server Error";

                if (ex is UnauthorizedAccessException)
                {
                    statusCode = (int)HttpStatusCode.Unauthorized;
                    message = ex.Message;
                }
                else if (ex is KeyNotFoundException)
                {
                    statusCode = (int)HttpStatusCode.NotFound;
                    message = ex.Message;
                }
                else if (ex is InvalidOperationException)
                {
                    statusCode = (int)HttpStatusCode.BadRequest;
                    message = ex.Message;
                }
                else if (ex is Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException)
                {
                    statusCode = (int)HttpStatusCode.Conflict;
                    message = "Hệ thống đang bận hoặc dữ liệu đã bị thay đổi. Vui lòng thử lại.";
                }

                context.Response.StatusCode = statusCode;

                var response = _env.IsDevelopment()
                    ? new ApiException(statusCode, ex.Message, ex.StackTrace?.ToString())
                    : new ApiException(statusCode, message);

                var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
                var json = JsonSerializer.Serialize(response, options);

                await context.Response.WriteAsync(json);
            }
        }
    }

    public record ApiException(int StatusCode, string Message, string? Details = null);
}
