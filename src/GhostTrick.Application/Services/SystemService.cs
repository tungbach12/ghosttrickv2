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

        public async Task<bool> CreateBackupAsync()
        {
            var tokenSetting = await _settingsService.GetSettingByKeyAsync("TelegramToken");
            var chatIdSetting = await _settingsService.GetSettingByKeyAsync("TelegramChatId");

            var token = tokenSetting?.Value ?? _configuration["Telegram:Token"];
            var chatId = chatIdSetting?.Value ?? _configuration["Telegram:ChatId"];
            
            if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(chatId))
            {
                _logger.LogWarning("Telegram configuration is missing. Token or ChatId is null/empty.");
                return false;
            }

            var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
            var backupFileName = $"GhostTrickDb_Manual_{timestamp}.bak";
            
            string dbPath;
            string apiPath;

            if (System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.Windows))
            {
                // On Windows (Local Dev), we assume SQL and API are on the same machine
                var backupDir = Path.Combine(Directory.GetCurrentDirectory(), "backups");
                if (!Directory.Exists(backupDir)) Directory.CreateDirectory(backupDir);
                
                apiPath = Path.Combine(backupDir, backupFileName);
                dbPath = apiPath; // SQL Server can use the same path if it's local
            }
            else
            {
                // Path inside DB container (for SQL Server command)
                dbPath = $"/var/opt/mssql/backups/{backupFileName}";
                // Path inside API container (for file access via shared volume)
                apiPath = Path.Combine(Directory.GetCurrentDirectory(), "backups", backupFileName);
                
                var apiDir = Path.GetDirectoryName(apiPath);
                if (!Directory.Exists(apiDir)) Directory.CreateDirectory(apiDir);
            }

            try
            {
                _logger.LogInformation("Starting backup. dbPath: {DbPath}, apiPath: {ApiPath}", dbPath, apiPath);

                // 1. Run SQL Backup command
                await _context.Database.ExecuteSqlRawAsync($"BACKUP DATABASE [GhostTrickDb] TO DISK = N'{dbPath}' WITH FORMAT, MEDIANAME = 'GhostTrickManualBackup', NAME = 'Full Backup of GhostTrickDb'");

                // 2. Wait a bit for file to be ready
                await Task.Delay(2000);

                if (!File.Exists(apiPath))
                {
                    _logger.LogError("Backup file not found at API path: {ApiPath}. Check if SQL Server has write permissions to this folder or if paths match.", apiPath);
                    return false;
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
                    _logger.LogInformation("Backup compressed successfully (GZ): {GzFileName}", gzFileName);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to compress backup file to GZ. Proceeding with raw .bak file.");
                    gzPath = apiPath; 
                    gzFileName = backupFileName;
                }

                // 4. Send to Telegram
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

                    // 5. Cleanup
                    fileStream.Close();
                    
                    if (File.Exists(apiPath)) File.Delete(apiPath);
                    if (File.Exists(gzPath) && gzPath != apiPath) File.Delete(gzPath);

                    if (!response.IsSuccessStatusCode)
                    {
                        var errorMsg = await response.Content.ReadAsStringAsync();
                        _logger.LogError("Failed to send backup to Telegram. Status: {StatusCode}, Error: {Error}", response.StatusCode, errorMsg);
                        return false;
                    }
                }

                _logger.LogInformation("Backup successfully created, compressed (GZ), and sent to Telegram: {FileName}", gzFileName);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unexpected error occurred during the backup process.");
                return false;
            }
        }
    }
}
