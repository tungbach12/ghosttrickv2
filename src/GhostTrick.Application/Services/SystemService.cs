using GhostTrick.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Headers;
using System.IO.Compression;

namespace GhostTrick.Application.Services
{
    public class SystemService : ISystemService
    {
        private readonly IGhostTrickContext _context;
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ISettingsService _settingsService;
        private readonly ILogger<SystemService> _logger;

        public SystemService(
            IGhostTrickContext context, 
            IConfiguration configuration, 
            IHttpClientFactory httpClientFactory, 
            ISettingsService settingsService,
            ILogger<SystemService> logger)
        {
            _context = context;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
            _settingsService = settingsService;
            _logger = logger;
        }

        public async Task<(bool Success, string Message)> CreateBackupAsync()
        {
            try
            {
                var tokenSetting = await _settingsService.GetSettingByKeyAsync("TelegramToken");
                var chatIdSetting = await _settingsService.GetSettingByKeyAsync("TelegramChatId");

                var token = (tokenSetting?.Value ?? _configuration["Telegram:Token"])?.Trim();
                var chatId = (chatIdSetting?.Value ?? _configuration["Telegram:ChatId"])?.Trim();
                
                if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(chatId))
                {
                    _logger.LogWarning("Telegram configuration is missing. Token or ChatId is null/empty.");
                    return (false, "Cấu hình Telegram bị thiếu (Token hoặc ChatId trống). Vui lòng kiểm tra lại trong phần Cài đặt.");
                }

                var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                var backupFileName = $"GhostTrickDb_Manual_{timestamp}.bak";
                
                string dbPath;
                string apiPath;

                if (System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.Windows))
                {
                    var backupDir = Path.Combine(Directory.GetCurrentDirectory(), "backups");
                    if (!Directory.Exists(backupDir)) Directory.CreateDirectory(backupDir);
                    
                    apiPath = Path.Combine(backupDir, backupFileName);
                    dbPath = apiPath;
                }
                else
                {
                    // Path inside DB container
                    dbPath = $"/var/opt/mssql/backups/{backupFileName}";
                    // Path inside API container
                    apiPath = Path.Combine(Directory.GetCurrentDirectory(), "backups", backupFileName);
                    
                    var apiDir = Path.GetDirectoryName(apiPath);
                    if (!Directory.Exists(apiDir!)) Directory.CreateDirectory(apiDir!);
                }

                _logger.LogInformation("Starting backup process. dbPath: {DbPath}, apiPath: {ApiPath}", dbPath, apiPath);

                // 1. Run SQL Backup command
                try 
                {
                    await _context.Database.ExecuteSqlRawAsync($"BACKUP DATABASE [GhostTrickDb] TO DISK = N'{dbPath}' WITH FORMAT, MEDIANAME = 'GhostTrickManualBackup', NAME = 'Full Backup of GhostTrickDb'");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "SQL Backup command failed.");
                    return (false, $"Lỗi SQL Backup: {ex.Message}. Đảm bảo container DB có quyền ghi vào volume mssql_backups.");
                }

                // 2. Wait a bit and check if file exists
                await Task.Delay(2000);

                if (!File.Exists(apiPath))
                {
                    _logger.LogError("Backup file not found at API path: {ApiPath}", apiPath);
                    return (false, $"Không tìm thấy file backup tại đường dẫn API: {apiPath}. Kiểm tra volume mapping giữa container DB và API.");
                }

                // 3. Compress the backup file using GZip
                var gzFileName = $"{backupFileName}.gz";
                var gzPath = Path.Combine(Path.GetDirectoryName(apiPath)!, gzFileName);
                
                try 
                {
                    if (File.Exists(gzPath)) File.Delete(gzPath);
                    
                    using (var sourceStream = new FileStream(apiPath, FileMode.Open, FileAccess.Read))
                    using (var targetStream = new FileStream(gzPath, FileMode.Create, FileAccess.Write))
                    using (var gzipStream = new GZipStream(targetStream, CompressionMode.Compress))
                    {
                        await sourceStream.CopyToAsync(gzipStream);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to compress backup file to GZ.");
                    gzPath = apiPath; 
                    gzFileName = backupFileName;
                }

                // 4. Send to Telegram
                _logger.LogInformation("Sending backup to Telegram. Token: {TokenPrefix}..., ChatId: {ChatId}", token[..5], chatId);
                
                using var client = _httpClientFactory.CreateClient();
                using var request = new HttpRequestMessage(HttpMethod.Post, $"https://api.telegram.org/bot{token}/sendDocument");
                
                using var content = new MultipartFormDataContent();
                content.Add(new StringContent(chatId), "chat_id");
                content.Add(new StringContent($"🚀 *Manual Backup Triggered*\n\nFile: `{gzFileName}`\nTime: {DateTime.Now:dd/MM/yyyy HH:mm:ss}\nStatus: Success"), "caption");
                content.Add(new StringContent("Markdown"), "parse_mode");

                using (var fileStream = File.OpenRead(gzPath))
                {
                    using var fileContent = new StreamContent(fileStream);
                    fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
                    content.Add(fileContent, "document", gzFileName);

                    request.Content = content;
                    var response = await client.SendAsync(request);
                    
                    fileStream.Close();
                    
                    // Cleanup
                    if (File.Exists(apiPath)) File.Delete(apiPath);
                    if (File.Exists(gzPath) && gzPath != apiPath) File.Delete(gzPath);

                    if (!response.IsSuccessStatusCode)
                    {
                        var errorMsg = await response.Content.ReadAsStringAsync();
                        _logger.LogError("Telegram API error. Status: {StatusCode}, Error: {Error}", response.StatusCode, errorMsg);
                        return (false, $"Lỗi Telegram API ({response.StatusCode}): {errorMsg}");
                    }
                }

                return (true, "Backup thành công và đã gửi qua Telegram!");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in CreateBackupAsync");
                return (false, $"Lỗi không xác định: {ex.Message}");
            }
        }
    }
}
