// Controllers/EventsController.cs
using Microsoft.AspNetCore.Mvc;
using FinanceApp.API.Models;      // ← ✅ El teu namespace
using FinanceApp.API.Services;    // ← ✅ El teu namespace de serveis

namespace FinanceApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EventsController : ControllerBase
    {
        private readonly EventService _eventService;

        public EventsController(EventService eventService)
        {
            _eventService = eventService;
        }

        // GET: api/events
        [HttpGet]
        public ActionResult<List<Event>> GetEvents([FromQuery] int? year, [FromQuery] int? month)
        {
            try
            {
                if (year.HasValue && month.HasValue)
                {
                    return _eventService.GetByMonth(year.Value, month.Value);
                }
                return _eventService.GetAll();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // GET: api/events/upcoming
        [HttpGet("upcoming")]
        public ActionResult<List<Event>> GetUpcomingEvents([FromQuery] int days = 7)
        {
            try
            {
                return _eventService.GetUpcomingEvents(days);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // GET: api/events/5
        [HttpGet("{id}")]
        public ActionResult<Event> GetEvent(int id)  // ← ✅ int, no string
        {
            var evt = _eventService.GetById(id);
            if (evt == null) return NotFound();
            return evt;
        }

        // POST: api/events
        [HttpPost]
        public ActionResult<Event> CreateEvent(Event evt)
        {
            try
            {
                var created = _eventService.Create(evt);
                return CreatedAtAction(nameof(GetEvent), new { id = created.Id }, created);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // PUT: api/events/5
        [HttpPut("{id}")]
        public IActionResult UpdateEvent(int id, Event evt)  // ← ✅ int, no string
        {
            if (id != evt.Id) return BadRequest();

            var updated = _eventService.Update(id, evt);
            if (updated == null) return NotFound();
            return NoContent();
        }

        // DELETE: api/events/5
        [HttpDelete("{id}")]
        public IActionResult DeleteEvent(int id)  // ← ✅ int, no string
        {
            if (!_eventService.Delete(id)) return NotFound();
            return NoContent();
        }
    }
}