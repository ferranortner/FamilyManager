namespace FinanceApp.API.Models
{
    public class Category
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = "expense"; // "income" o "expense"
        public string? Color { get; set; } = "#6b7280"; // Color per identificar visualment
        public string? Icon { get; set; } // Emoji o nom d'icona
        public string? ImageFile { get; set; } // Nom del fitxer dins DataStorage/category-images (null = sense imatge)
        public string? Group { get; set; } // Grup per agrupar categories (p. ex. "Casa", "Vehicles")
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}