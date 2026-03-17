// components/transactions.js
import { financeService } from '../services/financeService.js'
import { categoryService } from '../services/categoryService.js'

export class TransactionManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    this.categories = []
    this.transactions = []
    this.sortField = 'date'
    this.sortDirection = 'desc'
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

    document.getElementById('add-btn').addEventListener('click', () => this.openModal())

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
    const listContainer = document.getElementById('transactions-list')

    try {
      this.transactions = await financeService.getTransactions()

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

  calculateEffectiveAmount(transaction) {
    const percentage = transaction.accountingPercentage || 100
    return transaction.amount * (percentage / 100)
  }

  sortTransactions() {
    const sorted = [...this.transactions]

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

    listContainer.innerHTML = sortedTransactions.map(t => this.renderTransactionItem(t)).join('')

    // Event listeners per editar (clic a la fila)
    listContainer.querySelectorAll('.transaction-item').forEach(item => {
      item.addEventListener('click', e => {
        // No obrir modal si es fa clic als botons
        if (e.target.closest('.btn-delete') || e.target.closest('.btn-edit')) return
        const id = item.dataset.id
        this.openEditModal(id)
      })
    })

    // Event listeners per editar (botó explícit)
    listContainer.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const id = btn.dataset.id
        this.openEditModal(id)
      })
    })

    // Event listeners per esborrar
    listContainer.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const id = e.target.closest('.btn-delete').dataset.id
        this.deleteTransaction(id)
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
      <div class="transaction-item ${hasPartialAccounting ? 'partial-accounting' : ''}" data-id="${t.id}">
        <div class="transaction-info">
          <div class="transaction-icon" style="background-color: ${category.color || '#ccc'}">
            ${category.icon || '💰'}
          </div>
          <div class="transaction-details">
            <div class="transaction-description">${t.description || 'Sense descripció'}</div>
            <div class="transaction-meta">
              <span class="transaction-date">${dateStr}</span>
              <span class="transaction-category">${category.name || 'Sense categoria'}</span>
              ${hasPartialAccounting ? `<span class="percentage-badge">${percentage}% comptabilitzat</span>` : ''}
            </div>
          </div>
        </div>
        <div class="transaction-amounts">
          <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
            ${isIncome ? '+' : '-'}${this.formatCurrency(Math.abs(effectiveAmount))}
            ${hasPartialAccounting ? `<span class="original-amount">(${this.formatCurrency(t.amount)} total)</span>` : ''}
          </div>
          <div class="transaction-actions">
            <button class="btn-edit" data-id="${t.id}" title="Editar">✏️</button>
            <button class="btn-delete" data-id="${t.id}" title="Eliminar">🗑️</button>
          </div>
        </div>
      </div>
    `
  }

  // ✏️ NOU: Obrir modal per editar transacció existent
  openEditModal(transactionId) {
    const transaction = this.transactions.find(t => t.id == transactionId)
    if (!transaction) {
      alert('Transacció no trobada')
      return
    }

    if (this.categories.length === 0) {
      alert('No hi ha categories disponibles.')
      return
    }

    const categoryOptions = this.categories
      .map(
        c =>
          `<option value="${c.id}" ${c.id === transaction.categoryId ? 'selected' : ''}>
        ${c.icon || '•'} ${c.name} (${c.type === 'income' ? 'Ingrés' : 'Despesa'})
      </option>`
      )
      .join('')

    const percentage = transaction.accountingPercentage || 100
    const dateStr = new Date(transaction.date).toISOString().split('T')[0]

    const modal = document.createElement('div')
    modal.className = 'modal-overlay'
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Editar Transacció</h3>
          <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>

        <form id="transaction-form">
          <input type="hidden" name="id" value="${transaction.id}">

          <div class="form-group">
            <label for="description">Descripció *</label>
            <input type="text" id="description" name="description" required 
                   value="${transaction.description || ''}"
                   placeholder="Ex: Compra al supermercat">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="amount">Import total (€) *</label>
              <input type="number" id="amount" name="amount" step="0.01" min="0.01" required 
                     value="${transaction.amount}"
                     placeholder="0.00">
            </div>

            <div class="form-group">
              <label for="date">Data *</label>
              <input type="date" id="date" name="date" 
                     value="${dateStr}" required>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="type">Tipus *</label>
              <select id="type" name="type" required>
                <option value="expense" ${transaction.type === 'expense' ? 'selected' : ''}>Despesa</option>
                <option value="income" ${transaction.type === 'income' ? 'selected' : ''}>Ingrés</option>
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

          <div class="form-group percentage-control">
            <label for="accountingPercentage">Percentatge a comptabilitzar</label>
            <div class="percentage-input-wrapper">
              <input type="range" id="percentage-slider" min="1" max="100" value="${percentage}" 
                     class="percentage-slider">
              <div class="percentage-field">
                <input type="number" id="accountingPercentage" name="accountingPercentage" 
                       min="1" max="100" value="${percentage}" class="percentage-number">
                <span class="percentage-symbol">%</span>
              </div>
            </div>
            <p class="percentage-hint">
              <span id="effective-amount-hint"></span>
            </p>
          </div>

          <input type="hidden" name="accountId" value="${transaction.accountId || 1}">

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
              Cancel·lar
            </button>
            <button type="submit" class="btn btn-primary">Actualitzar</button>
          </div>
        </form>
      </div>
    `

    document.body.appendChild(modal)

    // Sincronitzar slider i input numèric
    const slider = document.getElementById('percentage-slider')
    const numberInput = document.getElementById('accountingPercentage')
    const hint = document.getElementById('effective-amount-hint')
    const amountInput = document.getElementById('amount')

    const updateHint = () => {
      const pct = parseInt(slider.value)
      const amt = parseFloat(amountInput.value) || 0
      const effective = ((amt * pct) / 100).toFixed(2)
      hint.textContent = `S'aplicarà: ${pct}% = ${this.formatCurrency(effective)}`
    }

    slider.addEventListener('input', () => {
      numberInput.value = slider.value
      updateHint()
    })

    numberInput.addEventListener('input', () => {
      let val = parseInt(numberInput.value) || 100
      val = Math.max(1, Math.min(100, val))
      slider.value = val
      updateHint()
    })

    amountInput.addEventListener('input', updateHint)
    updateHint() // Inicialitzar

    document.getElementById('description').focus()

    document.getElementById('transaction-form').addEventListener('submit', async e => {
      e.preventDefault()

      const formData = new FormData(e.target)
      const data = {
        id: parseInt(formData.get('id')),
        description: formData.get('description').trim(),
        amount: parseFloat(formData.get('amount')),
        type: formData.get('type'),
        date: formData.get('date'),
        categoryId: parseInt(formData.get('categoryId')),
        accountId: parseInt(formData.get('accountId')) || 1,
        accountingPercentage: parseInt(formData.get('accountingPercentage')) || 100,
      }

      if (!data.description || isNaN(data.amount) || data.amount <= 0) {
        alert('Si us plau, introdueix una descripció i un import vàlid')
        return
      }

      if (!data.categoryId) {
        alert('Si us plau, selecciona una categoria')
        return
      }

      try {
        const updatedTransaction = await financeService.updateTransaction(data.id, data)
        modal.remove()

        // Actualitzar la transacció a la llista local
        const index = this.transactions.findIndex(t => t.id === data.id)
        if (index !== -1) {
          this.transactions[index] = updatedTransaction
        }

        this.renderSortedTransactions()
      } catch (err) {
        console.error('Error actualitzant transacció:', err)
        alert('Error actualitzant la transacció: ' + err.message)
      }
    })
  }

  // ➕ Modal per nova transacció (refactoritzat per reutilitzar codi)
  openModal() {
    this.openTransactionModal(null)
  }

  // 🔄 Modal genèric (crear o editar)
  openTransactionModal(transaction = null) {
    const isEdit = transaction !== null
    const title = isEdit ? 'Editar Transacció' : 'Nova Transacció'

    if (this.categories.length === 0) {
      alert('No hi ha categories disponibles. Crea categories primer.')
      return
    }

    const categoryOptions = this.categories
      .map(c => {
        const selected = isEdit && c.id === transaction.categoryId ? 'selected' : ''
        return `<option value="${c.id}" ${selected}>${c.icon || '•'} ${c.name} (${c.type === 'income' ? 'Ingrés' : 'Despesa'})</option>`
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
            <label for="description">Descripció *</label>
            <input type="text" id="description" name="description" required 
                   value="${isEdit ? transaction.description || '' : ''}"
                   placeholder="Ex: Compra al supermercat">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="amount">Import total (€) *</label>
              <input type="number" id="amount" name="amount" step="0.01" min="0.01" required 
                     value="${isEdit ? transaction.amount : ''}"
                     placeholder="0.00">
            </div>

            <div class="form-group">
              <label for="date">Data *</label>
              <input type="date" id="date" name="date" 
                     value="${dateStr}" required>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="type">Tipus *</label>
              <select id="type" name="type" required>
                <option value="expense" ${isEdit && transaction.type === 'expense' ? 'selected' : ''}>Despesa</option>
                <option value="income" ${isEdit && transaction.type === 'income' ? 'selected' : ''}>Ingrés</option>
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

          <div class="form-group percentage-control">
            <label for="accountingPercentage">Percentatge a comptabilitzar</label>
            <div class="percentage-input-wrapper">
              <input type="range" id="percentage-slider" min="1" max="100" value="${percentage}" 
                     class="percentage-slider">
              <div class="percentage-field">
                <input type="number" id="accountingPercentage" name="accountingPercentage" 
                       min="1" max="100" value="${percentage}" class="percentage-number">
                <span class="percentage-symbol">%</span>
              </div>
            </div>
            <p class="percentage-hint">
              <span id="effective-amount-hint"></span>
            </p>
          </div>

          <input type="hidden" name="accountId" value="${isEdit ? transaction.accountId || 1 : 1}">

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
              Cancel·lar
            </button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Actualitzar' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    `

    document.body.appendChild(modal)

    // Sincronitzar slider i input numèric
    const slider = document.getElementById('percentage-slider')
    const numberInput = document.getElementById('accountingPercentage')
    const hint = document.getElementById('effective-amount-hint')
    const amountInput = document.getElementById('amount')

    const updateHint = () => {
      const pct = parseInt(slider.value)
      const amt = parseFloat(amountInput.value) || 0
      const effective = ((amt * pct) / 100).toFixed(2)
      hint.textContent = `S'${isEdit ? 'aplicarà' : 'afegirà'}: ${pct}% = ${this.formatCurrency(effective)}`
    }

    slider.addEventListener('input', () => {
      numberInput.value = slider.value
      updateHint()
    })

    numberInput.addEventListener('input', () => {
      let val = parseInt(numberInput.value) || 100
      val = Math.max(1, Math.min(100, val))
      slider.value = val
      updateHint()
    })

    amountInput.addEventListener('input', updateHint)
    updateHint()

    document.getElementById('description').focus()

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

      if (isEdit) {
        data.id = parseInt(formData.get('id'))
      }

      if (!data.description || isNaN(data.amount) || data.amount <= 0) {
        alert('Si us plau, introdueix una descripció i un import vàlid')
        return
      }

      if (!data.categoryId) {
        alert('Si us plau, selecciona una categoria')
        return
      }

      try {
        let result
        if (isEdit) {
          result = await financeService.updateTransaction(data.id, data)
          const index = this.transactions.findIndex(t => t.id === data.id)
          if (index !== -1) this.transactions[index] = result
        } else {
          result = await financeService.addTransaction(data)
          this.transactions.unshift(result)
        }

        modal.remove()
        this.renderSortedTransactions()
      } catch (err) {
        console.error(isEdit ? 'Error actualitzant transacció:' : 'Error creant transacció:', err)
        alert(`Error ${isEdit ? 'actualitzant' : 'guardant'} la transacció: ` + err.message)
      }
    })
  }

  // Mètode antic (per compatibilitat)
  openEditModal(transactionId) {
    const transaction = this.transactions.find(t => t.id == transactionId)
    if (!transaction) {
      alert('Transacció no trobada')
      return
    }
    this.openTransactionModal(transaction)
  }

  async deleteTransaction(id) {
    if (!confirm('Segur que vols eliminar aquesta transacció?')) return

    try {
      await financeService.deleteTransaction(id)
      this.transactions = this.transactions.filter(t => t.id !== id)
      this.renderSortedTransactions()
    } catch (err) {
      console.error('Error eliminant transacció:', err)
      alert('Error eliminant la transacció: ' + err.message)
    }
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('ca-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  getTotalEffectiveAmount(type = null) {
    return this.transactions.filter(t => type === null || t.type === type).reduce((sum, t) => sum + this.calculateEffectiveAmount(t), 0)
  }

  getTransactionsByPercentage(percentage) {
    return this.transactions.filter(t => (t.accountingPercentage || 100) === percentage)
  }
}
