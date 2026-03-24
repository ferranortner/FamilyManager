// Services/EventService.cs
using System.Text.Json;
using FinanceApp.API.Models;  // ← ✅ CORREGIT: el teu namespace real

namespace FinanceApp.API.Services
{
    public class EventService
    {
        private readonly string _filePath;
        private readonly object _lock = new object();

        public EventService(IWebHostEnvironment env)
        {
            // Ruta al fitxer JSON
            _filePath = Path.Combine(env.ContentRootPath, "data", "events.json");

            // Crear fitxer i carpeta si no existeixen
            if (!File.Exists(_filePath))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(_filePath)!);
                SaveEvents(new EventData { Events = new List<Event>() });
            }
        }

        private EventData LoadEvents()
        {
            lock (_lock)
            {
                if (!File.Exists(_filePath))
                    return new EventData { Events = new List<Event>() };

                var json = File.ReadAllText(_filePath);
                return JsonSerializer.Deserialize<EventData>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }) ?? new EventData { Events = new List<Event>() };
            }
        }

        private void SaveEvents(EventData data)
        {
            lock (_lock)
            {
                var options = new JsonSerializerOptions
                {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };
                var json = JsonSerializer.Serialize(data, options);
                File.WriteAllText(_filePath, json);
            }
        }

        // ========== MÈTODES PÚBLICS ==========

        public List<Event> GetAll()
        {
            return LoadEvents().Events;
        }

        // ✅ CORREGIT: int id (no string)
        public Event? GetById(int id)
        {
            return LoadEvents().Events.FirstOrDefault(e => e.Id == id);
        }

        public Event Create(Event evt)
        {
            var data = LoadEvents();

            // Generar ID autoincremental si és 0
            if (evt.Id == 0)
            {
                evt.Id = data.Events.Any() ? data.Events.Max(e => e.Id) + 1 : 1;
            }

            evt.CreatedAt = DateTime.UtcNow;
            data.Events.Add(evt);
            SaveEvents(data);

            return evt;
        }

        // ✅ CORREGIT: int id (no string)
        public Event? Update(int id, Event updatedEvent)
        {
            var data = LoadEvents();
            var index = data.Events.FindIndex(e => e.Id == id);

            if (index == -1) return null;

            // Mantenir createdAt original i actualitzar updatedAt
            updatedEvent.Id = id;
            updatedEvent.CreatedAt = data.Events[index].CreatedAt;
            updatedEvent.UpdatedAt = DateTime.UtcNow;

            data.Events[index] = updatedEvent;
            SaveEvents(data);

            return updatedEvent;
        }

        // ✅ CORREGIT: int id (no string)
        public bool Delete(int id)
        {
            var data = LoadEvents();
            var originalCount = data.Events.Count;

            data.Events.RemoveAll(e => e.Id == id);

            if (data.Events.Count < originalCount)
            {
                SaveEvents(data);
                return true;
            }
            return false;
        }

        public List<Event> GetByMonth(int year, int month)
        {
            return LoadEvents().Events
                .Where(e =>
                {
                    if (!DateTime.TryParseExact(e.Date, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out var eventDate))
                        return false;

                    // ✅ Si és recurrent, només mirem el mes (independentment de l'any)
                    if (e.IsRecurring)
                    {
                        return eventDate.Month == month;
                    }

                    // Si no és recurrent, any i mes exactes
                    return eventDate.Year == year && eventDate.Month == month;
                })
                .ToList();
        }

        public List<Event> GetUpcomingEvents(int days = 7)
        {
            var events = LoadEvents().Events;
            var today = DateOnly.FromDateTime(DateTime.Today);
            var futureDate = today.AddDays(days);

            return events.Where(e =>
            {
                if (!DateTime.TryParseExact(e.Date, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out var eventDate))
                    return false;

                var eventDateOnly = DateOnly.FromDateTime(eventDate);

                if (e.IsRecurring)
                {
                    var thisYear = new DateOnly(today.Year, eventDateOnly.Month, eventDateOnly.Day);
                    var nextYear = new DateOnly(today.Year + 1, eventDateOnly.Month, eventDateOnly.Day);

                    return (thisYear >= today && thisYear <= futureDate) ||
                           (nextYear >= today && nextYear <= futureDate);
                }

                return eventDateOnly >= today && eventDateOnly <= futureDate;
            })
            .OrderBy(e =>
            {
                if (!DateTime.TryParseExact(e.Date, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out var eventDate))
                    return DateOnly.MaxValue;

                var eventDateOnly = DateOnly.FromDateTime(eventDate);

                if (e.IsRecurring)
                {
                    var thisYear = new DateOnly(today.Year, eventDateOnly.Month, eventDateOnly.Day);
                    return thisYear < today ?
                        new DateOnly(today.Year + 1, eventDateOnly.Month, eventDateOnly.Day) :
                        thisYear;
                }
                return eventDateOnly;
            })
            .ToList();
        }
    }

    // Wrapper per a la serialització JSON
    public class EventData
    {
        public List<Event> Events { get; set; } = new List<Event>();
    }
}