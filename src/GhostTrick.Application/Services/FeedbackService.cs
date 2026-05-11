using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;

namespace GhostTrick.Application.Services
{
    public class FeedbackService : IFeedbackService
    {
        private readonly IGenericRepository<Feedback> _feedbackRepo;
        private readonly IUnitOfWork _uow;

        public FeedbackService(IGenericRepository<Feedback> feedbackRepo, IUnitOfWork uow)
        {
            _feedbackRepo = feedbackRepo;
            _uow = uow;
        }

        public async Task<IEnumerable<Feedback>> GetActiveFeedbacksAsync()
        {
            return await _feedbackRepo.GetAsync(q => q
                .Where(f => f.IsActive && !f.IsDeleted)
                .OrderBy(f => f.DisplayOrder)
            );
        }

        public async Task<IEnumerable<Feedback>> GetAllFeedbacksAdminAsync()
        {
            return await _feedbackRepo.GetAsync(q => q
                .Where(f => !f.IsDeleted)
                .OrderBy(f => f.DisplayOrder)
            );
        }

        public async Task<Feedback> CreateFeedbackAsync(Feedback feedback)
        {
            feedback.CreatedAt = DateTime.UtcNow;
            await _feedbackRepo.AddAsync(feedback);
            await _uow.CompleteAsync();
            return feedback;
        }

        public async Task UpdateFeedbackAsync(int id, Feedback feedback)
        {
            var existing = await _feedbackRepo.GetByIdAsync(id);
            if (existing == null) throw new KeyNotFoundException("Feedback not found");

            existing.ImageUrl = feedback.ImageUrl;
            existing.CustomerName = feedback.CustomerName;
            existing.IsActive = feedback.IsActive;
            existing.DisplayOrder = feedback.DisplayOrder;
            existing.UpdatedAt = DateTime.UtcNow;

            _feedbackRepo.Update(existing);
            await _uow.CompleteAsync();
        }

        public async Task DeleteFeedbackAsync(int id)
        {
            var feedback = await _feedbackRepo.GetByIdAsync(id);
            if (feedback != null)
            {
                feedback.IsDeleted = true;
                feedback.UpdatedAt = DateTime.UtcNow;
                _feedbackRepo.Update(feedback);
                await _uow.CompleteAsync();
            }
        }

        public bool FeedbackExists(int id)
        {
            // Note: Sync version not directly supported in repo yet, but we can do async if needed.
            // For controller's private helper, we'll see.
            return _feedbackRepo.GetByIdAsync(id).Result != null;
        }
    }
}
