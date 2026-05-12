using GhostTrick.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Net.Http.Headers;

namespace GhostTrick.Application.Services
{
    public class SystemService : ISystemService
    {
        private readonly IGhostTrickContext _context;
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ISettingsService _settingsService;

        public SystemService(IGhostTrickContext context, IConfiguration configuration, IHttpClientFactory httpClientFactory, ISettingsService settingsService)
        {
            _context = context;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
            _settingsService = settingsService;
        }

        public async Task<bool> CreateBackupAsync()
        {
            var tokenSetting = await _settingsService.GetSettingByKeyAsync("TelegramToken");
            var chatIdSetting = await _settingsService.GetSettingByKeyAsync("TelegramChatId");

            var token = tokenSetting?.Value ?? _configuration["Telegram:Token"];
            var chatId = chatIdSetting?.Value ?? _configuration["Telegram:ChatId"];
            
            if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(chatId))
                return false;

            var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
            var backupFileName = $"GhostTrickDb_Manual_{timestamp}.bak";
            
            // Path inside DB container (for SQL Server command)
            var dbPath = $"/var/opt/mssql/backups/{backupFileName}";
            // Path inside API container (for file access via shared volume)
            var apiPath = Path.Combine(Directory.GetCurrentDirectory(), "backups", backupFileName);

            try
            {
                // Ensure directory exists in API container
                var apiDir = Path.GetDirectoryName(apiPath);
                if (!Directory.Exists(apiDir)) Directory.CreateDirectory(apiDir);

                // 1. Run SQL Backup command
                // Note: The SQL command uses dbPath because it's executed by the SQL Server process
                await _context.Database.ExecuteSqlRawAsync($"BACKUP DATABASE [GhostTrickDb] TO DISK = N'{dbPath}' WITH FORMAT, MEDIANAME = 'GhostTrickManualBackup', NAME = 'Full Backup of GhostTrickDb'");

                // 2. Wait a bit for file to be ready and volume sync
                await Task.Delay(2000);

                if (!File.Exists(apiPath))
                {
                    Console.WriteLine($"Backup file not found at API path: {apiPath}");
                    return false;
                }

                // 3. Send to Telegram
                using var client = _httpClientFactory.CreateClient();
                using var request = new HttpRequestMessage(HttpMethod.Post, $"https://api.telegram.org/bot{token}/sendDocument");
                
                using var content = new MultipartFormDataContent();
                content.Add(new StringContent(chatId), "chat_id");
                content.Add(new StringContent($"🚀 *Manual Backup Triggered*\n\nFile: `{backupFileName}`\nTime: {DateTime.Now:dd/MM/yyyy HH:mm:ss}\nStatus: Success"), "caption");
                content.Add(new StringContent("Markdown"), "parse_mode");

                using var fileStream = File.OpenRead(apiPath);
                using var fileContent = new StreamContent(fileStream);
                fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
                content.Add(fileContent, "document", backupFileName);

                request.Content = content;
                var response = await client.SendAsync(request);

                // 4. Cleanup
                fileStream.Close();
                if (File.Exists(apiPath))
                    File.Delete(apiPath);

                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Backup failed: {ex.Message}");
                return false;
            }
        }
    }
}
