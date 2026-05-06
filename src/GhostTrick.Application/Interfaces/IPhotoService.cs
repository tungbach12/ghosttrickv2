using GhostTrick.Application.DTOs;
using Microsoft.AspNetCore.Http;

namespace GhostTrick.Application.Interfaces
{
    public interface IPhotoService
    {
        Task<PhotoUploadResult> AddPhotoAsync(IFormFile file);
        Task<PhotoDeletionResult> DeletePhotoAsync(string publicId);
    }
}
