using GhostTrick.Domain.Entities;

namespace GhostTrick.Application.Interfaces
{
    public interface IFeedbackService
    {
        // Feedback Items
        Task<IEnumerable<Feedback>> GetActiveFeedbacksAsync();
        Task<IEnumerable<Feedback>> GetAllFeedbacksAdminAsync();
        Task<Feedback> CreateFeedbackAsync(Feedback feedback);
        Task UpdateFeedbackAsync(int id, Feedback feedback);
        Task DeleteFeedbackAsync(int id);
        bool FeedbackExists(int id);
    }
}
