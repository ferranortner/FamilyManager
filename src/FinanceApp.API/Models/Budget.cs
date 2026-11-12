namespace FinanceApp.API.Models
{
    // Límit mensual de despesa per categoria
    public class CategoryBudget
    {
        public int CategoryId { get; set; }
        public decimal MonthlyLimit { get; set; }
    }
}
