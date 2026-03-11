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

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TransactionDto>>> GetAll(
            [FromQuery] int? year = null,
            [FromQuery] int? month = null)
        {
            var data = await _dataStore.GetDataAsync();
            var categories = await _categoriesDataStore.GetAllAsync();  // ← CARREGAR CATEGORIES

            var transactions = data.Transactions.AsEnumerable();

            if (year.HasValue)
                transactions = transactions.Where(t => t.Date.Year == year.Value);

            if (month.HasValue)
                transactions = transactions.Where(t => t.Date.Month == month.Value);

            // MAPEAR a DTO amb categoria resolta
            var result = transactions
                .OrderByDescending(t => t.Date)
                .Select(t => new TransactionDto
                {
                    Id = t.Id,
                    AccountId = t.AccountId,
                    CategoryId = t.CategoryId,
                    Category = categories.FirstOrDefault(c => c.Id == t.CategoryId), // ← RESOLDRE FK
                    Amount = t.Amount,
                    Description = t.Description,
                    Date = t.Date,
                    Type = t.Type,
                    CreatedAt = t.CreatedAt
                });

            return Ok(result);
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

        [HttpPost]
        public async Task<ActionResult<Transaction>> Create([FromBody] CreateTransactionRequest request)
        {
            // VALIDAR QUE LA CATEGORIA EXISTEIX
            var category = await _categoriesDataStore.GetByIdAsync(request.CategoryId);
            if (category == null)
                return BadRequest(new { error = "La categoria no existeix" });

            var data = await _dataStore.GetDataAsync();

            var transaction = new Transaction
            {
                Id = data.Transactions.Any() ? data.Transactions.Max(t => t.Id) + 1 : 1,
                AccountId = request.AccountId,
                CategoryId = request.CategoryId,  // ← NOMÉS L'ID
                Amount = request.Amount,
                Description = request.Description,
                Date = request.Date,
                Type = request.Type,
                CreatedAt = DateTime.UtcNow
            };

            data.Transactions.Add(transaction);
            await _dataStore.SaveDataAsync(data);

            return CreatedAtAction(nameof(GetAll), new { id = transaction.Id }, transaction);
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
        public DateTime CreatedAt { get; set; }
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
    }
}