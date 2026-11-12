// Controllers/CategoriesController.cs
using Microsoft.AspNetCore.Mvc;
using FinanceApp.API.Models;
using FinanceApp.API.Data;

namespace FinanceApp.API.Controllers
{
    public class ImageUploadRequest
    {
        public string? DataUrl { get; set; }
    }

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

        // POST: api/categories/5/image  → cos: { "dataUrl": "data:image/png;base64,..." }
        [HttpPost("{id}/image")]
        public async Task<IActionResult> UploadImage(int id, [FromBody] ImageUploadRequest request)
        {
            var match = System.Text.RegularExpressions.Regex.Match(
                request.DataUrl ?? string.Empty,
                "^data:(image/[a-z+]+);base64,(.+)$",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Singleline);

            if (!match.Success)
                return BadRequest(new { error = "Format d'imatge no vàlid" });

            var extension = CategoriesDataStore.ExtensionFromMime(match.Groups[1].Value.ToLowerInvariant());
            if (extension == null)
                return BadRequest(new { error = "Només s'admeten imatges PNG, JPG, GIF o WEBP" });

            byte[] bytes;
            try
            {
                bytes = Convert.FromBase64String(match.Groups[2].Value.Trim());
            }
            catch (FormatException)
            {
                return BadRequest(new { error = "La imatge està corrupta" });
            }

            if (bytes.Length > CategoriesDataStore.MaxImageBytes)
                return BadRequest(new { error = "La imatge supera els 2 MB" });

            try
            {
                await _dataStore.SaveImageAsync(id, bytes, extension);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }

            return NoContent();
        }

        // GET: api/categories/5/image
        [HttpGet("{id}/image")]
        public async Task<IActionResult> GetImage(int id)
        {
            var image = await _dataStore.ReadImageAsync(id);
            if (image == null)
                return NotFound();

            return File(image.Value.Bytes, image.Value.Mime);
        }

        // DELETE: api/categories/5/image
        [HttpDelete("{id}/image")]
        public async Task<IActionResult> DeleteImage(int id)
        {
            var existing = await _dataStore.GetByIdAsync(id);
            if (existing == null)
                return NotFound();

            await _dataStore.DeleteImageAsync(id);
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