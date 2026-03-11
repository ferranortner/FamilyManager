// ReportsController.cs
using Microsoft.AspNetCore.Mvc;
using FinanceApp.API.Data;
using FinanceApp.API.Models;

namespace FinanceApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReportsController : ControllerBase
    {
        private readonly JsonDataStore _dataStore;

        public ReportsController(JsonDataStore dataStore)
        {
            _dataStore = dataStore;
        }

        [HttpGet("monthly")]
        public async Task<IActionResult> GetMonthlyReport([FromQuery] int year, [FromQuery] int month)
        {
            // CORREGIT: GetDataAsync() en lloc de GetFinanceDataAsync()
            var data = await _dataStore.GetDataAsync();

            var transactions = data.Transactions
                .Where(t => t.Date.Year == year && t.Date.Month == month)
                .ToList();

            var income = transactions.Where(t => t.Type == "income").Sum(t => t.Amount);
            var expenses = transactions.Where(t => t.Type == "expense").Sum(t => t.Amount);

            return Ok(new
            {
                Year = year,
                Month = month,
                TotalIncome = income,
                TotalExpenses = expenses,
                Balance = income - expenses,
                TransactionCount = transactions.Count
            });
        }

        [HttpGet("annual")]
        public async Task<IActionResult> GetAnnualReport([FromQuery] int year)
        {
            // CORREGIT: GetDataAsync() en lloc de GetFinanceDataAsync()
            var data = await _dataStore.GetDataAsync();

            var transactions = data.Transactions
                .Where(t => t.Date.Year == year)
                .ToList();

            var monthlyData = Enumerable.Range(1, 12)
                .Select(m => new
                {
                    Month = m,
                    Income = transactions
                        .Where(t => t.Date.Month == m && t.Type == "income")
                        .Sum(t => t.Amount),
                    Expenses = transactions
                        .Where(t => t.Date.Month == m && t.Type == "expense")
                        .Sum(t => t.Amount)
                });

            return Ok(new
            {
                Year = year,
                MonthlyData = monthlyData
            });
        }
    }
}