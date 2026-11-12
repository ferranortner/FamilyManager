using Microsoft.AspNetCore.Mvc;
using FinanceApp.API.Data;
using FinanceApp.API.Models;

namespace FinanceApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BudgetsController : ControllerBase
    {
        private readonly JsonDataStore _dataStore;

        public BudgetsController(JsonDataStore dataStore)
        {
            _dataStore = dataStore;
        }

        // GET: api/budgets  → límits configurats
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CategoryBudget>>> GetAll()
        {
            var data = await _dataStore.GetDataAsync();
            return Ok(data.Budgets);
        }

        // GET: api/budgets/progress?year=2026&month=11
        // Despesa efectiva de cada categoria amb límit en el mes indicat
        [HttpGet("progress")]
        public async Task<ActionResult<IEnumerable<object>>> GetProgress([FromQuery] int year, [FromQuery] int month)
        {
            var data = await _dataStore.GetDataAsync();

            var spentByCategory = data.Transactions
                .Where(t => t.Type == "expense" && t.Date.Year == year && t.Date.Month == month)
                .GroupBy(t => t.CategoryId)
                .ToDictionary(g => g.Key, g => g.Sum(t => t.Amount * t.AccountingPercentage / 100m));

            var result = data.Budgets.Select(b =>
            {
                var spent = spentByCategory.TryGetValue(b.CategoryId, out var s) ? s : 0m;
                var percent = b.MonthlyLimit > 0 ? Math.Round(spent / b.MonthlyLimit * 100m, 1) : 0m;
                return new
                {
                    categoryId = b.CategoryId,
                    monthlyLimit = b.MonthlyLimit,
                    spent,
                    percent,
                    remaining = b.MonthlyLimit - spent,
                };
            });

            return Ok(result);
        }

        // PUT: api/budgets/5  → cos: { "monthlyLimit": 300 }  (0 o negatiu elimina el límit)
        [HttpPut("{categoryId}")]
        public async Task<IActionResult> SetLimit(int categoryId, [FromBody] SetBudgetRequest request)
        {
            var data = await _dataStore.GetDataAsync();
            data.Budgets.RemoveAll(b => b.CategoryId == categoryId);

            if (request.MonthlyLimit > 0)
            {
                data.Budgets.Add(new CategoryBudget { CategoryId = categoryId, MonthlyLimit = request.MonthlyLimit });
            }

            await _dataStore.SaveDataAsync(data);
            return NoContent();
        }
    }

    public class SetBudgetRequest
    {
        public decimal MonthlyLimit { get; set; }
    }
}
