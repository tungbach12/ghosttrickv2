using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using GhostTrick.Application.DTOs;
using GhostTrick.Application.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace GhostTrick.Infrastructure.Services
{
    public class PhotoService : IPhotoService
    {
        private readonly Cloudinary _cloudinary;

        public PhotoService(IConfiguration config)
        {
            var acc = new Account(
                config["Cloudinary:CloudName"],
                config["Cloudinary:ApiKey"],
                config["Cloudinary:ApiSecret"]
            );

            _cloudinary = new Cloudinary(acc);
        }

        public async Task<PhotoUploadResult> AddPhotoAsync(IFormFile file)
        {
            if (file.Length <= 0)
                return new PhotoUploadResult { Success = false, Error = "File is empty" };

            using var stream = file.OpenReadStream();
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream)
            };
            
            var result = await _cloudinary.UploadAsync(uploadParams);

            if (result.Error != null)
            {
                return new PhotoUploadResult 
                { 
                    Success = false, 
                    Error = result.Error.Message 
                };
            }

            return new PhotoUploadResult
            {
                Success = true,
                PublicId = result.PublicId,
                Url = result.SecureUrl.ToString()
            };
        }

        public async Task<PhotoDeletionResult> DeletePhotoAsync(string publicId)
        {
            var deleteParams = new DeletionParams(publicId);
            var result = await _cloudinary.DestroyAsync(deleteParams);

            return new PhotoDeletionResult
            {
                Success = result.Result == "ok",
                Error = result.Error?.Message
            };
        }
    }
}
