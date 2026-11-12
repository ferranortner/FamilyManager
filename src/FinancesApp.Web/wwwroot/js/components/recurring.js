// components/recurring.js
// Regles de transaccions recurrents mensuals i generació de les transaccions.
import { categoryService } from '../services/categoryService.js'
import { apiService } from '../services/apiService.js'
import { categoryOptionsHtml, escapeHtml } from '../utils/categoryOptions.js'

export class RecurringView {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    this.categories = []
    this.rules = []
  }

  async render() {
    const defaultUntil = new Date()
    defaultUntil.setFullYear(defaultUntil.getFullYear() + 1)

    this.container.innerHTML = `
      <div class="recurring-page">
        <div class="card recurring-card">
          <h3 class="card-title">Nova regla recurrent</h3>
          <form id="recurring-form" class="recurring-form">
            <label>Descripció <input type="text" id="rec-desc" class="form-control" required placeholder="Ex: Lloguer, Netflix"></label>
            <label>Import (€) <input type="number" id="rec-amount" class="form-control" min="0.01" step="0.01" required></label>
            <label>Tipus
              <select id="rec-type" class="form-control">
                <option value="expense">Despesa</option>
                <option value="income">Ingrés</option>
              </select>
            </label>
            <label>Categoria <select id="rec-category" class="form-control" required></select></label>
            <label>Dia del mes <input type="number" id="rec-day" class="form-control" min="1" max="28" value="1" required></label>
            <label>Percentatge comptabilitzat <input type="number" id="rec-pct" class="form-control" min="1" max="100" value="100" required></label>
            <label>Inici <input type="date" id="rec-start" class="form-control" required value="${this.today()}"></label>
            <label>Fi (opcional) <input type="date" id="rec-end" class="form-control"></label>
            <div class="recurring-form-actions">
              <button type="submit" class="btn-app btn-app-primary">Crear regla</button>
            </div>
          </form>
        </div>

        <div class="card recurring-card">
          <div class="recurring-generate">
            <h3 class="card-title">Generar transaccions</h3>
            <p class="hint">Crea les transaccions de cada regla activa fins a la data indicada. No duplica mesos ja generats.</p>
            <div class="recurring-generate-row">
              <label>Fins a <input type="date" id="rec-until" class="form-control" value="${defaultUntil.toISOString().slice(0, 10)}"></label>
              <button type="button" id="rec-generate" class="btn-app btn-app-primary">Generar</button>
            </div>
            <div id="rec-generate-result" class="hint"></div>
          </div>
        </div>

        <div class="card recurring-card">
          <h3 class="card-title">Regles</h3>
          <div id="rec-list"><p class="hint">Carregant…</p></div>
        </div>
      </div>
    `

    document.getElementById('recurring-form').addEventListener('submit', e => this.handleCreate(e))
    document.getElementById('rec-generate').addEventListener('click', () => this.generate())
    this.container.querySelector('#rec-list').addEventListener('click', e => {
      const del = e.target.closest('[data-delete-id]')
      const toggle = e.target.closest('[data-toggle-id]')
      if (del) this.remove(parseInt(del.dataset.deleteId))
      if (toggle) this.toggle(parseInt(toggle.dataset.toggleId))
    })

    await this.load()
  }

  today() {
    return new Date().toISOString().slice(0, 10)
  }

  async load() {
    try {
      const [categories, rules] = await Promise.all([categoryService.getAll(), apiService.request('/recurring')])
      this.categories = categories
      this.rules = rules

      document.getElementById('rec-category').innerHTML = `<option value="">Selecciona categoria…</option>${categoryOptionsHtml(categories)}`
      this.renderList()
    } catch (err) {
      document.getElementById('rec-list').innerHTML = `<p class="error-detail">Error carregant regles: ${escapeHtml(err.message)}</p>`
    }
  }

  renderList() {
    const list = document.getElementById('rec-list')
    if (this.rules.length === 0) {
      list.innerHTML = '<p class="hint">Encara no hi ha regles recurrents.</p>'
      return
    }

    const catName = id => this.categories.find(c => c.id === id)?.name ?? '—'
    list.innerHTML = `
      <div class="recurring-table">
        <div class="recurring-table-head">
          <span>Descripció</span><span>Import</span><span>Categoria</span><span>Dia</span><span>Vigència</span><span></span>
        </div>
        ${this.rules
          .map(
            r => `
          <div class="recurring-table-row ${r.isActive ? '' : 'inactive'}">
            <span>${escapeHtml(r.description)} ${r.type === 'income' ? '<span class="tag tag-income">Ingrés</span>' : ''}</span>
            <span class="${r.type === 'income' ? 'positive' : 'negative'}">${r.type === 'income' ? '+' : '-'}${this.money(r.amount)}</span>
            <span>${escapeHtml(catName(r.categoryId))}</span>
            <span>${r.dayOfMonth}</span>
            <span>${this.dateOnly(r.startDate)} → ${r.endDate ? this.dateOnly(r.endDate) : 'sense fi'}</span>
            <span class="recurring-actions">
              <button type="button" class="btn-app btn-app-secondary" data-toggle-id="${r.id}">${r.isActive ? 'Pausar' : 'Activar'}</button>
              <button type="button" class="btn-app btn-app-secondary" data-delete-id="${r.id}">Eliminar</button>
            </span>
          </div>`
          )
          .join('')}
      </div>
    `
  }

  async handleCreate(e) {
    e.preventDefault()
    const categoryId = parseInt(document.getElementById('rec-category').value)
    if (!categoryId) {
      alert('Selecciona una categoria')
      return
    }

    const endValue = document.getElementById('rec-end').value
    const body = {
      description: document.getElementById('rec-desc').value.trim(),
      amount: parseFloat(document.getElementById('rec-amount').value),
      type: document.getElementById('rec-type').value,
      categoryId,
      accountId: 1,
      accountingPercentage: parseInt(document.getElementById('rec-pct').value) || 100,
      dayOfMonth: parseInt(document.getElementById('rec-day').value),
      startDate: document.getElementById('rec-start').value,
      endDate: endValue || null,
      isActive: true,
    }

    try {
      await apiService.request('/recurring', { method: 'POST', body })
      document.getElementById('recurring-form').reset()
      document.getElementById('rec-start').value = this.today()
      document.getElementById('rec-day').value = 1
      document.getElementById('rec-pct').value = 100
      await this.load()
    } catch (err) {
      alert('Error creant la regla: ' + err.message)
    }
  }

  async generate() {
    const until = document.getElementById('rec-until').value
    if (!until) return
    try {
      const result = await apiService.request(`/recurring/generate?until=${until}`, { method: 'POST' })
      document.getElementById('rec-generate-result').textContent =
        result.created === 0 ? 'No hi havia transaccions noves per crear.' : `S'han creat ${result.created} transaccions.`
    } catch (err) {
      alert('Error generant transaccions: ' + err.message)
    }
  }

  async toggle(id) {
    const rule = this.rules.find(r => r.id === id)
    if (!rule) return
    try {
      await apiService.request(`/recurring/${id}`, { method: 'PUT', body: { ...rule, isActive: !rule.isActive } })
      await this.load()
    } catch (err) {
      alert('Error actualitzant la regla: ' + err.message)
    }
  }

  async remove(id) {
    if (!confirm('Eliminar la regla? Les transaccions ja generades es conserven.')) return
    try {
      await apiService.request(`/recurring/${id}`, { method: 'DELETE' })
      await this.load()
    } catch (err) {
      alert('Error eliminant la regla: ' + err.message)
    }
  }

  dateOnly(value) {
    return new Date(value).toLocaleDateString('ca-ES')
  }

  money(value) {
    return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(value)
  }
}
