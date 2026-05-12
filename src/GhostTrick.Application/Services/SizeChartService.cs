using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GhostTrick.Application.Services
{
    public class SizeChartService : ISizeChartService
    {
        private readonly IGenericRepository<SizeChart> _sizeChartRepo;
        private readonly IUnitOfWork _unitOfWork;

        public SizeChartService(IGenericRepository<SizeChart> sizeChartRepo, IUnitOfWork unitOfWork)
        {
            _sizeChartRepo = sizeChartRepo;
            _unitOfWork = unitOfWork;
        }

        public async Task<List<SizeChartDto>> GetAllAsync()
        {
            var items = await _sizeChartRepo.GetAllAsync();
            return items.Select(i => new SizeChartDto
            {
                Id = i.Id,
                Name = i.Name,
                ImageUrl = i.ImageUrl
            }).ToList();
        }

        public async Task<SizeChartDto?> GetByIdAsync(int id)
        {
            var item = await _sizeChartRepo.GetByIdAsync(id);
            if (item == null) return null;

            return new SizeChartDto
            {
                Id = item.Id,
                Name = item.Name,
                ImageUrl = item.ImageUrl
            };
        }

        public async Task<SizeChartDto> CreateAsync(CreateSizeChartDto dto)
        {
            var entity = new SizeChart
            {
                Name = dto.Name ?? "Unnamed Chart",
                ImageUrl = dto.ImageUrl ?? ""
            };

            await _sizeChartRepo.AddAsync(entity);
            await _unitOfWork.CompleteAsync();

            return new SizeChartDto
            {
                Id = entity.Id,
                Name = entity.Name,
                ImageUrl = entity.ImageUrl
            };
        }

        public async Task<SizeChartDto> UpdateAsync(int id, CreateSizeChartDto dto)
        {
            var entity = await _sizeChartRepo.GetByIdAsync(id);
            if (entity == null) throw new System.Exception("Size chart not found");

            entity.Name = dto.Name ?? entity.Name;
            entity.ImageUrl = dto.ImageUrl ?? entity.ImageUrl;

            _sizeChartRepo.Update(entity);
            await _unitOfWork.CompleteAsync();

            return new SizeChartDto
            {
                Id = entity.Id,
                Name = entity.Name,
                ImageUrl = entity.ImageUrl
            };
        }

        public async Task DeleteAsync(int id)
        {
            var entity = await _sizeChartRepo.GetByIdAsync(id);
            if (entity != null)
            {
                entity.IsDeleted = true;
                _sizeChartRepo.Update(entity);
                await _unitOfWork.CompleteAsync();
            }
        }
    }
}
