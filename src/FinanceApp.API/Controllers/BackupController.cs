using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using FinanceApp.API.Data;

namespace FinanceApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BackupController : ControllerBase
    {
        private readonly JsonDataStore _dataStore;
        private readonly CategoriesDataStore _categoriesDataStore;

        public BackupController(JsonDataStore dataStore, CategoriesDataStore categoriesDataStore)
        {
            _dataStore = dataStore;
            _categoriesDataStore = categoriesDataStore;
        }

        // GET: api/backup/export  → descarrega el JSON tal com està al disc
        [HttpGet("export")]
        public async Task<IActionResult> Export()
        {
            var json = await _dataStore.GetRawJsonAsync();
            if (json == null)
                return NotFound(new { error = "Encara no hi ha dades" });

            var bytes = Encoding.UTF8.GetBytes(json);
            var fileName = $"finance-backup-{DateTime.Now:yyyyMMdd-HHmm}.json";
            return File(bytes, "application/json", fileName);
        }

        // GET: api/backup/transactions.csv?year=2026&month=11  (ambdós opcionals)
        // Separador ';' i BOM UTF-8 perquè Excel l'obri bé en català/castellà.
        [HttpGet("transactions.csv")]
        public async Task<IActionResult> ExportTransactionsCsv([FromQuery] int? year, [FromQuery] int? month)
        {
            var data = await _dataStore.GetDataAsync();
            var categories = await _categoriesDataStore.GetAllAsync();

            var query = data.Transactions.AsEnumerable();
            if (year.HasValue) query = query.Where(t => t.Date.Year == year.Value);
            if (month.HasValue) query = query.Where(t => t.Date.Month == month.Value);

            var sb = new StringBuilder();
            sb.AppendLine("Data;Descripció;Categoria;Tipus;Import;Percentatge;Import comptabilitzat");

            foreach (var t in query.OrderBy(t => t.Date).ThenBy(t => t.Id))
            {
                var category = categories.FirstOrDefault(c => c.Id == t.CategoryId)?.Name ?? "";
                var effective = t.Amount * t.AccountingPercentage / 100m;
                sb.AppendLine(string.Join(';',
                    t.Date.ToString("yyyy-MM-dd"),
                    Csv(t.Description),
                    Csv(category),
                    t.Type == "income" ? "Ingrés" : "Despesa",
                    t.Amount.ToString("0.00", CultureInfo.InvariantCulture),
                    t.AccountingPercentage.ToString(CultureInfo.InvariantCulture) + "%",
                    effective.ToString("0.00", CultureInfo.InvariantCulture)));
            }

            var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
            var suffix = year.HasValue ? (month.HasValue ? $"{year:0000}-{month:00}" : $"{year:0000}") : "tot";
            return File(bytes, "text/csv", $"transaccions-{suffix}.csv");
        }

        private static string Csv(string? value)
        {
            var v = value ?? string.Empty;
            return v.Contains(';') || v.Contains('"') || v.Contains('\n')
                ? "\"" + v.Replace("\"", "\"\"") + "\""
                : v;
        }
    }
}
