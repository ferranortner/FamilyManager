// components/eventManager.js
// Gestor d'esdeveniments: cites mèdiques, aniversaris, recordatoris
// Estil consistent amb TransactionManager, sense categories

import { eventService } from '../services/eventService.js'

export class EventManager {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId)

    if (!this.container) {
      throw new Error(`No s'ha trobat el contenidor amb id="${containerId}"`)
    }

    this.events = []
    this.filteredEvents = []

    // Configuració
    this.sortField = options.sortField || 'date'
    this.sortDirection = options.sortDirection || 'asc'
    this.selectedType = options.selectedType || 'all'

    // Tipus d'esdeveniments amb colors i icones
    this.eventTypes = [
      { id: 'medical', label: '🏥 Cita mèdica', color: '#3b82f6', bg: '#dbeafe' },
      { id: 'birthday', label: '🎂 Aniversari', color: '#ec4899', bg: '#fce7f3', supportsRecurring: true },
      { id: 'reminder', label: '🔔 Recordatori', color: '#f59e0b', bg: '#fef3c7', supportsRecurring: true },
      { id: 'other', label: '📌 Altres', color: '#6b7280', bg: '#f3f4f6' },
    ]
  }

  // ========== RENDER PRINCIPAL ==========

  async render() {
    this.container.innerHTML = '<p class="loading">Carregant esdeveniments...</p>'

    try {
      this.events = await eventService.getAll()
    } catch (err) {
      console.error('Error carregant esdeveniments:', err)
      this.events = []
    }

    this.container.innerHTML = this._generateHTML()
    this._attachEventListeners()
    this._applyFilters()
  }

  _generateHTML() {
    const typeOptions = this.eventTypes.map(t => `<option value="${t.id}">${t.label}</option>`).join('')

    return `
      <div class="events-page">
        <!-- Capçalera compacta (mateix estil que transaccions) -->
        <div class="page-header-compact">
          <h1>📅 Esdeveniments</h1>
          <div class="header-controls">
            
            <!-- Filtre per tipus -->
            <div class="control-group">
              <label for="event-type-filter">Tipus</label>
              <select id="event-type-filter">
                <option value="all">Tots</option>
                ${typeOptions}
              </select>
            </div>

            <!-- Ordenació -->
            <div class="control-group">
              <label for="sort-field">Ordenar</label>
              <div class="sort-wrapper">
                <select id="sort-field">
                  <option value="date" selected>Data</option>
                  <option value="title">Títol</option>
                </select>
                <button id="sort-direction" class="btn-sort" title="Canviar direcció">
                  <span id="sort-icon">↑</span>
                </button>
              </div>
            </div>

            <button class="btn btn-primary" id="add-event-btn">+ Nou</button>
          </div>
        </div>

        <!-- Resum -->
        <div class="events-summary" id="events-summary"></div>

        <!-- Llista d'esdeveniments -->
        <div id="events-list" class="events-list-full">
          <p class="loading">Carregant...</p>
        </div>
      </div>
    `
  }

  // ========== EVENT LISTENERS ==========

  _attachEventListeners() {
    // Botó nou esdeveniment
    document.getElementById('add-event-btn')?.addEventListener('click', () => this.openModal())

    // Filtre per tipus
    document.getElementById('event-type-filter')?.addEventListener('change', e => {
      this.selectedType = e.target.value
      this._applyFilters()
    })

    // Ordenació per camp
    document.getElementById('sort-field')?.addEventListener('change', e => {
      this.sortField = e.target.value
      this._renderSortedEvents()
    })

    // Direcció d'ordenació
    document.getElementById('sort-direction')?.addEventListener('click', () => {
      this.sortDirection = this.sortDirection === 'desc' ? 'asc' : 'desc'
      document.getElementById('sort-icon').textContent = this.sortDirection === 'desc' ? '↓' : '↑'
      this._renderSortedEvents()
    })
  }

  // ========== FILTRES I ORDENACIÓ ==========

  _applyFilters() {
    let filtered = [...this.events]

    // Filtre per tipus
    if (this.selectedType !== 'all') {
      filtered = filtered.filter(e => e.type === this.selectedType)
    }

    this.filteredEvents = filtered
    this._updateSummary()
    this._renderSortedEvents()
  }

  _updateSummary() {
    const summaryEl = document.getElementById('events-summary')
    if (!summaryEl) return

    const count = this.filteredEvents.length
    const recurringCount = this.filteredEvents.filter(e => e.isRecurring).length

    summaryEl.innerHTML = `
      <span class="summary-pill total">
        ${count} esdeveniment${count !== 1 ? 's' : ''}
        ${recurringCount > 0 ? ` • ${recurringCount} recursiu${recurringCount !== 1 ? 's' : ''}` : ''}
      </span>
    `
    summaryEl.style.display = 'block'
  }

  _sortEvents() {
    const sorted = [...this.filteredEvents]

    sorted.sort((a, b) => {
      let comparison = 0

      if (this.sortField === 'date') {
        // Per recursius: ordenar per pròxima ocurrència
        if (a.isRecurring || b.isRecurring) {
          const getNextOccurrence = e => {
            const today = new Date()
            const eventDate = new Date(e.date)
            const thisYear = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate())
            return thisYear < today ? new Date(today.getFullYear() + 1, eventDate.getMonth(), eventDate.getDate()) : thisYear
          }
          comparison = (a.isRecurring ? getNextOccurrence(a) : new Date(a.date)) - (b.isRecurring ? getNextOccurrence(b) : new Date(b.date))
        } else {
          comparison = new Date(a.date) - new Date(b.date)
        }
      } else if (this.sortField === 'title') {
        comparison = (a.title || '').localeCompare(b.title || '', 'ca-ES')
      }

      return this.sortDirection === 'desc' ? -comparison : comparison
    })

    return sorted
  }

  _renderSortedEvents() {
    const listContainer = document.getElementById('events-list')
    const sortedEvents = this._sortEvents()

    if (sortedEvents.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state-full">
          <div class="empty-icon">📅</div>
          <p>Cap esdeveniment amb aquest filtre</p>
          <button class="btn btn-secondary" onclick="
            document.getElementById('event-type-filter').value='all';
            document.getElementById('event-type-filter').dispatchEvent(new Event('change'));
          ">
            Mostrar tots
          </button>
        </div>
      `
      return
    }

    listContainer.innerHTML = sortedEvents.map(e => this._renderEventItem(e)).join('')

    // Event listeners per editar/eliminar
    listContainer.querySelectorAll('.event-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('.btn-delete') || e.target.closest('.btn-edit')) return
        this._openEditModal(item.dataset.id)
      })
    })

    listContainer.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        this._openEditModal(btn.dataset.id)
      })
    })

    listContainer.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        this._deleteEvent(btn.dataset.id)
      })
    })
  }

  // ========== RENDERITZACIÓ D'ITEMS ==========

  _renderEventItem(e) {
    const eventType = this.eventTypes.find(t => t.id === e.type) || this.eventTypes[3]

    const date = new Date(e.date)
    const dateStr = date.toLocaleDateString('ca-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    const isToday = this._isToday(e)
    const isPast = this._isPast(e)

    return `
      <div class="event-item ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}" data-id="${e.id}">
        <div class="ev-main">
          <!-- Icona del tipus -->
          <div class="ev-icon" style="background: ${eventType.bg}; color: ${eventType.color}">
            ${eventType.label.split(' ')[0]}
          </div>
          
          <div class="ev-content">
            <div class="ev-top">
              <span class="ev-title">${e.title || 'Sense títol'}</span>
              ${e.isRecurring ? '<span class="ev-badge recurring" title="Es repeteix cada any">🔄 Anual</span>' : ''}
              ${isToday ? '<span class="ev-badge today">Avui</span>' : ''}
            </div>
            
            <div class="ev-bottom">
              <span class="ev-date ${!isPast && !isToday ? 'upcoming' : ''}">${dateStr}</span>
              ${e.notes ? `<span class="ev-notes">📝 ${e.notes}</span>` : ''}
            </div>
          </div>
        </div>
        
        <div class="ev-actions">
          <button class="btn-icon btn-edit" data-id="${e.id}" title="Editar">✏️</button>
          <button class="btn-icon btn-delete" data-id="${e.id}" title="Eliminar">🗑️</button>
        </div>
      </div>
    `
  }

  // ========== HELPERS DE DATES ==========

  _isToday(event) {
    const today = new Date()
    const eventDate = new Date(event.date)

    if (event.isRecurring) {
      return eventDate.getDate() === today.getDate() && eventDate.getMonth() === today.getMonth()
    }
    return eventDate.toDateString() === today.toDateString()
  }

  _isPast(event) {
    if (event.isRecurring) return false // Els recursius mai són "passats"
    return new Date(event.date) < new Date()
  }

  // ========== MODAL: CREAR / EDITAR ==========

  openModal() {
    this._openEventModal(null)
  }

  _openEditModal(eventId) {
    const event = this.events.find(e => e.id == eventId || e.id === eventId)
    if (!event) {
      alert('Esdeveniment no trobat')
      return
    }
    this._openEventModal(event)
  }

  _openEventModal(event = null) {
    const isEdit = event !== null
    const title = isEdit ? 'Editar Esdeveniment' : 'Nou Esdeveniment'

    const typeOptions = this.eventTypes
      .map(t => {
        const selected = isEdit && t.id === event.type ? 'selected' : ''
        const disabled = !t.supportsRecurring && isEdit && event.isRecurring ? 'disabled' : ''
        return `<option value="${t.id}" ${selected} ${disabled}>${t.label}</option>`
      })
      .join('')

    const dateStr = isEdit ? new Date(event.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]

    const modal = document.createElement('div')
    modal.className = 'modal-overlay'
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <form id="event-form">
          ${isEdit ? `<input type="hidden" name="id" value="${event.id}">` : ''}
          
          <!-- Títol -->
          <div class="form-group">
            <label>Títol *</label>
            <input type="text" name="title" required 
                   value="${isEdit ? event.title || '' : ''}" 
                   placeholder="Ex: Revisió dental, Aniversari Maria...">
          </div>
          
          <!-- Data i tipus -->
          <div class="form-row">
            <div class="form-group">
              <label>Data *</label>
              <input type="date" name="date" required value="${dateStr}">
            </div>
            <div class="form-group">
              <label>Tipus *</label>
              <select name="type" required id="event-type-select">
                ${typeOptions}
              </select>
            </div>
          </div>
          
          <!-- Checkbox recursiu (només per a tipus compatibles) -->
          <div class="form-group" id="recurring-group" style="${isEdit && event.isRecurring ? '' : 'display:none'}">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" name="isRecurring" id="is-recurring" 
                     ${isEdit && event.isRecurring ? 'checked' : ''}>
              <span>🔄 Es repeteix cada any (aniversaris, revisions...)</span>
            </label>
            <small style="color: var(--text-secondary); margin-top: 4px; display: block;">
              L'esdeveniment apareixerà automàticament cada any a la mateixa data
            </small>
          </div>
          
          <!-- Notes -->
          <div class="form-group">
            <label>Notes</label>
            <input type="text" name="notes" 
                   value="${isEdit ? event.notes || '' : ''}" 
                   placeholder="Detalls addicionals...">
          </div>
          
          <!-- Accions -->
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel·lar</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Actualitzar' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    `

    document.body.appendChild(modal)

    // Mostrar/ocultar checkbox recursiu segons el tipus
    const typeSelect = document.getElementById('event-type-select')
    const recurringGroup = document.getElementById('recurring-group')

    const toggleRecurringOption = () => {
      const selectedType = this.eventTypes.find(t => t.id === typeSelect.value)
      if (selectedType?.supportsRecurring) {
        recurringGroup.style.display = 'block'
      } else {
        recurringGroup.style.display = 'none'
        document.getElementById('is-recurring').checked = false
      }
    }

    typeSelect.addEventListener('change', toggleRecurringOption)
    if (isEdit) toggleRecurringOption()

    // Submit del formulari
    document.getElementById('event-form').addEventListener('submit', async e => {
      e.preventDefault()
      const formData = new FormData(e.target)

      const data = {
        title: formData.get('title')?.trim(),
        type: formData.get('type'),
        date: formData.get('date'),
        isRecurring: formData.get('isRecurring') === 'on',
        notes: formData.get('notes')?.trim() || null,
      }

      if (isEdit) data.id = event.id

      if (!data.title || !data.date || !data.type) {
        alert('Completa els camps obligatoris')
        return
      }

      try {
        if (isEdit) {
          await eventService.update(data.id, data)
        } else {
          await eventService.create(data)
        }
        modal.remove()
        await this._refreshData()
      } catch (err) {
        alert('Error: ' + err.message)
      }
    })
  }

  // ========== REFRESH I DELETE ==========

  async _refreshData() {
    this.events = await eventService.getAll()
    this._applyFilters()
  }

  async _deleteEvent(id) {
    if (!confirm('Segur que vols eliminar aquest esdeveniment?')) return
    try {
      await eventService.delete(id)
      await this._refreshData()
    } catch (err) {
      console.error('Error eliminant esdeveniment:', err)
      alert('Error: ' + err.message)
    }
  }
}
