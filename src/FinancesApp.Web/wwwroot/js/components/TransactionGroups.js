import { financeService } from '../services/financeService.js'
import { categoryService } from '../services/categoryService.js'

export class TransactionGroups {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    this.categories = []
    this.transactions = []
    this.groupBy = 'month'
    this.minAmount = 100
    this.collapsedGroups = new Set()
    this.allCollapsed = false
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
      <div class="transactions-groups-page">
        <div class="page-header-compact">
          <div class="header-controls">
            <div class="control-group">
              <label>Agrupar per</label>
              <div class="group-tabs">
                <button class="tab-btn active" data-group="month">
                  Mes
                </button>
                <button class="tab-btn" data-group="type">
                  Tipus
                </button>
                <button class="tab-btn" data-group="amount">
                  Import
                </button>
                <button class="tab-btn" data-group="category">
                  Categoria
                </button>
              </div>
            </div>
            
            <!-- BOTÓ COL·LAPSTAR TOT -->
            <button class="btn btn-secondary" id="collapse-all-btn" title="Col·lapsar/Expandir tot">
              <span id="collapse-icon">📂</span> <span id="collapse-text">Col·lapsar tot</span>
            </button>
          </div>
        </div>

        <div id="amount-filter-container" class="amount-filter" style="display: none;">
          <label>Mostrar transaccions majors de:</label>
          <div class="amount-input-group">
            <input type="number" id="min-amount" value="${this.minAmount}" min="1" step="10">
            <span>€</span>
            <button class="btn btn-primary" id="apply-amount">Aplicar</button>
          </div>
        </div>

