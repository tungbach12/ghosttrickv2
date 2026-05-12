using GhostTrick.Application.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GhostTrick.Application.Interfaces
{
    public interface ISizeChartService
    {
        Task<List<SizeChartDto>> GetAllAsync();
        Task<SizeChartDto?> GetByIdAsync(int id);
        Task<SizeChartDto> CreateAsync(CreateSizeChartDto dto);
        Task<SizeChartDto> UpdateAsync(int id, CreateSizeChartDto dto);
        Task DeleteAsync(int id);
    }
}
