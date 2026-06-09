using GhostTrick.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Headers;
using System.IO.Compression;
using System.Diagnostics;

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
                var backupFileName = $"GhostTrickDb_Manual_{timestamp}.sql";
                
                var backupDir = Path.Combine(Directory.GetCurrentDirectory(), "backups");
                if (!Directory.Exists(backupDir)) Directory.CreateDirectory(backupDir);
                
                var backupPath = Path.Combine(backupDir, backupFileName);

                _logger.LogInformation("Starting PostgreSQL backup process. backupPath: {BackupPath}", backupPath);

                // 1. Extract connection info from the connection string
                var connectionString = _configuration.GetConnectionString("DefaultConnection") ?? "";
                var connParts = ParseConnectionString(connectionString);

                // 2. Run pg_dump command
                try
                {
                    var pgDumpPath = FindPgDump();
                    
                    var startInfo = new ProcessStartInfo
                    {
                        FileName = pgDumpPath,
                        Arguments = $"--host={connParts.Host} --port={connParts.Port} --username={connParts.Username} --format=plain --file=\"{backupPath}\" {connParts.Database}",
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    };
                    
                    // Set PGPASSWORD environment variable for authentication
                    startInfo.EnvironmentVariables["PGPASSWORD"] = connParts.Password;

                    using var process = Process.Start(startInfo);
                    if (process == null)
                    {
                        return (false, "Không thể khởi chạy pg_dump. Đảm bảo PostgreSQL client tools đã được cài đặt.");
                    }

                    var stderr = await process.StandardError.ReadToEndAsync();
                    await process.WaitForExitAsync();

                    if (process.ExitCode != 0)
                    {
                        _logger.LogError("pg_dump failed with exit code {ExitCode}: {Error}", process.ExitCode, stderr);
                        return (false, $"Lỗi pg_dump (exit code {process.ExitCode}): {stderr}");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "PostgreSQL backup command failed.");
                    return (false, $"Lỗi PostgreSQL Backup: {ex.Message}. Đảm bảo pg_dump đã được cài đặt và có trong PATH.");
                }

                if (!File.Exists(backupPath))
                {
                    _logger.LogError("Backup file not found at path: {BackupPath}", backupPath);
                    return (false, $"Không tìm thấy file backup tại đường dẫn: {backupPath}.");
                }

                // 3. Compress the backup file using GZip
                var gzFileName = $"{backupFileName}.gz";
                var gzPath = Path.Combine(backupDir, gzFileName);
                
                try 
                {
                    if (File.Exists(gzPath)) File.Delete(gzPath);
                    
                    using (var sourceStream = new FileStream(backupPath, FileMode.Open, FileAccess.Read))
                    using (var targetStream = new FileStream(gzPath, FileMode.Create, FileAccess.Write))
                    using (var gzipStream = new GZipStream(targetStream, CompressionMode.Compress))
                    {
                        await sourceStream.CopyToAsync(gzipStream);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to compress backup file to GZ.");
                    gzPath = backupPath; 
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
                    if (File.Exists(backupPath)) File.Delete(backupPath);
                    if (File.Exists(gzPath) && gzPath != backupPath) File.Delete(gzPath);

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

        private static string FindPgDump()
        {
            // Check if pg_dump is in PATH
            var pgDump = "pg_dump";
            
            if (System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.Windows))
            {
                // Check common installation paths on all drives
                var programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
                var drives = new[] { programFiles, programFiles.Replace("C:", "E:"), programFiles.Replace("C:", "D:") };
                var versions = new[] { "18", "17", "16", "15", "14" };
                
                foreach (var drive in drives)
                {
                    foreach (var ver in versions)
                    {
                        var path = Path.Combine(drive, "PostgreSQL", ver, "bin", "pg_dump.exe");
                        if (File.Exists(path))
                            return path;
                    }
                }
            }

            return pgDump; // Fallback to PATH
        }

        private static (string Host, string Port, string Database, string Username, string Password) ParseConnectionString(string connectionString)
        {
            var host = "localhost";
            var port = "5432";
            var database = "GhostTrickDb";
            var username = "postgres";
            var password = "";

            foreach (var part in connectionString.Split(';', StringSplitOptions.RemoveEmptyEntries))
            {
                var kv = part.Split('=', 2);
                if (kv.Length != 2) continue;

                var key = kv[0].Trim().ToLower();
                var value = kv[1].Trim();

                switch (key)
                {
                    case "host":
                    case "server":
                        host = value;
                        break;
                    case "port":
                        port = value;
                        break;
                    case "database":
                        database = value;
                        break;
                    case "username":
                    case "user id":
                        username = value;
                        break;
                    case "password":
                        password = value;
                        break;
                }
            }

            return (host, port, database, username, password);
        }
    }
}
