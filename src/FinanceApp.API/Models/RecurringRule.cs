namespace FinanceApp.API.Models
{
    // Regla de transacció recurrent mensual (p. ex. lloguer, subscripcions)
    public class RecurringRule
    {
        public int Id { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Type { get; set; } = "expense"; // "income" o "expense"
        public int CategoryId { get; set; }
        public int AccountId { get; set; } = 1;
        public int AccountingPercentage { get; set; } = 100;
        public int DayOfMonth { get; set; } = 1; // 1..28
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
