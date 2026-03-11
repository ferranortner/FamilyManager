// Controllers/CategoriesController.cs
using Microsoft.AspNetCore.Mvc;
using FinanceApp.API.Models;
using FinanceApp.API.Data;

namespace FinanceApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CategoriesController : ControllerBase
    {
        private readonly CategoriesDataStore _dataStore;

        public CategoriesController(CategoriesDataStore dataStore)
        {
            _dataStore = dataStore;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Category>>> GetAll([FromQuery] string? type = null)
        {
            var categories = await _dataStore.GetAllAsync();
            var query = categories.Where(c => c.IsActive);

            if (!string.IsNullOrEmpty(type))
            {
                query = query.Where(c => c.Type == type);
            }

            return Ok(query.OrderBy(c => c.Type).ThenBy(c => c.Name));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Category>> GetById(int id)
        {
            var category = await _dataStore.GetByIdAsync(id);

            if (category == null)
                return NotFound();

            return Ok(category);
        }

        [HttpPost]
        public async Task<ActionResult<Category>> Create([FromBody] Category category)
        {
            // Validació
            if (string.IsNullOrWhiteSpace(category.Name))
            {
                return BadRequest(new { error = "El nom és obligatori" });
            }

            if (string.IsNullOrWhiteSpace(category.Type) ||
                (category.Type != "income" && category.Type != "expense"))
            {
                return BadRequest(new { error = "El tipus ha de ser 'income' o 'expense'" });
            }

            var created = await _dataStore.CreateAsync(category);

            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Category updatedCategory)
        {
            if (id != updatedCategory.Id)
                return BadRequest(new { error = "ID no coincideix" });

            var existing = await _dataStore.GetByIdAsync(id);
            if (existing == null)
                return NotFound();

            await _dataStore.UpdateAsync(updatedCategory);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var existing = await _dataStore.GetByIdAsync(id);
            if (existing == null)
                return NotFound();

            await _dataStore.DeleteAsync(id);
            return NoContent();
        }
    }

}