        <div id="groups-container" class="groups-container">
          <p class="loading">Carregant transaccions...</p>
        </div>
      </div>
    `

    // Event listeners per les pestanyes
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        this.container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        this.groupBy = btn.dataset.group

        const amountFilter = document.getElementById('amount-filter-container')
        if (this.groupBy === 'amount') {
          amountFilter.style.display = 'flex'
        } else {
          amountFilter.style.display = 'none'
        }

        this.renderGroups()
      })
    })

    // BOTÓ COL·LAPSTAR TOT - Event listener
    const collapseBtn = document.getElementById('collapse-all-btn')
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => this.toggleAllGroups())
    }

    // Event listeners per aplicar filtre d'import
    const applyAmountBtn = document.getElementById('apply-amount')
    if (applyAmountBtn) {
      applyAmountBtn.addEventListener('click', () => {
        const input = document.getElementById('min-amount')
        this.minAmount = parseFloat(input.value) || 100
        this.renderGroups()
      })
    }

    const amountInput = document.getElementById('min-amount')
    if (amountInput) {
      amountInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
          this.minAmount = parseFloat(amountInput.value) || 100
          this.renderGroups()
        }
      })
    }

    await this.loadTransactions()
  }

  // NOU MÈTODE: Col·lapsar/Expandir tot
  toggleAllGroups() {
    const groups = document.querySelectorAll('.transaction-group')
    const newCollapsedState = !this.allCollapsed

    groups.forEach(groupEl => {
      const groupKey = groupEl.dataset.key
      const content = groupEl.querySelector('.group-content')
      const icon = groupEl.querySelector('.collapse-icon')

      if (newCollapsedState) {
        // Col·lapsar
        this.collapsedGroups.add(groupKey)
        if (content) content.style.display = 'none'
        if (icon) icon.textContent = '▶'
        groupEl.classList.add('collapsed')
      } else {
        // Expandir
        this.collapsedGroups.delete(groupKey)
        if (content) content.style.display = 'block'
        if (icon) icon.textContent = '▼'
        groupEl.classList.remove('collapsed')
      }
    })

    this.allCollapsed = newCollapsedState
    this.updateCollapseButton()
  }

  // NOU MÈTODE: Actualitzar text i icona del botó
  updateCollapseButton() {
    const btnIcon = document.getElementById('collapse-icon')
    const btnText = document.getElementById('collapse-text')

    if (btnIcon && btnText) {
      if (this.allCollapsed) {
        btnIcon.textContent = '📁'
        btnText.textContent = 'Expandir tot'
      } else {
        btnIcon.textContent = '📂'
        btnText.textContent = 'Col·lapsar tot'
      }
    }
  }

  async loadTransactions() {
    try {
      this.transactions = await financeService.getTransactions()

      if (!this.transactions || this.transactions.length === 0) {
        this.showEmptyState()
        return
      }

      this.renderGroups()
    } catch (err) {
      console.error('Error carregant transaccions:', err)
      document.getElementById('groups-container').innerHTML = `
        <div class="error-state">
          <p>Error carregant les transaccions</p>
          <p class="error-detail">${err.message}</p>
        </div>
      `
    }
  }

  showEmptyState() {
    document.getElementById('groups-container').innerHTML = `
      <div class="empty-state-full">
        <div class="empty-icon">📭</div>
        <p>No hi ha transaccions per agrupar</p>
        <p class="hint">Afegeix transaccions primer</p>
      </div>
    `
  }

  groupTransactions() {
    const groups = {}

    switch (this.groupBy) {
      case 'month':
        this.transactions.forEach(t => {
          const date = new Date(t.date)
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          const label = date.toLocaleDateString('ca-ES', { year: 'numeric', month: 'long' })
          if (!groups[key]) groups[key] = { label: label, transactions: [], key: key }
          groups[key].transactions.push(t)
        })
        break

      case 'type':
        const typeLabels = { income: '💰 Ingressos', expense: '💸 Despeses' }
        this.transactions.forEach(t => {
          const key = t.type
          if (!groups[key]) groups[key] = { label: typeLabels[key], transactions: [], key: key }
          groups[key].transactions.push(t)
        })
        break

      case 'amount':
        const filtered = this.transactions.filter(t => t.amount >= this.minAmount)
        const ranges = [
          { min: this.minAmount, max: this.minAmount * 2, label: `${this.minAmount}€ - ${this.minAmount * 2}€` },
          { min: this.minAmount * 2, max: this.minAmount * 5, label: `${this.minAmount * 2}€ - ${this.minAmount * 5}€` },
          { min: this.minAmount * 5, max: Infinity, label: `Més de ${this.minAmount * 5}€` },
        ]

        ranges.forEach(range => {
          const key = `${range.min}-${range.max}`
          groups[key] = { label: range.label, transactions: [], key: key }
        })

        filtered.forEach(t => {
          const range = ranges.find(r => t.amount >= r.min && t.amount < r.max)
          if (range) {
            const key = `${range.min}-${range.max}`
            groups[key].transactions.push(t)
          }
        })

        Object.keys(groups).forEach(key => {
          if (groups[key].transactions.length === 0) delete groups[key]
        })
        break

      case 'category':
        this.transactions.forEach(t => {
          const category = this.categories.find(c => c.id === t.categoryId)
          const key = t.categoryId || 'none'
          const label = category ? `${category.icon || '•'} ${category.name}` : '❓ Sense categoria'
          if (!groups[key]) groups[key] = { label: label, transactions: [], key: key, color: category?.color }
          groups[key].transactions.push(t)
        })
        break
    }

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (this.groupBy === 'month') return b.localeCompare(a)
      if (this.groupBy === 'amount') return parseFloat(a.split('-')[0]) - parseFloat(b.split('-')[0])
      return a.localeCompare(b)
    })

    return sortedKeys.map(key => groups[key])
  }

  renderGroups() {
    const container = document.getElementById('groups-container')
    const groups = this.groupTransactions()

    if (groups.length === 0) {
      container.innerHTML = `
        <div class="empty-state-full">
          <div class="empty-icon">🔍</div>
          <p>Cap grup trobat amb aquest criteri</p>
        </div>
      `
      return
    }

    container.innerHTML = groups.map(group => this.renderGroup(group)).join('')

    // Restaurar l'estat de col·lapsat global si està actiu
    if (this.allCollapsed) {
      document.querySelectorAll('.transaction-group').forEach(groupEl => {
        const content = groupEl.querySelector('.group-content')
        const icon = groupEl.querySelector('.collapse-icon')
        if (content) content.style.display = 'none'
        if (icon) icon.textContent = '▶'
        groupEl.classList.add('collapsed')
      })
    }

    container.querySelectorAll('.group-header').forEach(header => {
      header.addEventListener('click', e => {
        if (e.target.closest('.group-actions')) return
        const groupEl = header.closest('.transaction-group')
        const groupKey = groupEl.dataset.key
        const content = groupEl.querySelector('.group-content')
        const icon = header.querySelector('.collapse-icon')

        if (this.collapsedGroups.has(groupKey)) {
          this.collapsedGroups.delete(groupKey)
          content.style.display = 'block'
          icon.textContent = '▼'
          groupEl.classList.remove('collapsed')
        } else {
          this.collapsedGroups.add(groupKey)
          content.style.display = 'none'
          icon.textContent = '▶'
          groupEl.classList.add('collapsed')
        }

        // Actualitzar l'estat global si tots estan col·lapsats o expandits
        this.updateGlobalCollapseState()
      })
    })

    container.querySelectorAll('.transaction-item-mini').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('.btn-delete') || e.target.closest('.btn-edit')) return
        console.log('Detall de transacció:', item.dataset.id)
      })
    })
  }

  // NOU MÈTODE: Actualitzar l'estat del botó global segons l'estat dels grups
  updateGlobalCollapseState() {
    const totalGroups = document.querySelectorAll('.transaction-group').length
    const collapsedGroups = this.collapsedGroups.size

    if (collapsedGroups === totalGroups) {
      this.allCollapsed = true
    } else if (collapsedGroups === 0) {
      this.allCollapsed = false
    }
    // Si està mig camí, mantenim l'estat anterior però actualitzem el botó
    this.updateCollapseButton()
  }

  renderGroup(group) {
    const isCollapsed = this.collapsedGroups.has(group.key) || this.allCollapsed
    const totalAmount = group.transactions.reduce((sum, t) => {
      const effective = this.calculateEffectiveAmount(t)
      return t.type === 'income' ? sum + effective : sum - effective
    }, 0)
    const income = group.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + this.calculateEffectiveAmount(t), 0)
    const expense = group.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + this.calculateEffectiveAmount(t), 0)

    const borderLeftStyle = group.color ? `border-left-color: ${group.color};` : ''

    return `
      <div class="transaction-group ${isCollapsed ? 'collapsed' : ''}" data-key="${group.key}">
        <div class="group-header" style="${borderLeftStyle}">
          <div class="group-info">
            <span class="collapse-icon">${isCollapsed ? '▶' : '▼'}</span>
            <span class="group-label">${group.label}</span>
            <span class="group-count">${group.transactions.length} transaccions</span>
          </div>
          <div class="group-stats">
            ${income > 0 ? `<span class="stat-income">+${this.formatCurrency(income)}</span>` : ''}
            ${expense > 0 ? `<span class="stat-expense">-${this.formatCurrency(expense)}</span>` : ''}
            <span class="stat-total ${totalAmount >= 0 ? 'positive' : 'negative'}">
              ${totalAmount >= 0 ? '+' : ''}${this.formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
        <div class="group-content" style="display: ${isCollapsed ? 'none' : 'block'}">
          ${group.transactions.map(t => this.renderTransactionItem(t)).join('')}
        </div>
      </div>
    `
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
    })

    return `
      <div class="transaction-item-mini ${hasPartialAccounting ? 'partial' : ''}" data-id="${t.id}">
        <div class="tx-mini-content">
          <span class="tx-mini-date">${dateStr}</span>
          <span class="tx-mini-desc">${t.description || 'Sense descripció'}</span>
          <span class="tx-mini-category" style="color: ${category.color || '#666'}">
            ${category.icon || '•'}
          </span>
        </div>
        <div class="tx-mini-amount">
          <span class="${isIncome ? 'income' : 'expense'}">
            ${isIncome ? '+' : '-'}${this.formatCurrency(Math.abs(effectiveAmount))}
          </span>
          ${hasPartialAccounting ? `<small class="tx-mini-original">(${percentage}%)</small>` : ''}
        </div>
      </div>
    `
  }

  calculateEffectiveAmount(transaction) {
    const percentage = transaction.accountingPercentage || 100
    return transaction.amount * (percentage / 100)
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('ca-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  async refreshData() {
    this.transactions = await financeService.getTransactions()
    this.renderGroups()
  }
}
