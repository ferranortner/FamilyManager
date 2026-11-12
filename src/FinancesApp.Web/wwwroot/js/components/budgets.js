// components/budgets.js
// Pressupostos mensuals per categoria de despesa, amb progrés del mes.
import { categoryService } from '../services/categoryService.js'
import { apiService } from '../services/apiService.js'
import { escapeHtml } from '../utils/categoryOptions.js'

export class BudgetsView {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    const now = new Date()
    this.year = now.getFullYear()
    this.month = now.getMonth() + 1
  }

  async render() {
    const monthValue = `${this.year}-${String(this.month).padStart(2, '0')}`
    this.container.innerHTML = `
      <div class="budget-page">
        <div class="budget-toolbar">
          <label class="budget-month">Mes
            <input type="month" id="budget-month" class="form-control" value="${monthValue}">
          </label>
          <div id="budget-summary" class="budget-summary"></div>
        </div>
        <div id="budget-list" class="budget-list"><p class="hint">Carregant…</p></div>
      </div>
    `

    document.getElementById('budget-month').addEventListener('change', e => {
      const [y, m] = e.target.value.split('-').map(Number)
      this.year = y
      this.month = m
      this.load()
    })

    this.container.querySelector('#budget-list').addEventListener('click', e => {
      const btn = e.target.closest('[data-save-id]')
      if (btn) this.save(parseInt(btn.dataset.saveId))
    })

    await this.load()
  }

  async load() {
    try {
      const [categories, progress] = await Promise.all([
        categoryService.getAll('expense'),
        apiService.request(`/budgets/progress?year=${this.year}&month=${this.month}`),
      ])

      const byCategory = new Map(progress.map(p => [p.categoryId, p]))
      const rows = categories
        .map(c => {
          const p = byCategory.get(c.id)
          return { c, limit: p?.monthlyLimit ?? 0, spent: p?.spent ?? 0 }
        })
        .sort((a, b) => {
          // Primer els que tenen límit, després per percentatge consumit
          if ((a.limit > 0) !== (b.limit > 0)) return a.limit > 0 ? -1 : 1
          const pa = a.limit ? a.spent / a.limit : 0
          const pb = b.limit ? b.spent / b.limit : 0
          return pb - pa
        })

      this.renderSummary(rows)
      document.getElementById('budget-list').innerHTML = rows.map(r => this.renderRow(r)).join('')
    } catch (err) {
      document.getElementById('budget-list').innerHTML = `<p class="error-detail">Error carregant pressupostos: ${escapeHtml(err.message)}</p>`
    }
  }

  renderSummary(rows) {
    const withLimit = rows.filter(r => r.limit > 0)
    const totalLimit = withLimit.reduce((s, r) => s + r.limit, 0)
    const totalSpent = withLimit.reduce((s, r) => s + r.spent, 0)
    const over = withLimit.filter(r => r.spent > r.limit).length

    document.getElementById('budget-summary').innerHTML =
      withLimit.length === 0
        ? '<span class="hint">Encara no hi ha cap límit. Defineix-ne un per a cada categoria.</span>'
        : `<span><strong>${this.money(totalSpent)}</strong> de ${this.money(totalLimit)} gastats</span>
           ${over > 0 ? `<span class="budget-over-count">${over} categoria${over > 1 ? 's' : ''} per sobre del límit</span>` : ''}`
  }

  renderRow({ c, limit, spent }) {
    const percent = limit > 0 ? (spent / limit) * 100 : 0
    const state = limit === 0 ? 'none' : percent > 100 ? 'over' : percent >= 80 ? 'warn' : 'ok'
    const bar = Math.min(percent, 100)

    return `
      <div class="budget-row budget-${state}">
        <div class="budget-head">
          <span class="budget-name">${escapeHtml(c.icon || '•')} ${escapeHtml(c.name)}</span>
          <span class="budget-figures">
            ${limit > 0 ? `${this.money(spent)} / ${this.money(limit)} <span class="budget-percent">(${percent.toFixed(0)} %)</span>` : `${this.money(spent)} gastats este mes`}
          </span>
        </div>
        ${limit > 0 ? `<div class="budget-bar"><div class="budget-fill" style="width: ${bar}%"></div></div>` : ''}
        <div class="budget-edit">
          <label>Límit mensual
            <input type="number" min="0" step="1" id="limit-${c.id}" class="form-control budget-input" value="${limit || ''}" placeholder="Sense límit">
          </label>
          <button type="button" class="btn-app btn-app-secondary" data-save-id="${c.id}">Desar</button>
        </div>
      </div>
    `
  }

  async save(categoryId) {
    const input = document.getElementById(`limit-${categoryId}`)
    const value = parseFloat(input.value) || 0
    try {
      await apiService.request(`/budgets/${categoryId}`, { method: 'PUT', body: { monthlyLimit: value } })
      await this.load()
    } catch (err) {
      alert('Error desant el límit: ' + err.message)
    }
  }

  money(value) {
    return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(value)
  }
}
