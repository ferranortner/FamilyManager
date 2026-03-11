namespace FinanceApp.API.Models;

public class Budget
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal TotalLimit { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public List<CategoryBudget> CategoryBudgets { get; set; } = new();
}

public class CategoryBudget
{
    public Guid CategoryId { get; set; }
    public decimal Limit { get; set; }
}