// components/CategorySummary.js
import { financeService } from '../services/financeService.js'
import { categoryService } from '../services/categoryService.js'

export class CategorySummary {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    this.categories = []
    this.transactions = []
    this.selectedCategory = null
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
          <h2>📊 Resum per Categoria</h2>
        </div>

        <div class="category-selector-section">
          <div class="control-group">
            <label for="summary-category-select">Categoria:</label>
            <select id="summary-category-select" class="category-select-large">
              <option value="">-- Selecciona --</option>
              ${this.categories
                .map(
                  c => `
                <option value="${c.id}">${c.icon || '•'} ${c.name}</option>
              `
                )
                .join('')}
            </select>
          </div>
        </div>

        <div id="category-summary-content" class="summary-content">
          <div class="empty-state-full">
            <div class="empty-icon">📊</div>
            <p>Selecciona una categoria per veure el resum</p>
          </div>
        </div>
      </div>
    `

    // Event listener per al selector de categoria
    document.getElementById('summary-category-select').addEventListener('change', e => {
      const categoryId = e.target.value
      if (categoryId) {
        this.selectedCategory = parseInt(categoryId)
        this.showCategorySummary(this.selectedCategory)
      } else {
        this.selectedCategory = null
        this.showEmptySummary()
      }
    })

    await this.loadTransactions()
  }

  async loadTransactions() {
    try {
      this.transactions = await financeService.getTransactions()

      // Si ja hi ha una categoria seleccionada, actualitzar la vista
      if (this.selectedCategory) {
        this.showCategorySummary(this.selectedCategory)
      }
    } catch (err) {
      console.error('Error carregant transaccions:', err)
      document.getElementById('category-summary-content').innerHTML = `
        <div class="error-state">
          <p>Error carregant les transaccions</p>
          <p class="error-detail">${err.message}</p>
        </div>
      `
    }
  }

  showEmptySummary() {
    document.getElementById('category-summary-content').innerHTML = `
      <div class="empty-state-full">
        <div class="empty-icon">📊</div>
        <p>Selecciona una categoria per veure el resum</p>
      </div>
    `
  }

  showCategorySummary(categoryId) {
    const category = this.categories.find(c => c.id === categoryId)
    if (!category) {
      this.showEmptySummary()
      return
    }

    // Filtrar transaccions d'aquesta categoria
    const categoryTransactions = this.transactions.filter(t => t.categoryId === categoryId)

    if (categoryTransactions.length === 0) {
      document.getElementById('category-summary-content').innerHTML = `
        <div class="empty-state-full">
          <div class="empty-icon">📭</div>
          <p>Sense transaccions a <strong>${category.name}</strong></p>
          <p class="hint">Afegeix transaccions per veure el resum</p>
        </div>
      `
      return
    }

    // Ordenar per data (més recent primer)
    const sortedTransactions = [...categoryTransactions].sort((a, b) => new Date(b.date) - new Date(a.date))

    // Calcular estadístiques
    const totalTransactions = sortedTransactions.length

    // Calcular import total (tenint en compte ingressos i despeses)
    const totalAmount = sortedTransactions.reduce((sum, t) => {
      const effective = this.calculateEffectiveAmount(t)
      return t.type === 'income' ? sum + effective : sum - effective
    }, 0)

    // Mitjana dels imports (valor absolut)
    const averageAmount =
      sortedTransactions.reduce((sum, t) => {
        return sum + Math.abs(this.calculateEffectiveAmount(t))
      }, 0) / totalTransactions

    // Calcular totals per tipus
    const totalIncome = sortedTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + this.calculateEffectiveAmount(t), 0)

    const totalExpense = sortedTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + this.calculateEffectiveAmount(t), 0)

    // Generar HTML de les transaccions
    const transactionsHtml = sortedTransactions.map(t => this.renderTransactionRow(t)).join('')

    document.getElementById('category-summary-content').innerHTML = `
      <div class="category-details">
        <!-- FILA 1: Capçalera compacta -->
        <div class="category-header" style="border-left-color: ${category.color || '#ccc'}">
          <div class="category-title">
            <span class="category-icon-large" style="background: ${category.color || '#ccc'}">
              ${category.icon || '💰'}
            </span>
            <div class="category-info">
              <h3>${category.name}</h3>
              <span class="category-type">${category.type === 'income' ? '💰 Ingrés' : '💸 Despesa'}</span>
            </div>
          </div>
        </div>

        <!-- FILA 2: Estadístiques en una sola línia -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Transaccions</div>
            <div class="stat-value">${totalTransactions}</div>
          </div>
          
          <div class="stat-card ${totalAmount >= 0 ? 'positive' : 'negative'}">
            <div class="stat-label">Balanç Total</div>
            <div class="stat-value">${totalAmount >= 0 ? '+' : ''}${this.formatCurrency(totalAmount)}</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-label">Mitjana</div>
            <div class="stat-value">${this.formatCurrency(averageAmount)}</div>
          </div>
        </div>

        <!-- FILA 3: Desglossament ingresos/despeses -->
        <div class="type-breakdown">
          <div class="type-stat income">
            <span class="type-label">💰 Ingressos</span>
            <span class="type-value">+${this.formatCurrency(totalIncome)}</span>
          </div>
          <div class="type-stat expense">
            <span class="type-label">💸 Despeses</span>
            <span class="type-value">-${this.formatCurrency(totalExpense)}</span>
          </div>
        </div>

        <!-- FILA 4: Llista de transaccions (ocupa l'espai restant) -->
        <div class="transactions-list-section">
          <div class="section-header">
            <h4>📋 Transaccions</h4>
            <span class="transaction-count">${totalTransactions}</span>
          </div>
          <div class="transactions-table-header">
            <span class="col-date">Data</span>
            <span class="col-desc">Descripció</span>
            <span class="col-amount">Import</span>
          </div>
          <div class="transactions-list">
            ${transactionsHtml}
          </div>
        </div>
      </div>
    `
  }

  renderTransactionRow(t) {
    const date = new Date(t.date)
    const dateStr = date.toLocaleDateString('ca-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    const effectiveAmount = this.calculateEffectiveAmount(t)
    const isIncome = t.type === 'income'
    const percentage = t.accountingPercentage || 100
    const hasPartial = percentage !== 100

    return `
      <div class="summary-transaction-row">
        <span class="tx-date">${dateStr}</span>
        <span class="tx-desc" title="${t.description || 'Sense descripció'}">${t.description || 'Sense descripció'}</span>
        <span class="tx-amount ${isIncome ? 'income' : 'expense'}">
          ${isIncome ? '+' : '-'}${this.formatCurrency(Math.abs(effectiveAmount))}
          ${hasPartial ? `<span class="tx-partial-badge">${percentage}%</span>` : ''}
        </span>
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
    if (this.selectedCategory) {
      this.showCategorySummary(this.selectedCategory)
    }
  }
}
