// components/CategorySummary.js
// Resum de una o més categories (o grups sencers) amb totals combinats.
import { financeService } from '../services/financeService.js'
import { categoryService } from '../services/categoryService.js'
import { escapeHtml, groupCategories } from '../utils/categoryOptions.js'

export class CategorySummary {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    this.categories = []
    this.transactions = []
    this.selectedIds = new Set()
  }

  async render() {
    this.container.innerHTML = ''

    try {
      this.categories = await categoryService.getAll()
    } catch (err) {
      console.error('Error carregant categories:', err)
      this.categories = []
    }

    this.container.innerHTML = `
      <div class="category-summary-page">
        <div class="page-header-compact">
          <h2>Resum per categories</h2>
        </div>

        <div class="category-selector-section">
          <div class="cs-selector-head">
            <span class="cs-selector-title">Selecciona una o més categories o grups</span>
            <button type="button" id="cs-clear" class="cs-clear">Netejar selecció</button>
          </div>
          <div class="cs-groups">
            ${this.renderSelector()}
          </div>
        </div>

        <div id="category-summary-content" class="summary-content"></div>
      </div>
    `

    this.container.querySelector('.category-summary-page').addEventListener('click', e => this.handleClick(e))
    this.showEmptySummary()
    await this.loadTransactions()
  }

  renderSelector() {
    if (this.categories.length === 0) {
      return '<p class="hint">No hi ha categories</p>'
    }

    return groupCategories(this.categories)
      .map(g => {
        const ids = g.items.map(c => c.id)
        const allSelected = ids.every(id => this.selectedIds.has(id))
        return `
          <div class="cs-group">
            <button type="button" class="cs-group-toggle ${allSelected ? 'active' : ''}" data-group-ids="${ids.join(',')}">
              ${escapeHtml(g.name)} <span class="cs-count">${g.items.length}</span>
            </button>
            <div class="cs-chips">
              ${g.items
                .map(
                  c => `
                <button type="button" class="cs-chip ${this.selectedIds.has(c.id) ? 'active' : ''}"
                  data-id="${c.id}" style="--chip-color: ${c.color || '#6b7280'}">
                  ${escapeHtml(c.icon || '•')} ${escapeHtml(c.name)}
                </button>`
                )
                .join('')}
            </div>
          </div>
        `
      })
      .join('')
  }

  handleClick(e) {
    if (e.target.id === 'cs-clear') {
      this.selectedIds.clear()
      this.refreshSelector()
      this.showSummary()
      return
    }

    const chip = e.target.closest('.cs-chip')
    if (chip) {
      const id = parseInt(chip.dataset.id)
      if (this.selectedIds.has(id)) this.selectedIds.delete(id)
      else this.selectedIds.add(id)
      this.refreshSelector()
      this.showSummary()
      return
    }

    const groupBtn = e.target.closest('.cs-group-toggle')
    if (groupBtn) {
      const ids = groupBtn.dataset.groupIds.split(',').map(Number)
      const allSelected = ids.every(id => this.selectedIds.has(id))
      ids.forEach(id => (allSelected ? this.selectedIds.delete(id) : this.selectedIds.add(id)))
      this.refreshSelector()
      this.showSummary()
    }
  }

  refreshSelector() {
    const groups = this.container.querySelector('.cs-groups')
    if (groups) groups.innerHTML = this.renderSelector()
  }

  async loadTransactions() {
    try {
      this.transactions = await financeService.getTransactions()
      this.showSummary()
    } catch (err) {
      console.error('Error carregant transaccions:', err)
      document.getElementById('category-summary-content').innerHTML = `
        <div class="error-state">
          <p>Error carregant les transaccions</p>
          <p class="error-detail">${escapeHtml(err.message)}</p>
        </div>
      `
    }
  }

  showEmptySummary() {
    document.getElementById('category-summary-content').innerHTML = `
      <div class="empty-state-full">
        <p>Selecciona una categoria o un grup per veure el resum</p>
      </div>
    `
  }

  showSummary() {
    if (this.selectedIds.size === 0) {
      this.showEmptySummary()
      return
    }

    const selected = this.categories.filter(c => this.selectedIds.has(c.id))
    const selectedIds = new Set(selected.map(c => c.id))
    const txs = this.transactions
      .filter(t => selectedIds.has(t.categoryId))
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    const title = selected.length === 1 ? escapeHtml(selected[0].name) : `${selected.length} categories combinades`
    const color = selected.length === 1 ? selected[0].color || '#6b7280' : '#1f3a5f'

    if (txs.length === 0) {
      document.getElementById('category-summary-content').innerHTML = `
        <div class="empty-state-full">
          <p>Sense transaccions a <strong>${title}</strong></p>
        </div>
      `
      return
    }

    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + this.effective(t), 0)
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + this.effective(t), 0)
    const balance = income - expense
    const average = txs.reduce((s, t) => s + Math.abs(this.effective(t)), 0) / txs.length

    const breakdown = selected
      .map(c => {
        const list = txs.filter(t => t.categoryId === c.id)
        const total = list.reduce((s, t) => s + (t.type === 'income' ? 1 : -1) * this.effective(t), 0)
        return { c, count: list.length, total }
      })
      .filter(r => r.count > 0)
      .sort((a, b) => a.total - b.total)

    const breakdownHtml = breakdown
      .map(
        r => `
        <div class="cs-breakdown-row">
          <span class="cs-breakdown-name"><span class="cs-dot" style="background: ${r.c.color || '#6b7280'}"></span>${escapeHtml(r.c.name)}</span>
          <span class="cs-breakdown-count">${r.count} tx</span>
          <span class="cs-breakdown-total ${r.total >= 0 ? 'positive' : 'negative'}">${r.total >= 0 ? '+' : ''}${this.formatCurrency(r.total)}</span>
        </div>`
      )
      .join('')

    document.getElementById('category-summary-content').innerHTML = `
      <div class="category-details">
        <div class="category-header" style="border-left-color: ${color}">
          <div class="category-title">
            <div class="category-info">
              <h3>${title}</h3>
              <span class="category-type">${selected.length === 1 ? (selected[0].type === 'income' ? 'Ingrés' : 'Despesa') : 'Selecció múltiple'}</span>
            </div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Transaccions</div>
            <div class="stat-value">${txs.length}</div>
          </div>
          <div class="stat-card ${balance >= 0 ? 'positive' : 'negative'}">
            <div class="stat-label">Balanç</div>
            <div class="stat-value">${balance >= 0 ? '+' : ''}${this.formatCurrency(balance)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Mitjana</div>
            <div class="stat-value">${this.formatCurrency(average)}</div>
          </div>
        </div>

        <div class="type-breakdown">
          <div class="type-stat income">
            <span class="type-label">Ingressos</span>
            <span class="type-value">+${this.formatCurrency(income)}</span>
          </div>
          <div class="type-stat expense">
            <span class="type-label">Despeses</span>
            <span class="type-value">-${this.formatCurrency(expense)}</span>
          </div>
        </div>

        ${
          selected.length > 1
            ? `
        <div class="cs-breakdown">
          <div class="section-header"><h4>Desglossament per categoria</h4></div>
          ${breakdownHtml}
        </div>`
            : ''
        }

        <div class="transactions-list-section">
          <div class="section-header">
            <h4>Transaccions</h4>
            <span class="transaction-count">${txs.length}</span>
          </div>
          <div class="transactions-table-header">
            <span class="col-date">Data</span>
            <span class="col-desc">Descripció</span>
            <span class="col-amount">Import</span>
          </div>
          <div class="transactions-list">
            ${txs.map(t => this.renderTransactionRow(t)).join('')}
          </div>
        </div>
      </div>
    `
  }

  renderTransactionRow(t) {
    const dateStr = new Date(t.date).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const amount = this.effective(t)
    const isIncome = t.type === 'income'
    const percentage = t.accountingPercentage || 100
    const description = escapeHtml(t.description || 'Sense descripció')

    return `
      <div class="summary-transaction-row">
        <span class="tx-date">${dateStr}</span>
        <span class="tx-desc" title="${description}">${description}</span>
        <span class="tx-amount ${isIncome ? 'income' : 'expense'}">
          ${isIncome ? '+' : '-'}${this.formatCurrency(Math.abs(amount))}
          ${percentage !== 100 ? `<span class="tx-partial-badge">${percentage}%</span>` : ''}
        </span>
      </div>
    `
  }

  effective(transaction) {
    const percentage = transaction.accountingPercentage || 100
    return transaction.amount * (percentage / 100)
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  async refreshData() {
    this.transactions = await financeService.getTransactions()
    this.showSummary()
  }
}
