using GhostTrick.Domain.Entities;

namespace GhostTrick.Application.Interfaces
{
    public interface ISettingsService
    {
        Task<List<SystemSetting>> GetAllSettingsAsync();
        Task<SystemSetting?> GetSettingByKeyAsync(string key);
        Task UpdateSettingAsync(string key, string value);
    }
}
