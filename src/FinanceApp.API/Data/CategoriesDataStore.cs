using FinanceApp.API.Models;
using System.Text.Json;

namespace FinanceApp.API.Data
{
    public class CategoriesDataStore
    {
        private readonly string _filePath = "Data/categories.json";
        
        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        };

        public async Task<List<Category>> GetAllAsync()
        {
            if (!File.Exists(_filePath))
            {
                var defaults = GetDefaultCategories();
                await SaveAllAsync(defaults);
                return defaults;
            }

            var json = await File.ReadAllTextAsync(_filePath);
            var wrapper = JsonSerializer.Deserialize<CategoryWrapper>(json, _jsonOptions);
            return wrapper?.Categories ?? new List<Category>();
        }

        public async Task<Category?> GetByIdAsync(int id)
        {
            var categories = await GetAllAsync();
            return categories.FirstOrDefault(c => c.Id == id && c.IsActive);
        }

        public async Task<Category> CreateAsync(Category category)
        {
            var categories = await GetAllAsync();
            
            category.Id = categories.Any() ? categories.Max(c => c.Id) + 1 : 1;
            category.CreatedAt = DateTime.UtcNow;
            category.IsActive = true;
            
            if (string.IsNullOrEmpty(category.Color))
                category.Color = "#6b7280";

            categories.Add(category);
            await SaveAllAsync(categories);
            
            return category;
        }

        public async Task UpdateAsync(Category updated)
        {
            var categories = await GetAllAsync();
            var existing = categories.FirstOrDefault(c => c.Id == updated.Id);
            
            if (existing != null)
            {
                existing.Name = updated.Name;
                existing.Type = updated.Type;
                existing.Color = updated.Color;
                existing.Icon = updated.Icon;
                await SaveAllAsync(categories);
            }
        }

        public async Task DeleteAsync(int id)
        {
            var categories = await GetAllAsync();
            var category = categories.FirstOrDefault(c => c.Id == id);
            
            if (category != null)
            {
                category.IsActive = false;
                await SaveAllAsync(categories);
            }
        }

        private async Task SaveAllAsync(List<Category> categories)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(_filePath)!);
            var wrapper = new CategoryWrapper { Categories = categories };
            var json = JsonSerializer.Serialize(wrapper, _jsonOptions);
            await File.WriteAllTextAsync(_filePath, json);
        }

        private List<Category> GetDefaultCategories()
        {
            return new List<Category>
            {
                new() { Id = 1, Name = "Nòmina", Type = "income", Color = "#10b981", Icon = "💰" },
                new() { Id = 2, Name = "Freelance", Type = "income", Color = "#34d399", Icon = "💻" },
                new() { Id = 3, Name = "Compres", Type = "expense", Color = "#f59e0b", Icon = "🛒" },
                new() { Id = 4, Name = "Transport", Type = "expense", Color = "#3b82f6", Icon = "🚗" },
                new() { Id = 5, Name = "Menjar", Type = "expense", Color = "#ef4444", Icon = "🍔" },
                new() { Id = 6, Name = "Serveis", Type = "expense", Color = "#8b5cf6", Icon = "💡" },
                new() { Id = 7, Name = "Oci", Type = "expense", Color = "#ec4899", Icon = "🎮" },
                new() { Id = 8, Name = "Salut", Type = "expense", Color = "#14b8a6", Icon = "⚕️" },
            };
        }
    }

    public class CategoryWrapper
    {
        public List<Category> Categories { get; set; } = new();
    }
}
