namespace FinanceApp.API.Models
{
    public class FinanceData
    {
        public List<Account> Accounts { get; set; } = new();
        public List<Transaction> Transactions { get; set; } = new();
        public List<Budget> Budgets { get; set; } = new();
    }
}