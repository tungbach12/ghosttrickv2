using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Google.Apis.Auth;

namespace GhostTrick.Application.Services
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IGenericRepository<RefreshToken> _refreshTokenRepo;
        private readonly IGenericRepository<OtpCode> _otpRepo;
        private readonly IUnitOfWork _uow;
        private readonly IConfiguration _config;
        private readonly IEmailService _emailService;

        public AuthService(
            UserManager<ApplicationUser> userManager,
            IGenericRepository<RefreshToken> refreshTokenRepo,
            IGenericRepository<OtpCode> otpRepo,
            IUnitOfWork uow,
            IConfiguration config,
            IEmailService emailService)
        {
            _userManager = userManager;
            _refreshTokenRepo = refreshTokenRepo;
            _otpRepo = otpRepo;
            _uow = uow;
            _config = config;
            _emailService = emailService;
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
        {
            var existingUser = await _userManager.FindByEmailAsync(dto.Email);
            if (existingUser != null)
                throw new InvalidOperationException("Email đã được sử dụng.");

            var user = new ApplicationUser
            {
                UserName = dto.Email,
                Email = dto.Email,
                FullName = dto.FullName,
                PhoneNumber = dto.Phone,
                EmailConfirmed = false // Require OTP
            };

            var result = await _userManager.CreateAsync(user, dto.Password);
            if (!result.Succeeded)
                throw new InvalidOperationException(
                    string.Join(", ", result.Errors.Select(e => e.Description)));

            await _userManager.AddToRoleAsync(user, "Customer");
            
            // Send initial OTP
            await SendOtpAsync(user.Email!);

            return await BuildAuthResponseAsync(user);
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email)
                ?? throw new UnauthorizedAccessException("Email hoặc mật khẩu không đúng.");

            var isValid = await _userManager.CheckPasswordAsync(user, dto.Password);
            if (!isValid)
                throw new UnauthorizedAccessException("Email hoặc mật khẩu không đúng.");

            if (await _userManager.IsLockedOutAsync(user))
                throw new UnauthorizedAccessException("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ.");

            return await BuildAuthResponseAsync(user);
        }

        public async Task<AuthResponseDto> RefreshTokenAsync(string refreshToken)
        {
            var result = await _refreshTokenRepo.FindAsync(
                rt => rt.Token == refreshToken,
                q => q.Include(rt => rt.User!)
            );
            var stored = result.FirstOrDefault();

            if (stored == null || stored.IsRevoked || stored.ExpiresAt < DateTime.UtcNow)
                throw new UnauthorizedAccessException("Refresh token không hợp lệ hoặc đã hết hạn.");

            if (await _userManager.IsLockedOutAsync(stored.User!))
                throw new UnauthorizedAccessException("Tài khoản đã bị khóa.");

            // Rotate: revoke old, issue new
            stored.IsRevoked = true;
            _refreshTokenRepo.Update(stored);
            await _uow.CompleteAsync();

            return await BuildAuthResponseAsync(stored.User!);
        }

        public async Task RevokeRefreshTokenAsync(string refreshToken)
        {
            var result = await _refreshTokenRepo.FindAsync(rt => rt.Token == refreshToken);
            var stored = result.FirstOrDefault();

            if (stored != null && !stored.IsRevoked)
            {
                stored.IsRevoked = true;
                _refreshTokenRepo.Update(stored);
                await _uow.CompleteAsync();
            }
        }

        // ── Helpers ────────────────────────────────────────────────────
        private async Task<AuthResponseDto> BuildAuthResponseAsync(ApplicationUser user)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var accessToken = await GenerateAccessTokenAsync(user);
            var refreshToken = await GenerateRefreshTokenAsync(user.Id);

            return new AuthResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                User = new UserDto
                {
                    Id = user.Id,
                    FullName = user.FullName,
                    Email = user.Email!,
                    Phone = user.PhoneNumber,
                    AvatarUrl = user.AvatarUrl,
                    Role = roles.FirstOrDefault()
                }
            };
        }

        private async Task<string> GenerateAccessTokenAsync(ApplicationUser user)
        {
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var roles = await _userManager.GetRolesAsync(user);
            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, user.Id),
                new(JwtRegisteredClaimNames.Email, user.Email!),
                new(JwtRegisteredClaimNames.Name, user.FullName ?? ""),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(
                    int.Parse(_config["Jwt:AccessTokenExpiryMinutes"] ?? "60")),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private async Task<string> GenerateRefreshTokenAsync(string userId)
        {
            var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

            var refreshToken = new RefreshToken
            {
                Token = token,
                UserId = userId,
                ExpiresAt = DateTime.UtcNow.AddDays(
                    int.Parse(_config["Jwt:RefreshTokenExpiryDays"] ?? "30"))
            };

            await _refreshTokenRepo.AddAsync(refreshToken);
            await _uow.CompleteAsync();

            return token;
        }

        public async Task SendOtpAsync(string email)
        {
            var user = await _userManager.FindByEmailAsync(email) 
                ?? throw new InvalidOperationException("Người dùng không tồn tại.");

            var otp = new Random().Next(100000, 999999).ToString();
            
            // Invalidate old OTPs
            var oldOtps = await _otpRepo.FindAsync(o => o.UserId == user.Id && !o.IsUsed);
            foreach (var o in oldOtps) 
            {
                o.IsUsed = true;
                _otpRepo.Update(o);
            }

            var otpEntity = new OtpCode
            {
                UserId = user.Id,
                Code = otp,
                ExpiresAt = DateTime.UtcNow.AddMinutes(10)
            };

            await _otpRepo.AddAsync(otpEntity);
            await _uow.CompleteAsync();

            await _emailService.SendOtpEmailAsync(email, otp);
        }

        public async Task<bool> VerifyOtpAsync(string email, string code)
        {
            var user = await _userManager.FindByEmailAsync(email)
                ?? throw new InvalidOperationException("Người dùng không tồn tại.");

            var otpResults = await _otpRepo.FindAsync(
                o => o.UserId == user.Id && o.Code == code && !o.IsUsed && o.ExpiresAt > DateTime.UtcNow,
                q => q.OrderByDescending(o => o.CreatedAt)
            );
            var otpEntity = otpResults.FirstOrDefault();

            if (otpEntity == null) return false;

            otpEntity.IsUsed = true;
            user.EmailConfirmed = true;
            
            _otpRepo.Update(otpEntity);
            await _uow.CompleteAsync();
            await _userManager.UpdateAsync(user);

            return true;
        }

        public async Task ResetPasswordAsync(ResetPasswordDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email)
                ?? throw new InvalidOperationException("Người dùng không tồn tại.");

            var otpResults = await _otpRepo.FindAsync(
                o => o.UserId == user.Id && o.Code == dto.Code && !o.IsUsed && o.ExpiresAt > DateTime.UtcNow,
                q => q.OrderByDescending(o => o.CreatedAt)
            );
            var otpEntity = otpResults.FirstOrDefault();

            if (otpEntity == null)
                throw new InvalidOperationException("Mã OTP không hợp lệ hoặc đã hết hạn.");

            // Mark OTP as used
            otpEntity.IsUsed = true;
            _otpRepo.Update(otpEntity);
            await _uow.CompleteAsync();

            // Reset password
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var result = await _userManager.ResetPasswordAsync(user, token, dto.NewPassword);

            if (!result.Succeeded)
                throw new InvalidOperationException(string.Join(", ", result.Errors.Select(e => e.Description)));
        }

        public async Task<AuthResponseDto> GoogleLoginAsync(string idToken)
        {
            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new List<string> { _config["Google:ClientId"]! }
                };

                var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
                
                var user = await _userManager.FindByEmailAsync(payload.Email);
                if (user == null)
                {
                    user = new ApplicationUser
                    {
                        UserName = payload.Email,
                        Email = payload.Email,
                        FullName = payload.Name,
                        AvatarUrl = payload.Picture,
                        EmailConfirmed = true // Trusted from Google
                    };
                    await _userManager.CreateAsync(user);
                    await _userManager.AddToRoleAsync(user, "Customer");
                }

                if (await _userManager.IsLockedOutAsync(user))
                    throw new UnauthorizedAccessException("Tài khoản của bạn đã bị khóa.");

                return await BuildAuthResponseAsync(user);
            }
            catch (UnauthorizedAccessException)
            {
                throw;
            }
            catch (Exception)
            {
                throw new UnauthorizedAccessException("Xác thực Google thất bại.");
            }
        }
    }
}
