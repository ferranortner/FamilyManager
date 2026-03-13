// components/transactions.js
import { financeService } from '../services/financeService.js'
import { categoryService } from '../services/categoryService.js'

export class TransactionManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    this.categories = []
    this.transactions = []
    this.sortField = 'date' // 'date' o 'amount'
    this.sortDirection = 'desc' // 'asc' o 'desc'
  }

  async render() {
    // Netejar contenidor
    this.container.innerHTML = ''

    // Carregar categories disponibles
    try {
      this.categories = await categoryService.getAll()
      console.log('Categories carregades:', this.categories)
    } catch (err) {
      console.error('Error carregant categories:', err)
      this.categories = []
    }

    // Crear estructura HTML
    this.container.innerHTML = `
      <div class="transactions-header">
        <h2>Transaccions</h2>
        <button class="btn btn-primary" id="add-btn">+ Nova Transacció</button>
      </div>

      <div class="transactions-controls">
        <div class="sort-controls">
          <label>Ordenar per:</label>
          <select id="sort-field">
            <option value="date" selected>Data</option>
            <option value="amount">Import</option>
          </select>
          <button id="sort-direction" class="btn-sort" title="Canviar direcció">
            <span id="sort-icon">↓</span>
          </button>
        </div>
      </div>

      <div id="transactions-list" class="transactions-list">
        <p class="loading">Carregant transaccions...</p>
      </div>
    `

    // Event listener per afegir nova transacció
    document.getElementById('add-btn').addEventListener('click', () => this.openModal())

    // Event listeners per ordenació
    document.getElementById('sort-field').addEventListener('change', e => {
      this.sortField = e.target.value
      this.renderSortedTransactions()
    })

    document.getElementById('sort-direction').addEventListener('click', () => {
      this.sortDirection = this.sortDirection === 'desc' ? 'asc' : 'desc'
      document.getElementById('sort-icon').textContent = this.sortDirection === 'desc' ? '↓' : '↑'
      this.renderSortedTransactions()
    })

    // Carregar transaccions
    await this.loadTransactions()
  }

  async loadTransactions() {
    const listContainer = document.getElementById('transactions-list')

    try {
      console.log('Carregant transaccions...')
      this.transactions = await financeService.getTransactions()
      console.log('Transaccions rebudes:', this.transactions)

      if (!this.transactions || this.transactions.length === 0) {
        listContainer.innerHTML = `
          <div class="empty-state">
            <p>No hi ha transaccions</p>
            <p class="hint">Fes clic a "+ Nova Transacció" per afegir-ne una</p>
          </div>
        `
        return
      }

      this.renderSortedTransactions()
    } catch (err) {
      console.error('Error carregant transaccions:', err)
      listContainer.innerHTML = `
        <div class="error-state">
          <p>Error carregant les transaccions</p>
          <p class="error-detail">${err.message}</p>
        </div>
      `
    }
  }

  sortTransactions() {
    const sorted = [...this.transactions]

    sorted.sort((a, b) => {
      let comparison = 0

      if (this.sortField === 'date') {
        comparison = new Date(a.date) - new Date(b.date)
      } else if (this.sortField === 'amount') {
        comparison = a.amount - b.amount
      }

      return this.sortDirection === 'desc' ? -comparison : comparison
    })

    return sorted
  }

  renderSortedTransactions() {
    const listContainer = document.getElementById('transactions-list')
    const sortedTransactions = this.sortTransactions()

    listContainer.innerHTML = sortedTransactions.map(t => this.renderTransactionItem(t)).join('')

    // Afegir event listeners per esborrar
    listContainer.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const id = e.target.closest('.btn-delete').dataset.id
        this.deleteTransaction(id)
      })
    })
  }

  renderTransactionItem(t) {
    // Trobar la categoria
    const category = this.categories.find(c => c.id === t.categoryId) || {}
    const isIncome = t.type === 'income'

    // Formatejar data
    const date = new Date(t.date)
    const dateStr = date.toLocaleDateString('ca-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    return `
      <div class="transaction-item" data-id="${t.id}">
        <div class="transaction-info">
          <div class="transaction-icon" style="background-color: ${category.color || '#ccc'}">
            ${category.icon || '💰'}
          </div>
          <div class="transaction-details">
            <div class="transaction-description">${t.description || 'Sense descripció'}</div>
            <div class="transaction-meta">
              <span class="transaction-date">${dateStr}</span>
              <span class="transaction-category">${category.name || 'Sense categoria'}</span>
            </div>
          </div>
        </div>
        <div class="transaction-amounts">
          <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
            ${isIncome ? '+' : '-'}${this.formatCurrency(Math.abs(t.amount))}
          </div>
          <button class="btn-delete" data-id="${t.id}" title="Eliminar">🗑️</button>
        </div>
      </div>
    `
  }

  async deleteTransaction(id) {
    if (!confirm('Segur que vols eliminar aquesta transacció?')) return

    try {
      await financeService.deleteTransaction(id)
      console.log('Transacció eliminada:', id)
      this.transactions = this.transactions.filter(t => t.id !== id)
      this.renderSortedTransactions()
    } catch (err) {
      console.error('Error eliminant transacció:', err)
      alert('Error eliminant la transacció: ' + err.message)
    }
  }

  openModal() {
    // Si no hi ha categories, mostrar error
    if (this.categories.length === 0) {
      alert('No hi ha categories disponibles. Crea categories primer.')
      return
    }

    // Generar opcions de categories
    const categoryOptions = this.categories.map(c => `<option value="${c.id}">${c.icon || '•'} ${c.name} (${c.type === 'income' ? 'Ingrés' : 'Despesa'})</option>`).join('')

    const modal = document.createElement('div')
    modal.className = 'modal-overlay'
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Nova Transacció</h3>
          <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>

        <form id="transaction-form">
          <div class="form-group">
            <label for="description">Descripció *</label>
            <input type="text" id="description" name="description" required 
                   placeholder="Ex: Compra al supermercat">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="amount">Import (€) *</label>
              <input type="number" id="amount" name="amount" step="0.01" min="0.01" required 
                     placeholder="0.00">
            </div>

            <div class="form-group">
              <label for="date">Data *</label>
              <input type="date" id="date" name="date" 
                     value="${new Date().toISOString().split('T')[0]}" required>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="type">Tipus *</label>
              <select id="type" name="type" required>
                <option value="expense">Despesa</option>
                <option value="income">Ingrés</option>
              </select>
            </div>

            <div class="form-group">
              <label for="categoryId">Categoria *</label>
              <select id="categoryId" name="categoryId" required>
                <option value="">Selecciona...</option>
                ${categoryOptions}
              </select>
            </div>
          </div>

          <input type="hidden" name="accountId" value="1">

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
              Cancel·lar
            </button>
            <button type="submit" class="btn btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    `

    document.body.appendChild(modal)

    // Focus al primer camp
    document.getElementById('description').focus()

    // Gestionar submit
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
      }

      // Validació
      if (!data.description || isNaN(data.amount) || data.amount <= 0) {
        alert('Si us plau, introdueix una descripció i un import vàlid')
        return
      }

      if (!data.categoryId) {
        alert('Si us plau, selecciona una categoria')
        return
      }

      console.log('Creant transacció:', data)

      try {
        const newTransaction = await financeService.addTransaction(data)
        console.log('Transacció creada correctament')
        modal.remove()
        this.transactions.unshift(newTransaction)
        this.renderSortedTransactions()
      } catch (err) {
        console.error('Error creant transacció:', err)
        alert('Error guardant la transacció: ' + err.message)
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
