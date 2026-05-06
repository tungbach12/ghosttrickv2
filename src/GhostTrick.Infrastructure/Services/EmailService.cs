using GhostTrick.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using MimeKit.Text;

namespace GhostTrick.Infrastructure.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendEmailAsync(string to, string subject, string body)
        {
            var email = new MimeMessage();
            email.From.Add(MailboxAddress.Parse(_config["Email:From"] ?? "noreply@ghosttrick.com"));
            email.To.Add(MailboxAddress.Parse(to));
            email.Subject = subject;
            email.Body = new TextPart(TextFormat.Html) { Text = body };

            using var smtp = new SmtpClient();
            
            // Connect using settings from configuration
            var host = _config["Email:Host"] ?? "smtp.gmail.com";
            var port = int.Parse(_config["Email:Port"] ?? "587");
            var user = _config["Email:Username"];
            var pass = _config["Email:Password"];

            // For development purposes, if no password is set, we just log it
            if (string.IsNullOrEmpty(pass))
            {
                Console.WriteLine($"[MOCK EMAIL] To: {to}, Subject: {subject}, Body: {body}");
                return;
            }

            await smtp.ConnectAsync(host, port, SecureSocketOptions.StartTls);
            await smtp.AuthenticateAsync(user, pass);
            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);
        }

        public async Task SendOtpEmailAsync(string to, string otp)
        {
            var subject = "[Ghosttrick] Mã xác thực OTP của bạn";
            var body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;'>
                    <h2 style='color: #000;'>Xác thực đăng ký Ghosttrick</h2>
                    <p>Chào bạn,</p>
                    <p>Mã OTP để hoàn tất đăng ký của bạn là:</p>
                    <div style='background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;'>
                        {otp}
                    </div>
                    <p>Mã này có hiệu lực trong vòng 10 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
                    <p>Trân trọng,<br/>Đội ngũ Ghosttrick</p>
                </div>";
            
            await SendEmailAsync(to, subject, body);
        }
    }
}
