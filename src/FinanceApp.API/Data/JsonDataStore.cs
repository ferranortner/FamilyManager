// Data/JsonDataStore.cs
using FinanceApp.API.Models;
using System.Text.Json;

namespace FinanceApp.API.Data
{
    public class JsonDataStore
    {
        private readonly string _filePath;
        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        };

        public JsonDataStore()
        {
            // Usar ruta relativa a l'executable
            _filePath = Path.Combine("DataStorage", "finance-data.json");

            // DEBUG: Mostrar ruta real
            var fullPath = Path.GetFullPath(_filePath);
            Console.WriteLine($"[JsonDataStore] Ruta del fitxer: {fullPath}");

            // Crear directori si no existeix
            var directory = Path.GetDirectoryName(_filePath);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
                Console.WriteLine($"[JsonDataStore] Directori creat/verificat: {directory}");
            }
        }

        public async Task<AppData> GetDataAsync()
        {
            if (!File.Exists(_filePath))
            {
                Console.WriteLine($"[JsonDataStore] Fitxer no existeix, retornant dades buides");
                return new AppData();
            }

            try
            {
                var json = await File.ReadAllTextAsync(_filePath);
                Console.WriteLine($"[JsonDataStore] Fitxer llegit, mida: {json.Length} caràcters");

                var data = JsonSerializer.Deserialize<AppData>(json, _jsonOptions);

                // DEBUG: Mostrar contingut
                Console.WriteLine($"[JsonDataStore] Transaccions trobades: {data?.Transactions?.Count ?? 0}");
                foreach (var t in data?.Transactions ?? new List<Transaction>())
                {
                    Console.WriteLine($"  - ID:{t.Id} {t.Description} {t.Amount}€ ({t.Date:yyyy-MM-dd})");
                }

                return data ?? new AppData();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[JsonDataStore] ERROR llegint fitxer: {ex.Message}");
                return new AppData();
            }
        }

        public async Task SaveDataAsync(AppData data)
        {
            try
            {
                var directory = Path.GetDirectoryName(_filePath);
                if (!string.IsNullOrEmpty(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                var json = JsonSerializer.Serialize(data, _jsonOptions);
                await File.WriteAllTextAsync(_filePath, json);

                Console.WriteLine($"[JsonDataStore] Dades guardades. Transaccions: {data.Transactions.Count}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[JsonDataStore] ERROR guardant: {ex.Message}");
                throw;
            }
        }
    }
}