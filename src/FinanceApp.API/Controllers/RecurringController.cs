using Microsoft.AspNetCore.Mvc;
using FinanceApp.API.Data;
using FinanceApp.API.Models;

namespace FinanceApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecurringController : ControllerBase
    {
        private readonly JsonDataStore _dataStore;
        private readonly CategoriesDataStore _categoriesDataStore;

        public RecurringController(JsonDataStore dataStore, CategoriesDataStore categoriesDataStore)
        {
            _dataStore = dataStore;
            _categoriesDataStore = categoriesDataStore;
        }

        // GET: api/recurring
        [HttpGet]
        public async Task<ActionResult<IEnumerable<RecurringRule>>> GetAll()
        {
            var data = await _dataStore.GetDataAsync();
            return Ok(data.RecurringRules);
        }

        // POST: api/recurring
        [HttpPost]
        public async Task<ActionResult<RecurringRule>> Create([FromBody] RecurringRule rule)
        {
            var error = await ValidateAsync(rule);
            if (error != null)
                return BadRequest(new { error });

            var data = await _dataStore.GetDataAsync();
            rule.Id = data.RecurringRules.Any() ? data.RecurringRules.Max(r => r.Id) + 1 : 1;
            data.RecurringRules.Add(rule);
            await _dataStore.SaveDataAsync(data);

            return CreatedAtAction(nameof(GetAll), new { id = rule.Id }, rule);
        }

        // PUT: api/recurring/3
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] RecurringRule rule)
        {
            var error = await ValidateAsync(rule);
            if (error != null)
                return BadRequest(new { error });

            var data = await _dataStore.GetDataAsync();
            var existing = data.RecurringRules.FirstOrDefault(r => r.Id == id);
            if (existing == null)
                return NotFound();

            existing.Description = rule.Description;
            existing.Amount = rule.Amount;
            existing.Type = rule.Type;
            existing.CategoryId = rule.CategoryId;
            existing.AccountId = rule.AccountId;
            existing.AccountingPercentage = rule.AccountingPercentage;
            existing.DayOfMonth = rule.DayOfMonth;
            existing.StartDate = rule.StartDate;
            existing.EndDate = rule.EndDate;
            existing.IsActive = rule.IsActive;

            await _dataStore.SaveDataAsync(data);
            return NoContent();
        }

        // DELETE: api/recurring/3  (només elimina la regla; les transaccions ja generades es conserven)
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var data = await _dataStore.GetDataAsync();
            var removed = data.RecurringRules.RemoveAll(r => r.Id == id);
            if (removed == 0)
                return NotFound();

            await _dataStore.SaveDataAsync(data);
            return NoContent();
        }

        // POST: api/recurring/generate?until=2027-12-31
        // Crea les transaccions de cada regla activa fins a la data indicada, sense duplicar mesos.
        [HttpPost("generate")]
        public async Task<ActionResult<object>> Generate([FromQuery] DateTime until)
        {
            var data = await _dataStore.GetDataAsync();
            var created = 0;
            var nextId = data.Transactions.Any() ? data.Transactions.Max(t => t.Id) + 1 : 1;

            foreach (var rule in data.RecurringRules.Where(r => r.IsActive))
            {
                var last = rule.EndDate.HasValue && rule.EndDate.Value < until ? rule.EndDate.Value : until;
                var cursor = new DateTime(rule.StartDate.Year, rule.StartDate.Month, 1);

                while (cursor <= last)
                {
                    var day = Math.Min(rule.DayOfMonth, DateTime.DaysInMonth(cursor.Year, cursor.Month));
                    var date = new DateTime(cursor.Year, cursor.Month, day);

                    var inRange = date >= rule.StartDate.Date && date <= last;
                    var alreadyExists = data.Transactions.Any(t =>
                        t.RecurringRuleId == rule.Id && t.Date.Year == date.Year && t.Date.Month == date.Month);

                    if (inRange && !alreadyExists)
                    {
                        data.Transactions.Add(new Transaction
                        {
                            Id = nextId++,
                            AccountId = rule.AccountId,
                            CategoryId = rule.CategoryId,
                            Amount = rule.Amount,
                            Description = rule.Description,
                            Date = date,
                            Type = rule.Type,
                            AccountingPercentage = rule.AccountingPercentage,
                            RecurringRuleId = rule.Id,
                            CreatedAt = DateTime.UtcNow,
                        });
                        created++;
                    }

                    cursor = cursor.AddMonths(1);
                }
            }

            if (created > 0)
                await _dataStore.SaveDataAsync(data);

            return Ok(new { created });
        }

        private async Task<string?> ValidateAsync(RecurringRule rule)
        {
            if (string.IsNullOrWhiteSpace(rule.Description))
                return "La descripció és obligatòria";
            if (rule.Amount <= 0)
                return "L'import ha de ser positiu";
            if (rule.Type != "income" && rule.Type != "expense")
                return "El tipus ha de ser 'income' o 'expense'";
            if (rule.DayOfMonth < 1 || rule.DayOfMonth > 28)
                return "El dia del mes ha d'estar entre 1 i 28";
            if (rule.AccountingPercentage < 1 || rule.AccountingPercentage > 100)
                return "El percentatge ha d'estar entre 1 i 100";
            if (rule.EndDate.HasValue && rule.EndDate.Value < rule.StartDate)
                return "La data de fi és anterior a la d'inici";

            var category = await _categoriesDataStore.GetByIdAsync(rule.CategoryId);
            if (category == null)
                return "La categoria no existeix";

            return null;
        }
    }
}
