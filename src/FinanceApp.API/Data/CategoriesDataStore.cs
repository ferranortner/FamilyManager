using FinanceApp.API.Models;
using System.Text.Json;

namespace FinanceApp.API.Data
{
    public class CategoriesDataStore
    {
        // Ruta absoluta basada en ContentRootPath (abans era relativa al directori de treball)
        private readonly string _filePath;
        private readonly SemaphoreSlim _semaphore = new(1, 1);

        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        };

        private readonly string _imagesDir;

        public const int MaxImageBytes = 2 * 1024 * 1024;

        private static readonly Dictionary<string, string> _imageExtensions = new()
        {
            ["image/png"] = ".png",
            ["image/jpeg"] = ".jpg",
            ["image/gif"] = ".gif",
            ["image/webp"] = ".webp",
        };

        public CategoriesDataStore(Microsoft.AspNetCore.Hosting.IWebHostEnvironment env)
        {
            _filePath = Path.Combine(env.ContentRootPath, "Data", "categories.json");
            _imagesDir = Path.Combine(env.ContentRootPath, "DataStorage", "category-images");
        }

        public static string? ExtensionFromMime(string mime) =>
            _imageExtensions.TryGetValue(mime, out var ext) ? ext : null;

        public static string? MimeFromExtension(string extension) =>
            _imageExtensions.FirstOrDefault(kv => kv.Value == extension).Key;

        public async Task<List<Category>> GetAllAsync()
        {
            await _semaphore.WaitAsync();
            try
            {
                return await ReadAllUnlockedAsync();
            }
            finally
            {
                _semaphore.Release();
            }
        }

        public async Task<Category?> GetByIdAsync(int id)
        {
            var categories = await GetAllAsync();
            return categories.FirstOrDefault(c => c.Id == id && c.IsActive);
        }

        public async Task<Category> CreateAsync(Category category)
        {
            await _semaphore.WaitAsync();
            try
            {
                var categories = await ReadAllUnlockedAsync();

                category.Id = categories.Any() ? categories.Max(c => c.Id) + 1 : 1;
                category.CreatedAt = DateTime.UtcNow;
                category.IsActive = true;

                if (string.IsNullOrEmpty(category.Color))
                    category.Color = "#6b7280";

                categories.Add(category);
                await SaveAllUnlockedAsync(categories);
                return category;
            }
            finally
            {
                _semaphore.Release();
            }
        }

        public async Task UpdateAsync(Category updated)
        {
            await _semaphore.WaitAsync();
            try
            {
                var categories = await ReadAllUnlockedAsync();
                var existing = categories.FirstOrDefault(c => c.Id == updated.Id);

                if (existing != null)
                {
                    existing.Name = updated.Name;
                    existing.Type = updated.Type;
                    existing.Color = updated.Color;
                    existing.Icon = updated.Icon;
                    existing.Group = updated.Group;
                    // ImageFile no es modifica aquí: només des dels endpoints d'imatge
                    await SaveAllUnlockedAsync(categories);
                }
            }
            finally
            {
                _semaphore.Release();
            }
        }

        public async Task DeleteAsync(int id)
        {
            await _semaphore.WaitAsync();
            try
            {
                var categories = await ReadAllUnlockedAsync();
                var category = categories.FirstOrDefault(c => c.Id == id);

                if (category != null)
                {
                    category.IsActive = false;
                    await SaveAllUnlockedAsync(categories);
                }
            }
            finally
            {
                _semaphore.Release();
            }
        }

        // ===== IMATGES DE CATEGORIA (carpeta DataStorage/category-images) =====

        public async Task SaveImageAsync(int id, byte[] bytes, string extension)
        {
            await _semaphore.WaitAsync();
            try
            {
                var categories = await ReadAllUnlockedAsync();
                var category = categories.FirstOrDefault(c => c.Id == id && c.IsActive)
                    ?? throw new KeyNotFoundException($"Categoria {id} no trobada");

                Directory.CreateDirectory(_imagesDir);
                DeleteImageFilesUnlocked(id);

                var fileName = $"{id}{extension}";
                await File.WriteAllBytesAsync(Path.Combine(_imagesDir, fileName), bytes);

                category.ImageFile = fileName;
                await SaveAllUnlockedAsync(categories);
            }
            finally
            {
                _semaphore.Release();
            }
        }

        public async Task<(byte[] Bytes, string Mime)?> ReadImageAsync(int id)
        {
            var category = await GetByIdAsync(id);
            if (category?.ImageFile == null)
                return null;

            var path = Path.Combine(_imagesDir, category.ImageFile);
            if (!File.Exists(path))
                return null;

            var mime = MimeFromExtension(Path.GetExtension(path).ToLowerInvariant()) ?? "application/octet-stream";
            return (await File.ReadAllBytesAsync(path), mime);
        }

        public async Task DeleteImageAsync(int id)
        {
            await _semaphore.WaitAsync();
            try
            {
                var categories = await ReadAllUnlockedAsync();
                var category = categories.FirstOrDefault(c => c.Id == id);
                if (category == null)
                    return;

                DeleteImageFilesUnlocked(id);
                category.ImageFile = null;
                await SaveAllUnlockedAsync(categories);
            }
            finally
            {
                _semaphore.Release();
            }
        }

        private void DeleteImageFilesUnlocked(int id)
        {
            if (!Directory.Exists(_imagesDir))
                return;

            foreach (var file in Directory.GetFiles(_imagesDir, $"{id}.*"))
                File.Delete(file);
        }

        // Cal tenir el semàfor abans de cridar aquests mètodes
        private async Task<List<Category>> ReadAllUnlockedAsync()
        {
            if (!File.Exists(_filePath))
            {
                var defaults = GetDefaultCategories();
                await SaveAllUnlockedAsync(defaults);
                return defaults;
            }

            var json = await File.ReadAllTextAsync(_filePath);
            var wrapper = JsonSerializer.Deserialize<CategoryWrapper>(json, _jsonOptions);
            return wrapper?.Categories ?? new List<Category>();
        }

        private async Task SaveAllUnlockedAsync(List<Category> categories)
        {
            var wrapper = new CategoryWrapper { Categories = categories };
            var json = JsonSerializer.Serialize(wrapper, _jsonOptions);
            await SafeJsonFile.WriteAtomicAsync(_filePath, json);
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
