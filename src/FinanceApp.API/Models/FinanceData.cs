namespace FinanceApp.API.Models
{
    public class FinanceData
    {
        public List<Account> Accounts { get; set; } = new();
        public List<Transaction> Transactions { get; set; } = new();
        public List<CategoryBudget> Budgets { get; set; } = new();
        public List<Loan> Loans { get; set; } = new();
        public List<RecurringRule> RecurringRules { get; set; } = new();
    }
}
