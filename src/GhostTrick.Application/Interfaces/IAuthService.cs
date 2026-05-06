using GhostTrick.Application.DTOs;

namespace GhostTrick.Application.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
        Task<AuthResponseDto> LoginAsync(LoginDto dto);
        Task<AuthResponseDto> RefreshTokenAsync(string refreshToken);
        Task RevokeRefreshTokenAsync(string refreshToken);
        
        // OTP & Google
        Task SendOtpAsync(string email);
        Task<bool> VerifyOtpAsync(string email, string code);
        Task<AuthResponseDto> GoogleLoginAsync(string idToken);
    }
}
