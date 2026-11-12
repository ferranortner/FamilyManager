using Microsoft.AspNetCore.Mvc;
using FinanceApp.API.Models;
using FinanceApp.API.Data;

namespace FinanceApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TransactionsController : ControllerBase
    {
        private readonly JsonDataStore _dataStore;
        private readonly CategoriesDataStore _categoriesDataStore;  // ← NOU

        public TransactionsController(
            JsonDataStore dataStore,
            CategoriesDataStore categoriesDataStore)  // ← INJECTAR
        {
            _dataStore = dataStore;
            _categoriesDataStore = categoriesDataStore;
        }

        [HttpGet("summary")]
        public async Task<ActionResult<object>> GetSummary([FromQuery] int year, [FromQuery] int month)
        {
            var data = await _dataStore.GetDataAsync();
            var transactions = data.Transactions.Where(t =>
                t.Date.Year == year && t.Date.Month == month);

            var income = transactions.Where(t => t.Type == "income").Sum(t => t.Amount);
            var expenses = transactions.Where(t => t.Type == "expense").Sum(t => t.Amount);

            return Ok(new
            {
                totalIncome = income,
                totalExpenses = expenses,
                balance = income - expenses
            });
        }

        // Controllers/TransactionsController.cs

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TransactionDto>>> GetAll(
            [FromQuery] int? year = null,
            [FromQuery] int? month = null)
        {
            var data = await _dataStore.GetDataAsync();
            var categories = await _categoriesDataStore.GetAllAsync();

            var transactions = data.Transactions.AsEnumerable();

            if (year.HasValue)
                transactions = transactions.Where(t => t.Date.Year == year.Value);

            if (month.HasValue)
                transactions = transactions.Where(t => t.Date.Month == month.Value);

            var result = transactions
                .OrderByDescending(t => t.Date)
                .Select(t => new TransactionDto
                {
                    Id = t.Id,
                    AccountId = t.AccountId,
                    CategoryId = t.CategoryId,
                    Category = categories.FirstOrDefault(c => c.Id == t.CategoryId),
                    Amount = t.Amount,
                    Description = t.Description,
                    Date = t.Date,
                    Type = t.Type,
                    AccountingPercentage = t.AccountingPercentage, // ✅ Afegir
                    CreatedAt = t.CreatedAt,
                    RecurringRuleId = t.RecurringRuleId
                });

            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<Transaction>> Create([FromBody] CreateTransactionRequest request)
        {
            var validation = TransactionValidator.Validate(request.Amount, request.Type, request.AccountingPercentage);
            if (validation != null)
                return BadRequest(new { error = validation });

            var category = await _categoriesDataStore.GetByIdAsync(request.CategoryId);
            if (category == null)
                return BadRequest(new { error = "La categoria no existeix" });

            var data = await _dataStore.GetDataAsync();

            var transaction = new Transaction
            {
                Id = data.Transactions.Any() ? data.Transactions.Max(t => t.Id) + 1 : 1,
                AccountId = request.AccountId,
                CategoryId = request.CategoryId,
                Amount = request.Amount,
                Description = request.Description,
                Date = request.Date,
                Type = request.Type,
                AccountingPercentage = request.AccountingPercentage, // ✅ Afegir
                CreatedAt = DateTime.UtcNow
            };

            data.Transactions.Add(transaction);
            await _dataStore.SaveDataAsync(data);

            return CreatedAtAction(nameof(GetAll), new { id = transaction.Id }, transaction);
        }

        // ✅ NOU: Endpoint PUT per actualitzar
        [HttpPut("{id}")]
        public async Task<ActionResult<Transaction>> Update(int id, [FromBody] UpdateTransactionRequest request)
        {
            var validation = TransactionValidator.Validate(request.Amount, request.Type, request.AccountingPercentage);
            if (validation != null)
                return BadRequest(new { error = validation });

            var data = await _dataStore.GetDataAsync();
            var transaction = data.Transactions.FirstOrDefault(t => t.Id == id);

            if (transaction == null)
                return NotFound();

            // Validar categoria
            var category = await _categoriesDataStore.GetByIdAsync(request.CategoryId);
            if (category == null)
                return BadRequest(new { error = "La categoria no existeix" });

            // Actualitzar camps
            transaction.AccountId = request.AccountId;
            transaction.CategoryId = request.CategoryId;
            transaction.Amount = request.Amount;
            transaction.Description = request.Description;
            transaction.Date = request.Date;
            transaction.Type = request.Type;
            transaction.AccountingPercentage = request.AccountingPercentage; // ✅ Afegir

            await _dataStore.SaveDataAsync(data);

            return Ok(transaction);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var data = await _dataStore.GetDataAsync();
            var transaction = data.Transactions.FirstOrDefault(t => t.Id == id);

            if (transaction == null)
                return NotFound();

            data.Transactions.Remove(transaction);
            await _dataStore.SaveDataAsync(data);

            return NoContent();
        }
    }

    public static class TransactionValidator
    {
        public static string? Validate(decimal amount, string type, int accountingPercentage)
        {
            if (amount <= 0)
                return "L'import ha de ser positiu";
            if (type != "income" && type != "expense")
                return "El tipus ha de ser 'income' o 'expense'";
            if (accountingPercentage < 1 || accountingPercentage > 100)
                return "El percentatge ha d'estar entre 1 i 100";
            return null;
        }
    }

    // DTO per retornar transacció amb categoria resolta
    public class TransactionDto
    {
        public int Id { get; set; }
        public int AccountId { get; set; }
        public int CategoryId { get; set; }
        public Category? Category { get; set; }  // ← Categoria completa (opcional)
        public decimal Amount { get; set; }
        public string Description { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Type { get; set; } = string.Empty;
        public int AccountingPercentage { get; set; } = 100; // ✅ Afegir
        public DateTime CreatedAt { get; set; }
        public int? RecurringRuleId { get; set; }
    }

    // Request per crear transacció
    public class CreateTransactionRequest
    {
        public int AccountId { get; set; }
        public int CategoryId { get; set; }
        public decimal Amount { get; set; }
        public string Description { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Type { get; set; } = "expense";
        public int AccountingPercentage { get; set; } = 100; // ✅ Afegir
    }


    // ✅ NOU: Request per actualitzar
    public class UpdateTransactionRequest
    {
        public int AccountId { get; set; }
        public int CategoryId { get; set; }
        public decimal Amount { get; set; }
        public string Description { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Type { get; set; } = string.Empty;
        public int AccountingPercentage { get; set; } = 100;
    }
}