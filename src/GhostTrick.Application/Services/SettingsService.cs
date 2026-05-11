using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Application.Services
{
    public class SettingsService : ISettingsService
    {
        private readonly IGenericRepository<SystemSetting> _settingRepo;
        private readonly IUnitOfWork _uow;

        public SettingsService(IGenericRepository<SystemSetting> settingRepo, IUnitOfWork uow)
        {
            _settingRepo = settingRepo;
            _uow = uow;
        }

        public async Task<List<SystemSetting>> GetAllSettingsAsync()
        {
            return await _settingRepo.GetAllAsync();
        }

        public async Task<SystemSetting?> GetSettingByKeyAsync(string key)
        {
            var result = await _settingRepo.FindAsync(s => s.Key == key);
            return result.FirstOrDefault();
        }

        public async Task UpdateSettingAsync(string key, string value)
        {
            var result = await _settingRepo.FindAsync(s => s.Key == key);
            var setting = result.FirstOrDefault();

            if (setting == null)
            {
                setting = new SystemSetting { Key = key, Value = value };
                await _settingRepo.AddAsync(setting);
            }
            else
            {
                setting.Value = value;
                setting.UpdatedAt = DateTime.UtcNow;
                _settingRepo.Update(setting);
            }

            await _uow.CompleteAsync();
        }
    }
}
