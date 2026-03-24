// services/eventService.js
// Servei per gestionar esdeveniments (cites, aniversaris, recordatoris)
// Suport: API JSON backend + fallback localStorage per desenvolupament

const STORAGE_KEY = 'app_events'

export class EventService {
  constructor(apiBaseUrl = 'http://localhost:5156/api') {
    // ← CANVIA 5000 pel teu port
    this.baseUrl = `${apiBaseUrl}/events`
    this.useMock = false
  }

  // 🔁 Wrapper per intentar API i fallback a mock si falla
  async _withFallback(apiCall, mockCall) {
    if (this.useMock) return await mockCall()

    try {
      return await apiCall()
    } catch (err) {
      console.warn('⚠️ API no disponible, usant mode mock:', err.message)
      this.useMock = true
      return await mockCall()
    }
  }

  // ========== HELPERS PER A LOCALSTORAGE ==========

  _getMockData() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : { events: [] }
    } catch {
      return { events: [] }
    }
  }

  _saveMockData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (err) {
      console.error('Error guardant a localStorage:', err)
    }
  }

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  }

  // ========== MÈTODES PÚBLICS ==========

  // GET: Tots els esdeveniments
  async getAll() {
    return this._withFallback(
      async () => {
        const res = await fetch(this.baseUrl)
        if (!res.ok) throw new Error('Error carregant esdeveniments')
        return await res.json()
      },
      async () => this._getMockData().events
    )
  }

  // GET: Per ID
  async getById(id) {
    return this._withFallback(
      async () => {
        const res = await fetch(`${this.baseUrl}/${id}`)
        if (!res.ok) throw new Error('Esdeveniment no trobat')
        return await res.json()
      },
      async () => {
        const events = this._getMockData().events
        const event = events.find(e => e.id == id || e.id === id)
        if (!event) throw new Error('Esdeveniment no trobat')
        return event
      }
    )
  }

  // POST: Crear nou esdeveniment
  async create(data) {
    const newEvent = {
      title: data.title?.trim() || '',
      type: data.type || 'other',
      date: data.date,
      isRecurring: !!data.isRecurring,
      notes: data.notes?.trim() || null,
      // ← No enviar 'id', el backend el genera
    }

    return this._withFallback(
      async () => {
        const res = await fetch(this.baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEvent),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Error creant esdeveniment')
        }
        return await res.json()
      },
      async () => {
        const store = this._getMockData()
        store.events.push(newEvent)
        this._saveMockData(store)
        return newEvent
      }
    )
  }

  // PUT: Actualitzar esdeveniment
  async update(id, data) {
    const updatedEvent = {
      id,
      title: data.title?.trim() || '',
      type: data.type || 'other',
      date: data.date,
      isRecurring: !!data.isRecurring,
      notes: data.notes?.trim() || null,
      updatedAt: new Date().toISOString(),
    }

    return this._withFallback(
      async () => {
        const res = await fetch(`${this.baseUrl}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedEvent),
        })
        if (!res.ok) throw new Error('Error actualitzant esdeveniment')
        return await res.json()
      },
      async () => {
        const store = this._getMockData()
        const index = store.events.findIndex(e => e.id == id || e.id === id)
        if (index === -1) throw new Error('Esdeveniment no trobat')

        // Mantenir createdAt original
        updatedEvent.createdAt = store.events[index].createdAt
        store.events[index] = { ...store.events[index], ...updatedEvent }
        this._saveMockData(store)
        return store.events[index]
      }
    )
  }

  // DELETE: Eliminar esdeveniment
  async delete(id) {
    return this._withFallback(
      async () => {
        const res = await fetch(`${this.baseUrl}/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Error eliminant esdeveniment')
        return true
      },
      async () => {
        const store = this._getMockData()
        const originalLength = store.events.length
        store.events = store.events.filter(e => e.id != id && e.id !== id)

        if (store.events.length < originalLength) {
          this._saveMockData(store)
          return true
        }
        throw new Error('Esdeveniment no trobat')
      }
    )
  }

  // GET: Filtrar per mes (per al calendari del dashboard)
  async getByMonth(year, month) {
    return this._withFallback(
      async () => {
        const res = await fetch(`${this.baseUrl}?year=${year}&month=${month}`)
        if (!res.ok) throw new Error('Error carregant esdeveniments del mes')
        return await res.json()
      },
      async () => {
        const events = await this.getAll()
        return events.filter(e => {
          const date = new Date(e.date)
          return date.getFullYear() === year && date.getMonth() + 1 === month
        })
      }
    )
  }

  // GET: Esdeveniments propers (per al widget del dashboard)
  async getUpcomingEvents(days = 7) {
    try {
      // Intentar cridar l'endpoint del backend
      const res = await fetch(`${this.baseUrl}/upcoming?days=${days}`)

      // Si és 404, fer fallback a filtrat client-side
      if (res.status === 404) {
        console.warn('⚠️ Endpoint /upcoming no disponible, usant fallback client-side')
        return await this._filterUpcomingClientSide(days)
      }

      if (!res.ok) throw new Error('Error carregant esdeveniments propers')
      return await res.json()
    } catch (err) {
      // Qualsevol altre error → fallback client-side
      console.warn('⚠️ Error amb API, usant fallback:', err.message)
      return await this._filterUpcomingClientSide(days)
    }
  }

  // 🔁 Mètode privat: filtrar esdeveniments propers al client (fallback)
  async _filterUpcomingClientSide(days = 7) {
    const allEvents = await this.getAll()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)

    return allEvents
      .filter(e => {
        const eventDate = new Date(e.date)

        if (e.isRecurring) {
          // Per recursius: comparar dia i mes d'aquest any i any vinent
          const thisYear = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate())
          const nextYear = new Date(today.getFullYear() + 1, eventDate.getMonth(), eventDate.getDate())

          return (thisYear >= today && thisYear <= futureDate) || (nextYear >= today && nextYear <= futureDate)
        }

        return eventDate >= today && eventDate <= futureDate
      })
      .sort((a, b) => {
        // Ordenar per proximitat (tenint en compte recurrència)
        const getDateForComparison = e => {
          if (e.isRecurring) {
            const today = new Date()
            const eventDate = new Date(e.date)
            const thisYearDate = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate())
            return thisYearDate < today ? new Date(today.getFullYear() + 1, eventDate.getMonth(), eventDate.getDate()) : thisYearDate
          }
          return new Date(e.date)
        }
        return getDateForComparison(a) - getDateForComparison(b)
      })
  }

  // 🔁 Helper: verificar si un esdeveniment és "avui" (suport recursiu)
  isToday(event) {
    const today = new Date()
    const eventDate = new Date(event.date)

    if (event.isRecurring) {
      return eventDate.getDate() === today.getDate() && eventDate.getMonth() === today.getMonth()
    }
    return eventDate.toDateString() === today.toDateString()
  }
}

// Instància singleton per a importació fàcil
export const eventService = new EventService()
