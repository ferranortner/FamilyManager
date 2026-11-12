using Microsoft.AspNetCore.Mvc;
using FinanceApp.API.Data;
using FinanceApp.API.Models;

namespace FinanceApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LoansController : ControllerBase
    {
        private readonly JsonDataStore _dataStore;

        public LoansController(JsonDataStore dataStore)
        {
            _dataStore = dataStore;
        }

        // GET: api/loans
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Loan>>> GetAll()
        {
            var data = await _dataStore.GetDataAsync();
            return Ok(data.Loans);
        }

        // PUT: api/loans  → substitueix la llista completa de préstecs
        [HttpPut]
        public async Task<IActionResult> ReplaceAll([FromBody] List<Loan> loans)
        {
            var invalid = loans.FirstOrDefault(l =>
                string.IsNullOrWhiteSpace(l.Id) ||
                string.IsNullOrWhiteSpace(l.Name) ||
                l.Principal <= 0 ||
                l.Months <= 0 ||
                l.AnnualRate < 0);

            if (invalid != null)
                return BadRequest(new { error = $"Préstec no vàlid: {invalid.Name}" });

            var data = await _dataStore.GetDataAsync();
            data.Loans = loans;
            await _dataStore.SaveDataAsync(data);
            return NoContent();
        }
    }
}
