using GhostTrick.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GhostTrick.WebApi.Services
{
    public class AutoBackupBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<AutoBackupBackgroundService> _logger;
        private DateTime _lastBackupTime = DateTime.MinValue;

        public AutoBackupBackgroundService(IServiceProvider serviceProvider, ILogger<AutoBackupBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Auto Backup Service is starting.");

            // Check every 15 minutes if a backup is needed
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await DoWorkAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred executing auto backup.");
                }

                await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
            }
        }

        private async Task DoWorkAsync()
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var settingsService = scope.ServiceProvider.GetRequiredService<ISettingsService>();
                var systemService = scope.ServiceProvider.GetRequiredService<ISystemService>();

                var enabledSetting = await settingsService.GetSettingByKeyAsync("AutoBackupEnabled");
                var intervalSetting = await settingsService.GetSettingByKeyAsync("AutoBackupIntervalHours");

                if (enabledSetting?.Value?.ToLower() != "true")
                    return;

                if (!int.TryParse(intervalSetting?.Value, out int intervalHours) || intervalHours <= 0)
                    intervalHours = 24; // Default to 24h if invalid

                if (DateTime.Now >= _lastBackupTime.AddHours(intervalHours))
                {
                    _logger.LogInformation("Starting scheduled auto backup...");
                    var result = await systemService.CreateBackupAsync();
                    
                    if (result.Success)
                    {
                        _lastBackupTime = DateTime.Now;
                        _logger.LogInformation("Scheduled auto backup completed successfully: {Message}", result.Message);
                    }
                    else
                    {
                        _logger.LogWarning("Scheduled auto backup failed: {Message}", result.Message);
                    }
                }
            }
        }
    }
}
