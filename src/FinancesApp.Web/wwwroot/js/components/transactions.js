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

    // NOU: Estat per ocultar transaccions futures
    this.hideFutureTransactions = false

    // NOU: Carregar plantilles del localStorage o usar les per defecte
    const defaultTemplates = [
      { id: 'rent', label: '🏠 Lloguer', description: 'Lloguer {mes}', amount: 1176, type: 'expense', categoryName: 'Lloguer' },
      { id: 'loan', label: '🏦 Crèdit / Préstec', description: 'Quota crèdit 1 {mes}', amount: 101, type: 'expense', categoryName: 'Préstecs' },
      { id: 'internet', label: '🌐 Internet / Telèfon', description: 'Internet {mes}', amount: 73.5, type: 'expense', categoryName: 'Serveis' },
      { id: 'salary', label: '💼 Nòmina / Sou', description: 'Nòmina {mes}', amount: 2500, type: 'income', categoryName: 'Sou' },
      { id: 'loan', label: '🏦 Crèdit / Préstec', description: 'Quota crèdit 2 {mes}', amount: 101, type: 'expense', categoryName: 'Préstecs' },
      { id: 'loan', label: '🏦 Crèdit / Préstec', description: 'Quota Ikea {mes}', amount: 50, type: 'expense', categoryName: 'Préstecs' },
    ]
    this.templates = JSON.parse(localStorage.getItem('fm_templates')) || defaultTemplates
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
      <div class="transactions-page">
        <div class="page-header-compact">
          <div class="header-controls">
            <div class="control-group">
              <label for="category-filter">Categoria</label>
              <select id="category-filter">
                <option value="all">Totes</option>
                ${this.categories.map(c => `<option value="${c.id}">${c.icon || '•'} ${c.name}</option>`).join('')}
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

            <!-- NOU: Checkbox per ocultar futures -->
            <div class="control-group" style="display: flex; align-items: flex-end; padding-bottom: 4px;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.9em; user-select: none;">
                <input type="checkbox" id="hide-future-cb" ${this.hideFutureTransactions ? 'checked' : ''}>
                Ocultar futures
              </label>
            </div>

            <!-- NOU: Botons d'acció ràpida -->
            <div class="quick-actions" style="display: flex; gap: 8px;">
              <button class="btn btn-secondary" id="manage-templates-btn" title="Editar plantilles base">⚙️ Plantilles</button>
              <button class="btn btn-secondary" id="templates-btn" title="Usar plantilla periòdica">📋 Nova des de Plantilla</button>
              <button class="btn btn-primary" id="add-btn">+ Nova</button>
            </div>
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
    document.getElementById('templates-btn').addEventListener('click', () => this.openTemplatePicker())
    document.getElementById('manage-templates-btn').addEventListener('click', () => this.openTemplateManager())

    document.getElementById('hide-future-cb').addEventListener('change', e => {
      this.hideFutureTransactions = e.target.checked
      this.applyFilters()
    })

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

  // NOU: Gestor per editar les plantilles base
  openTemplateManager() {
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'

    const rowsHtml = this.templates
      .map(
        (t, index) => `
      <div style="display: grid; grid-template-columns: 1fr 1.5fr 0.8fr 1fr 0.5fr; gap: 8px; margin-bottom: 8px; align-items: center;">
        <input type="text" class="tmpl-label" data-idx="${index}" value="${t.label}" style="padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
        <input type="text" class="tmpl-desc" data-idx="${index}" value="${t.description}" style="padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
        <input type="number" class="tmpl-amount" data-idx="${index}" value="${t.amount}" step="0.01" style="padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
        <input type="text" class="tmpl-cat" data-idx="${index}" value="${t.categoryName}" style="padding: 6px; border: 1px solid #ccc; border-radius: 4px;" placeholder="Nom categoria">
        <button class="btn-delete-tmpl" data-idx="${index}" style="background: #ffebee; color: #c62828; border: none; padding: 6px; border-radius: 4px; cursor: pointer;">🗑️</button>
      </div>
    `
      )
      .join('')

    modal.innerHTML = `
      <div class="modal" style="max-width: 700px;">
        <div class="modal-header">
          <h3>Gestionar Plantilles Base</h3>
          <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div style="padding: 20px; max-height: 60vh; overflow-y: auto;">
          <div style="display: grid; grid-template-columns: 1fr 1.5fr 0.8fr 1fr 0.5fr; gap: 8px; margin-bottom: 12px; font-weight: bold; font-size: 0.85em; color: #666;">
            <span>Etiqueta</span>
            <span>Descripció ({mes})</span>
            <span>Import (€)</span>
            <span>Categoria</span>
            <span></span>
          </div>
          <div id="tmpl-list">${rowsHtml}</div>
          <button id="add-tmpl-btn" class="btn btn-secondary" style="margin-top: 10px; width: 100%;">+ Afegir nova plantilla</button>
        </div>
        <div class="modal-actions" style="padding: 0 20px 20px 20px;">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel·lar</button>
          <button type="button" class="btn btn-primary" id="save-templates-btn">Desar Canvis</button>
        </div>
      </div>
    `
    document.body.appendChild(modal)

    // Afegir nova plantilla buida
    document.getElementById('add-tmpl-btn').addEventListener('click', () => {
      this.templates.push({ id: 'custom_' + Date.now(), label: 'Nova', description: 'Concepte {mes}', amount: 0, type: 'expense', categoryName: '' })
      this.openTemplateManager() // Re-renderitzar
      modal.remove()
    })

    // Eliminar plantilla
    modal.querySelectorAll('.btn-delete-tmpl').forEach(btn => {
      btn.addEventListener('click', () => {
        this.templates.splice(parseInt(btn.dataset.idx), 1)
        this.openTemplateManager()
        modal.remove()
      })
    })

    // Desar canvis
    document.getElementById('save-templates-btn').addEventListener('click', () => {
      const updatedTemplates = this.templates.map((t, i) => ({
        ...t,
        label: modal.querySelector(`.tmpl-label[data-idx="${i}"]`).value,
        description: modal.querySelector(`.tmpl-desc[data-idx="${i}"]`).value,
        amount: parseFloat(modal.querySelector(`.tmpl-amount[data-idx="${i}"]`).value) || 0,
        categoryName: modal.querySelector(`.tmpl-cat[data-idx="${i}"]`).value,
      }))

      this.templates = updatedTemplates
      localStorage.setItem('fm_templates', JSON.stringify(this.templates))
      modal.remove()
      alert('Plantilles desades correctament!')
    })
  }

  openTemplatePicker() {
    if (this.categories.length === 0) {
      alert('Carrega primer les categories.')
      return
    }

    const currentMonth = this.getCurrentMonthName()
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'

    const itemsHtml = this.templates
      .map((t, index) => {
        const desc = t.description.replace('{mes}', currentMonth)
        return `
        <div class="template-item" data-index="${index}" style="
          padding: 14px; border: 1px solid #e0e0e0; border-radius: 8px; cursor: pointer; 
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; 
          transition: all 0.2s; background: #fff;
        ">
          <div>
            <div style="font-weight: 600; font-size: 1.05em;">${t.label}</div>
            <div style="font-size: 0.85em; color: #666; margin-top: 2px;">${desc}</div>
          </div>
          <div style="font-weight: bold; font-size: 1.1em; color: ${t.type === 'expense' ? '#e74c3c' : '#2ecc71'}">
            ${t.type === 'expense' ? '-' : '+'}${this.formatCurrency(t.amount)}
          </div>
        </div>
      `
      })
      .join('')

    modal.innerHTML = `
      <div class="modal" style="max-width: 500px;">
        <div class="modal-header">
          <h3>Selecciona una plantilla</h3>
          <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div style="padding: 20px; max-height: 60vh; overflow-y: auto;">
          ${itemsHtml}
        </div>
        <div style="padding: 0 20px 20px 20px; text-align: center; font-size: 0.85em; color: #666;">
          💡 En seleccionar-la, podràs modificar l'import o la data abans de guardar.
        </div>
      </div>
    `

    document.body.appendChild(modal)

    modal.querySelectorAll('.template-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        item.style.background = '#f8f9fa'
        item.style.borderColor = '#007bff'
      })
      item.addEventListener('mouseleave', () => {
        item.style.background = '#fff'
        item.style.borderColor = '#e0e0e0'
      })
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index)
        modal.remove()
        this.openTransactionModal(null, this.templates[index])
      })
    })
  }

  getCurrentMonthName() {
    const months = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre']
    return months[new Date().getMonth()]
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
        <div class="error-state"><p>Error carregant les transaccions</p><p class="error-detail">${err.message}</p></div>
      `
    }
  }

  showEmptyState() {
    document.getElementById('transactions-list').innerHTML = `
      <div class="empty-state-full">
        <div class="empty-icon">📭</div>
        <p>No hi ha transaccions</p>
        <p class="hint">Fes clic a "+ Nova" o "📋 Plantilla" per començar</p>
      </div>
    `
  }

  applyFilters() {
    let filtered = this.selectedCategory === 'all' ? [...this.transactions] : this.transactions.filter(t => t.categoryId === parseInt(this.selectedCategory))

    // NOU: Filtrar transaccions futures si el checkbox està activat
    if (this.hideFutureTransactions) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      filtered = filtered.filter(t => {
        const txDate = new Date(t.date)
        txDate.setHours(0, 0, 0, 0)
        return txDate <= today
      })
    }

    this.filteredTransactions = filtered
    this.updateSummary()
    this.renderSortedTransactions()
  }

  // ... (updateSummary, calculateEffectiveAmount, sortTransactions es mantenen igual) ...
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
      summaryEl.innerHTML = `<span class="summary-pill" style="border-color: ${category?.color || '#ccc'}"><span class="category-dot" style="background: ${category?.color || '#ccc'}"></span> ${category?.icon || '•'} ${category?.name}: ${count} transaccions | <strong class="${total >= 0 ? 'income' : 'expense'}">${total >= 0 ? '+' : ''}${this.formatCurrency(total)}</strong></span>`
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
      if (this.sortField === 'date') comparison = new Date(a.date) - new Date(b.date)
      else if (this.sortField === 'amount') comparison = this.calculateEffectiveAmount(a) - this.calculateEffectiveAmount(b)
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
          <button class="btn btn-secondary" onclick="document.getElementById('category-filter').value='all'; document.getElementById('category-filter').dispatchEvent(new Event('change'))">Mostrar totes</button>
        </div>
      `
      return
    }

    listContainer.innerHTML = sortedTransactions.map(t => this.renderTransactionItem(t)).join('')

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

  openTransactionModal(transaction = null, template = null) {
    const isEdit = transaction !== null
    const isTemplate = template !== null && !isEdit
    const title = isEdit ? 'Editar Transacció' : isTemplate ? 'Nova Transacció (Plantilla)' : 'Nova Transacció'

    if (this.categories.length === 0) {
      alert('No hi ha categories disponibles.')
      return
    }

    const getCategoryOptions = (type, selectedId = null) => {
      const filteredCategories = this.categories.filter(c => c.type === type)
      return filteredCategories
        .map(c => {
          const selected = selectedId && c.id === selectedId ? 'selected' : ''
          return `<option value="${c.id}" ${selected}>${c.icon || '•'} ${c.name}</option>`
        })
        .join('')
    }

    const percentage = isEdit ? transaction.accountingPercentage || 100 : 100
    const dateStr = isEdit ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]

    let initialType = 'expense',
      initialCategoryId = '',
      initialDescription = '',
      initialAmount = ''

    if (isEdit) {
      initialType = transaction.type
      initialCategoryId = transaction.categoryId
      initialDescription = transaction.description || ''
      initialAmount = transaction.amount
    } else if (isTemplate) {
      initialType = template.type
      initialDescription = template.description.replace('{mes}', this.getCurrentMonthName())
      initialAmount = template.amount
      const matchedCategory = this.categories.find(c => c.name.toLowerCase() === template.categoryName.toLowerCase())
      initialCategoryId = matchedCategory ? matchedCategory.id : ''
    }

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
          <input type="text" name="description" required value="${initialDescription}" placeholder="Ex: Compra al supermercat">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Import (€) *</label>
            <input type="number" name="amount" step="0.01" min="0.01" required value="${initialAmount}">
          </div>
          <div class="form-group">
            <label>Data *</label>
            <input type="date" name="date" required value="${dateStr}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Tipus *</label>
            <select name="type" id="type-select" required>
              <option value="expense" ${initialType === 'expense' ? 'selected' : ''}>Despesa</option>
              <option value="income" ${initialType === 'income' ? 'selected' : ''}>Ingrés</option>
            </select>
          </div>
          <div class="form-group">
            <label>Categoria *</label>
            <select name="categoryId" id="category-select" required>
              <option value="">Selecciona...</option>
              ${getCategoryOptions(initialType, initialCategoryId)}
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
    </div>`

    document.body.appendChild(modal)

    const typeSelect = document.getElementById('type-select')
    const categorySelect = document.getElementById('category-select')
    typeSelect.addEventListener('change', e => {
      categorySelect.innerHTML = `<option value="">Selecciona...</option>${getCategoryOptions(e.target.value, categorySelect.value)}`
    })

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
        if (isEdit) await financeService.updateTransaction(data.id, data)
        else await financeService.addTransaction(data)
        modal.remove()
        await this.refreshData()
      } catch (err) {
        alert('Error: ' + err.message)
      }
    })
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  renderTransactionItem(t) {
    const category = this.categories.find(c => c.id === t.categoryId) || {}
    const isIncome = t.type === 'income'
    const percentage = t.accountingPercentage || 100
    const effectiveAmount = this.calculateEffectiveAmount(t)
    const hasPartialAccounting = percentage !== 100

    // NOU: Detectar si és una transacció futura
    const txDate = new Date(t.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    txDate.setHours(0, 0, 0, 0)
    const isFuture = txDate > today

    const dateStr = new Date(t.date).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })

    // NOU: Estil en línia per al color gris fluixet si és futur
    const futureStyle = isFuture ? 'background-color: #f8f9fa; opacity: 0.75; border-left: 3px solid #adb5bd;' : ''

    return `
    <div class="transaction-item-compact ${hasPartialAccounting ? 'partial' : ''}" data-id="${t.id}" style="${futureStyle}">
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
            ${isFuture ? `<span class="tx-badge" style="background:#e9ecef; color:#495057; margin-left: 4px;">📅 Futur</span>` : ''}
          </div>
        </div>
      </div>
      <div class="tx-actions">
        <button class="btn-action btn-edit" data-id="${t.id}" title="Editar transacció">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
        <button class="btn-action btn-delete" data-id="${t.id}" title="Eliminar transacció">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
    </div>`
  }
}
