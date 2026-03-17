public class Transaction
{
    public int Id { get; set; }
    public int AccountId { get; set; }
    public int CategoryId { get; set; }  // ← NOMÉS L'ID
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string Type { get; set; } = "expense"; // "income" o "expense"
    public int AccountingPercentage { get; set; } = 100; // ✅ NOU: Percentatge (default 100%)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // NOTA: No incloure Category aquí, només CategoryId
}