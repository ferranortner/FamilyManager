// Models/Event.cs
namespace FinanceApp.API.Models
{
    public class Event
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Type { get; set; } = "other"; // medical, birthday, reminder, other
        public string Date { get; set; } = string.Empty; // Format: "YYYY-MM-DD"
        public bool IsRecurring { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}