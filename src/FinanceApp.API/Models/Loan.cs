namespace FinanceApp.API.Models
{
    // Préstec amb la mateixa forma que la configuració que tenia el frontend
    public class Loan
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal Principal { get; set; }
        public decimal AnnualRate { get; set; } // p. ex. 0.0675 = 6,75 %
        public int Months { get; set; }
        public string StartDate { get; set; } = string.Empty; // yyyy-MM-dd
        public decimal MonthlyPayment { get; set; }
        public decimal TotalInterest { get; set; }
    }
}
