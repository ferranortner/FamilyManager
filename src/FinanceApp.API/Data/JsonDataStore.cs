using System.Text.Json;
using FinanceApp.API.Models;
using Microsoft.AspNetCore.Hosting;  // ← AFEGIR PER IWebHostEnvironment

namespace FinanceApp.API.Data
{
    public class JsonDataStore
    {
        private readonly string _filePath;
        private readonly SemaphoreSlim _semaphore = new(1, 1);
        private readonly IWebHostEnvironment _env;

        public JsonDataStore(IWebHostEnvironment env)
        {
            _env = env;
            var dataPath = Path.Combine(env.ContentRootPath, "DataStorage");
            Directory.CreateDirectory(dataPath);
            _filePath = Path.Combine(dataPath, "finance-data.json");

            // DEBUG
            Console.WriteLine($"[JsonDataStore] Fitxer: {_filePath}");
        }

        public async Task<FinanceData> GetDataAsync()
        {
            await _semaphore.WaitAsync();
            try
            {
                if (!File.Exists(_filePath))
                {
                    Console.WriteLine("[JsonDataStore] Fitxer no existeix");
                    return new FinanceData();
                }

                var json = await File.ReadAllTextAsync(_filePath);
                //Console.WriteLine($"[JsonDataStore] JSON llegit: {json.Length} caràcters");

                var data = JsonSerializer.Deserialize<FinanceData>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                }) ?? new FinanceData();

                //Console.WriteLine($"[JsonDataStore] Transaccions: {data.Transactions?.Count ?? 0}");

                return data;
            }
            finally
            {
                _semaphore.Release();
            }
        }

        // Contingut tal com està al disc (per a la còpia de seguretat)
        public async Task<string?> GetRawJsonAsync()
        {
            await _semaphore.WaitAsync();
            try
            {
                return File.Exists(_filePath) ? await File.ReadAllTextAsync(_filePath) : null;
            }
            finally
            {
                _semaphore.Release();
            }
        }

        public async Task SaveDataAsync(FinanceData data)
        {
            await _semaphore.WaitAsync();
            try
            {
                var options = new JsonSerializerOptions
                {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };
                var json = JsonSerializer.Serialize(data, options);
                await SafeJsonFile.WriteAtomicAsync(_filePath, json);

                Console.WriteLine($"[JsonDataStore] Guardat: {data.Transactions.Count} transaccions");
            }
            finally
            {
                _semaphore.Release();
            }
        }
    }
}