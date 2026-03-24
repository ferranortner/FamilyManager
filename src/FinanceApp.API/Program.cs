using System.Text.Json;
using System.Text.Json.Serialization;
using FinanceApp.API.Data;
using FinanceApp.API.Services;

var builder = WebApplication.CreateBuilder(args);

// CORS - PERMETRE TOT (desenvolupament)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});


// DataStores
builder.Services.AddSingleton<JsonDataStore>();
builder.Services.AddSingleton<CategoriesDataStore>();  // ← Sense IServiceCollection
builder.Services.AddSingleton<EventService>();

// Controllers - UNA SOLA VEGADA amb TOTA la configuració
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Conversors
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());

        // Configuració de noms (tria UNA opció):

        // Opció A: camelCase (recomanat per APIs JavaScript)
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;

        // Opció B: Sense conversió (PascalCase)
        // options.JsonSerializerOptions.PropertyNamingPolicy = null;

        // Case insensitive per la deserialització
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;

        // JSON formatat (opcional, per debug)
        options.JsonSerializerOptions.WriteIndented = true;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// IMPORTANT: UseCors ABANS de UseAuthorization i MapControllers
app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

var dataPath = app.Configuration["DataPath"] ?? "DataStorage";
Directory.CreateDirectory(dataPath);

app.Run();