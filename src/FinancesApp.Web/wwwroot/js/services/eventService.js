// services/eventService.js
// Esdeveniments (cites, aniversaris, recordatoris).
// Només API: no hi ha fallback a localStorage, perquè així cada canvi queda al JSON del backend.

import { apiService } from './apiService.js'

function toPayload(data) {
  return {
    title: data.title?.trim() || '',
    type: data.type || 'other',
    date: data.date,
    isRecurring: !!data.isRecurring,
    notes: data.notes?.trim() || null,
  }
}

export class EventService {
  getAll() {
    return apiService.request('/events')
  }

  getById(id) {
    return apiService.request(`/events/${id}`)
  }

  create(data) {
    return apiService.request('/events', { method: 'POST', body: toPayload(data) })
  }

  update(id, data) {
    // El backend exigeix que l'id del cos coincideixi amb el de la URL
    return apiService.request(`/events/${id}`, {
      method: 'PUT',
      body: { id: Number(id), ...toPayload(data) },
    })
  }

  async delete(id) {
    await apiService.request(`/events/${id}`, { method: 'DELETE' })
    return true
  }

  getByMonth(year, month) {
    return apiService.request(`/events?year=${year}&month=${month}`)
  }

  getUpcomingEvents(days = 7) {
    return apiService.request(`/events/upcoming?days=${days}`)
  }

  // Helper: un esdeveniment és avui (suporta recurrents anuals)
  isToday(event) {
    const today = new Date()
    const eventDate = new Date(event.date)

    if (event.isRecurring) {
      return eventDate.getDate() === today.getDate() && eventDate.getMonth() === today.getMonth()
    }
    return eventDate.toDateString() === today.toDateString()
  }
}

export const eventService = new EventService()
