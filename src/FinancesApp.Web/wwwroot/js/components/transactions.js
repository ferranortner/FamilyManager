// components/transactions.js
import { financeService } from '../services/financeService.js'
import { categoryService } from '../services/categoryService.js'

export class TransactionManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    this.categories = []
    this.transactions = []
    this.filteredTransactions = []
    this.sortField = 'date'
    this.sortDirection = 'desc'
    this.selectedCategory = 'all'
  }

  async render() {
    this.container.innerHTML = ''

    try {
      this.categories = await categoryService.getAll()
    } catch (err) {
      console.error('Error carregant categories:', err)
      this.categories = []
    }

    // Layout compacte: tot en una línia de capçalera
    this.container.innerHTML = `
      <div class="transactions-page">
        <div class="page-header-compact">
          
          
          <div class="header-controls">
            <div class="control-group">
              <label for="category-filter">Categoria</label>
              <select id="category-filter">
                <option value="all">Totes</option>
                ${this.categories
                  .map(
                    c => `
                  <option value="${c.id}">${c.icon || '•'} ${c.name}</option>
                `
                  )
                  .join('')}
              </select>
            </div>

            <div class="control-group">
              <label for="sort-field">Ordenar</label>
              <div class="sort-wrapper">
                <select id="sort-field">
                  <option value="date" selected>Data</option>
                  <option value="amount">Import</option>
                </select>
                <button id="sort-direction" class="btn-sort" title="Canviar direcció">
                  <span id="sort-icon">↓</span>
                </button>
              </div>
            </div>

            <button class="btn btn-primary" id="add-btn">+ Nova</button>
          </div>
        </div>

        <div class="transactions-summary" id="transactions-summary"></div>

        <div id="transactions-list" class="transactions-list-full">
          <p class="loading">Carregant transaccions...</p>
        </div>
      </div>
    `

    // Event listeners
    document.getElementById('add-btn').addEventListener('click', () => this.openModal())

    document.getElementById('category-filter').addEventListener('change', e => {
      this.selectedCategory = e.target.value
      this.applyFilters()
    })

    document.getElementById('sort-field').addEventListener('change', e => {
      this.sortField = e.target.value
      this.renderSortedTransactions()
    })

    document.getElementById('sort-direction').addEventListener('click', () => {
      this.sortDirection = this.sortDirection === 'desc' ? 'asc' : 'desc'
      document.getElementById('sort-icon').textContent = this.sortDirection === 'desc' ? '↓' : '↑'
      this.renderSortedTransactions()
    })

    await this.loadTransactions()
  }

  async loadTransactions() {
    try {
      this.transactions = await financeService.getTransactions()
      this.filteredTransactions = [...this.transactions]

      if (!this.transactions || this.transactions.length === 0) {
        this.showEmptyState()
        return
      }

      this.applyFilters()
    } catch (err) {
      console.error('Error carregant transaccions:', err)
      document.getElementById('transactions-list').innerHTML = `
        <div class="error-state">
          <p>Error carregant les transaccions</p>
          <p class="error-detail">${err.message}</p>
        </div>
      `
    }
  }

  showEmptyState() {
    document.getElementById('transactions-list').innerHTML = `
      <div class="empty-state-full">
        <div class="empty-icon">📭</div>
        <p>No hi ha transaccions</p>
        <p class="hint">Fes clic a "+ Nova" per començar</p>
      </div>
    `
  }

  applyFilters() {
    if (this.selectedCategory === 'all') {
      this.filteredTransactions = [...this.transactions]
    } else {
      const categoryId = parseInt(this.selectedCategory)
      this.filteredTransactions = this.transactions.filter(t => t.categoryId === categoryId)
    }

    this.updateSummary()
    this.renderSortedTransactions()
  }

  updateSummary() {
    const summaryEl = document.getElementById('transactions-summary')
    if (!summaryEl) return

    const count = this.filteredTransactions.length

    if (this.selectedCategory !== 'all') {
      const category = this.categories.find(c => c.id === parseInt(this.selectedCategory))
      const total = this.filteredTransactions.reduce((sum, t) => {
        const effective = this.calculateEffectiveAmount(t)
        return t.type === 'income' ? sum + effective : sum - effective
      }, 0)

      summaryEl.innerHTML = `
        <span class="summary-pill" style="border-color: ${category?.color || '#ccc'}">
          <span class="category-dot" style="background: ${category?.color || '#ccc'}"></span>
          ${category?.icon || '•'} ${category?.name}: ${count} transaccions | 
          <strong class="${total >= 0 ? 'income' : 'expense'}">
            ${total >= 0 ? '+' : ''}${this.formatCurrency(total)}
          </strong>
        </span>
      `
      summaryEl.style.display = 'block'
    } else {
      summaryEl.innerHTML = `<span class="summary-pill total">${count} transaccions totals</span>`
      summaryEl.style.display = 'block'
    }
  }

  calculateEffectiveAmount(transaction) {
    const percentage = transaction.accountingPercentage || 100
    return transaction.amount * (percentage / 100)
  }

  sortTransactions() {
    const sorted = [...this.filteredTransactions]
    sorted.sort((a, b) => {
      let comparison = 0
      if (this.sortField === 'date') {
        comparison = new Date(a.date) - new Date(b.date)
      } else if (this.sortField === 'amount') {
        comparison = this.calculateEffectiveAmount(a) - this.calculateEffectiveAmount(b)
      }
      return this.sortDirection === 'desc' ? -comparison : comparison
    })
    return sorted
  }

  renderSortedTransactions() {
    const listContainer = document.getElementById('transactions-list')
    const sortedTransactions = this.sortTransactions()

    if (sortedTransactions.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state-full">
          <div class="empty-icon">🔍</div>
          <p>Cap transacció amb aquest filtre</p>
          <button class="btn btn-secondary" onclick="document.getElementById('category-filter').value='all'; document.getElementById('category-filter').dispatchEvent(new Event('change'))">
            Mostrar totes
          </button>
        </div>
      `
      return
    }

    listContainer.innerHTML = sortedTransactions.map(t => this.renderTransactionItem(t)).join('')

    // Event listeners
    listContainer.querySelectorAll('.transaction-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('.btn-delete') || e.target.closest('.btn-edit')) return
        this.openEditModal(item.dataset.id)
      })
    })

    listContainer.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        this.openEditModal(btn.dataset.id)
      })
    })

    listContainer.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        this.deleteTransaction(btn.dataset.id)
      })
    })
  }

  renderTransactionItem(t) {
    const category = this.categories.find(c => c.id === t.categoryId) || {}
    const isIncome = t.type === 'income'
    const percentage = t.accountingPercentage || 100
    const effectiveAmount = this.calculateEffectiveAmount(t)
    const hasPartialAccounting = percentage !== 100

    const date = new Date(t.date)
    const dateStr = date.toLocaleDateString('ca-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    return `
      <div class="transaction-item-compact ${hasPartialAccounting ? 'partial' : ''}" data-id="${t.id}">
        <div class="tx-main">
          <div class="tx-icon" style="background: ${category.color || '#ccc'}">
            ${category.icon || '💰'}
          </div>
          <div class="tx-content">
            <div class="tx-top">
              <span class="tx-desc">${t.description || 'Sense descripció'}</span>
              <span class="tx-amount ${isIncome ? 'income' : 'expense'}">
                ${isIncome ? '+' : '-'}${this.formatCurrency(Math.abs(effectiveAmount))}
              </span>
            </div>
            <div class="tx-bottom">
              <span class="tx-date">${dateStr}</span>
              <span class="tx-category" style="color: ${category.color || '#666'}">
                ${category.name || 'Sense categoria'}
              </span>
              ${hasPartialAccounting ? `<span class="tx-badge">${percentage}%</span>` : ''}
              ${hasPartialAccounting ? `<span class="tx-original">(${this.formatCurrency(t.amount)})</span>` : ''}
            </div>
          </div>
        </div>
        <div class="tx-actions">
          <button class="btn-icon btn-edit" data-id="${t.id}" title="Editar">✏️</button>
          <button class="btn-icon btn-delete" data-id="${t.id}" title="Eliminar">🗑️</button>
        </div>
      </div>
    `
  }

  async refreshData() {
    this.transactions = await financeService.getTransactions()
    this.applyFilters()
  }

  async deleteTransaction(id) {
    if (!confirm('Segur que vols eliminar aquesta transacció?')) return
    try {
      await financeService.deleteTransaction(id)
      await this.refreshData()
    } catch (err) {
      console.error('Error eliminant transacció:', err)
      alert('Error eliminant la transacció: ' + err.message)
    }
  }

  openModal() {
    this.openTransactionModal(null)
  }

  openEditModal(transactionId) {
    const transaction = this.transactions.find(t => t.id == transactionId)
    if (!transaction) {
      alert('Transacció no trobada')
      return
    }
    this.openTransactionModal(transaction)
  }

  openTransactionModal(transaction = null) {
    const isEdit = transaction !== null
    const title = isEdit ? 'Editar Transacció' : 'Nova Transacció'

    if (this.categories.length === 0) {
      alert('No hi ha categories disponibles.')
      return
    }

    const categoryOptions = this.categories
      .map(c => {
        const selected = isEdit && c.id === transaction.categoryId ? 'selected' : ''
        return `<option value="${c.id}" ${selected}>${c.icon || '•'} ${c.name}</option>`
      })
      .join('')

    const percentage = isEdit ? transaction.accountingPercentage || 100 : 100
    const dateStr = isEdit ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]

    const modal = document.createElement('div')
    modal.className = 'modal-overlay'
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <form id="transaction-form">
          ${isEdit ? `<input type="hidden" name="id" value="${transaction.id}">` : ''}
          
          <div class="form-group">
            <label>Descripció *</label>
            <input type="text" name="description" required value="${isEdit ? transaction.description || '' : ''}" placeholder="Ex: Compra al supermercat">
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Import (€) *</label>
              <input type="number" name="amount" step="0.01" min="0.01" required value="${isEdit ? transaction.amount : ''}">
            </div>
            <div class="form-group">
              <label>Data *</label>
              <input type="date" name="date" required value="${dateStr}">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Tipus *</label>
              <select name="type" required>
                <option value="expense" ${isEdit && transaction.type === 'expense' ? 'selected' : ''}>Despesa</option>
                <option value="income" ${isEdit && transaction.type === 'income' ? 'selected' : ''}>Ingrés</option>
              </select>
            </div>
            <div class="form-group">
              <label>Categoria *</label>
              <select name="categoryId" required>
                <option value="">Selecciona...</option>
                ${categoryOptions}
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label>Percentatge a comptabilitzar</label>
            <div class="percentage-control">
              <input type="range" id="pct-slider" min="1" max="100" value="${percentage}">
              <input type="number" name="accountingPercentage" id="pct-input" min="1" max="100" value="${percentage}">
              <span>%</span>
            </div>
            <small id="pct-hint"></small>
          </div>
          
          <input type="hidden" name="accountId" value="${isEdit ? transaction.accountId || 1 : 1}">
          
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel·lar</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Actualitzar' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    `

    document.body.appendChild(modal)

    // Sincronitzar slider i input
    const slider = document.getElementById('pct-slider')
    const input = document.getElementById('pct-input')
    const hint = document.getElementById('pct-hint')
    const amountInput = document.querySelector('input[name="amount"]')

    const updateHint = () => {
      const pct = parseInt(slider.value)
      const amt = parseFloat(amountInput.value) || 0
      hint.textContent = `${pct}% = ${this.formatCurrency((amt * pct) / 100)}`
    }

    slider.addEventListener('input', () => {
      input.value = slider.value
      updateHint()
    })
    input.addEventListener('input', () => {
      slider.value = input.value
      updateHint()
    })
    amountInput.addEventListener('input', updateHint)
    updateHint()

    document.getElementById('transaction-form').addEventListener('submit', async e => {
      e.preventDefault()
      const formData = new FormData(e.target)
      const data = {
        description: formData.get('description').trim(),
        amount: parseFloat(formData.get('amount')),
        type: formData.get('type'),
        date: formData.get('date'),
        categoryId: parseInt(formData.get('categoryId')),
        accountId: parseInt(formData.get('accountId')) || 1,
        accountingPercentage: parseInt(formData.get('accountingPercentage')) || 100,
      }

      if (isEdit) data.id = parseInt(formData.get('id'))

      if (!data.description || !data.amount || !data.categoryId) {
        alert('Completa tots els camps obligatoris')
        return
      }

      try {
        if (isEdit) {
          await financeService.updateTransaction(data.id, data)
        } else {
          await financeService.addTransaction(data)
        }
        modal.remove()
        await this.refreshData()
      } catch (err) {
        alert('Error: ' + err.message)
      }
    })
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('ca-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }
}
