// dashboard.js
export class Dashboard {
  constructor(containerId, financeServiceInstance = null) {
    this.container = document.getElementById(containerId)

    if (!this.container) {
      throw new Error(`No s'ha trobat el contenidor amb id="${containerId}"`)
    }

    this.financeService = financeServiceInstance || (typeof financeService !== 'undefined' ? financeService : null)
    this.currentDate = new Date()
    this.chart = null
    this.transactions = []
    this.selectedDay = null

    console.log('Dashboard inicialitzat:', {
      container: this.container,
      financeService: this.financeService,
    })
  }

  async render() {
    try {
      if (!this.financeService) {
        throw new Error('financeService no está disponible')
      }

      console.log('Iniciant render...')

      const year = this.currentDate.getFullYear()
      const month = this.currentDate.getMonth() + 1

      console.log(`Sol·licitant dades per ${year}-${month}`)

      // Obtenir transaccions del mes
      this.transactions = await this.getTransactions(year, month)
      console.log('Transaccions rebudes:', this.transactions)

      // ✅ Recalcular summary amb percentatges aplicats
      const summary = this.calculateSummaryWithPercentages(this.transactions)
      console.log('Summary calculat amb percentatges:', summary)

      const dailyData = this.calculateDailyData(this.transactions)
      console.log('DailyData calculat:', dailyData)

      const html = this.generateHTML(summary, dailyData)
      console.log('HTML generat, inserint al DOM...')

      this.container.innerHTML = html
      console.log('HTML inserit')

      this.attachCalendarEvents()
      this.renderChart(summary)

      console.log('Render completat')
    } catch (error) {
      console.error('Error renderitzant dashboard:', error)
      this.container.innerHTML = `
        <div class="card error-card">
          <h3>❌ Error</h3>
          <p>${error.message}</p>
          <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${error.stack}</pre>
        </div>
      `
    }
  }

  // ✅ NOU: Calcular summary tenint en compte els percentatges de comptabilització
  calculateSummaryWithPercentages(transactions) {
    let totalIncome = 0
    let totalExpenses = 0

    if (!Array.isArray(transactions)) {
      console.warn('Transactions no és un array:', transactions)
      return { totalIncome: 0, totalExpenses: 0, balance: 0 }
    }

    transactions.forEach(t => {
      const percentage = t.accountingPercentage || 100
      const effectiveAmount = (Number(t.amount) || 0) * (percentage / 100)

      if (t.type === 'income') {
        totalIncome += effectiveAmount
      } else if (t.type === 'expense') {
        totalExpenses += effectiveAmount
      }
    })

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
    }
  }

  generateHTML(summary, dailyData) {
    const isHidden = localStorage.getItem('dashboardSummaryHidden') === 'true'
    const isBlurred = localStorage.getItem('dashboardSummaryBlurred') !== 'false'

    // Si està borros, amaga els imports reals
    const formatAmount = (amount, className) => {
      if (isBlurred) {
        return `<div class="amount ${className}">•••••</div>`
      }
      return `<div class="amount ${className}">${this.formatCurrency(amount)}</div>`
    }

    return `
    <!-- Controls -->
    <div class="summary-controls" style="display: flex; gap: 10px; margin-bottom: 12px; align-items: center; flex-wrap: wrap;">
      <label class="toggle-control">
        <input type="checkbox" id="toggle-visibility" ${isHidden ? '' : 'checked'}>
        <span class="toggle-label">👁️ Mostrar resum</span>
      </label>
      <label class="toggle-control">
        <input type="checkbox" id="toggle-blur" ${isBlurred ? '' : 'checked'}>
        <span class="toggle-label">🔒 Desenfocar</span>
      </label>
    </div>

    <div class="dashboard-grid ${isBlurred ? 'blurred' : ''}" 
         id="summary-section" 
         ${isHidden ? 'style="display:none"' : ''}>
      <div class="card summary-card">
        <h3>Balanç</h3>
        ${formatAmount(summary.balance, summary.balance >= 0 ? 'positive' : 'negative')}
      </div>
      <div class="card summary-card">
        <h3>Ingressos</h3>
        ${formatAmount(summary.totalIncome, 'positive')}
      </div>
      <div class="card summary-card">
        <h3>Despeses</h3>
        ${formatAmount(summary.totalExpenses, 'negative')}
      </div>
    </div>

    <div class="dashboard-content">
      <div class="card calendar-card">
        <div class="calendar-header">
          <button id="prev-month" class="nav-btn">‹</button>
          <h3 id="current-month">${this.getMonthYearString()}</h3>
          <button id="next-month" class="nav-btn">›</button>
        </div>
        <div class="calendar-grid" id="calendar">
          ${this.generateCalendarHTML(dailyData)}
        </div>
      </div>

     <div class="card transactions-card" id="transactions-panel">
        <div class="transactions-panel-header" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 15px;">
          <h3 id="selected-date-title">Transaccions del mes</h3>
          <button id="close-transactions" class="btn-close-panel" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; width: 24px; height: 24px; text-align: center; line-height: 1; font-weight: bold;">×</button>
        </div>
        <div id="transactions-list" class="transactions-list" style="max-height: 550px; overflow-y: auto; padding: 10px;">
          ${this.renderTransactionsList(this.transactions)}
        </div>
      </div>
    </div>

    <div class="card chart-card">
      <canvas id="chart"></canvas>
    </div>
  `
  }

  async getTransactions(year, month) {
    try {
      if (!this.financeService?.getTransactionsByMonth) {
        console.warn('getTransactionsByMonth no disponible, provant getTransactions...')
        const allTransactions = await this.financeService.getTransactions()
        return allTransactions.filter(t => {
          const date = new Date(t.date)
          return date.getFullYear() === year && date.getMonth() + 1 === month
        })
      }

      return await this.financeService.getTransactionsByMonth(year, month)
    } catch (error) {
      console.error('Error obtenint transaccions:', error)
      return []
    }
  }

  calculateDailyData(transactions) {
    const dailyData = {}

    if (!Array.isArray(transactions)) {
      console.warn('Les transaccions no són un array:', transactions)
      return {}
    }

    transactions.forEach((t, index) => {
      try {
        const date = new Date(t.date)
        if (isNaN(date.getTime())) {
          console.warn(`Data invàlida a transacció ${index}:`, t)
          return
        }

        const day = date.getDate()

        if (!dailyData[day]) {
          dailyData[day] = { income: 0, expense: 0, transactions: [] }
        }

        // ✅ Aplicar percentatge de comptabilització
        const percentage = t.accountingPercentage || 100
        const effectiveAmount = (Number(t.amount) || 0) * (percentage / 100)

        if (t.type === 'income') {
          dailyData[day].income += effectiveAmount
        } else if (t.type === 'expense') {
          dailyData[day].expense += effectiveAmount
        }

        dailyData[day].transactions.push({
          ...t,
          effectiveAmount,
        })
      } catch (err) {
        console.error(`Error processant transacció ${index}:`, t, err)
      }
    })

    return dailyData
  }

  getMonthYearString() {
    const mesos = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre']
    return `${mesos[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`
  }

  generateCalendarHTML(dailyData) {
    const year = this.currentDate.getFullYear()
    const month = this.currentDate.getMonth()

    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date()

    const startOffset = firstDay === 0 ? 6 : firstDay - 1
    const weekDays = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg']

    let html = '<div class="weekdays-header">'
    weekDays.forEach(day => {
      html += `<div class="weekday">${day}</div>`
    })
    html += '</div><div class="days-grid">'

    for (let i = 0; i < startOffset; i++) {
      html += '<div class="day-cell empty"></div>'
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
      const isSelected = this.selectedDay === day

      const data = dailyData[day] || { income: 0, expense: 0, transactions: [] }
      const hasIncome = data.income > 0
      const hasExpense = data.expense > 0
      const hasTransactions = data.transactions.length > 0

      html += `
        <div class="day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasTransactions ? 'has-transactions' : ''}" 
             data-day="${day}">
          <div class="day-number">${day}</div>
          <div class="day-indicators">
            ${hasIncome ? `<div class="indicator income" title="Ingressos: ${this.formatCurrency(data.income)}"></div>` : ''}
            ${hasExpense ? `<div class="indicator expense" title="Despeses: ${this.formatCurrency(data.expense)}"></div>` : ''}
          </div>
          <div class="day-amounts">
            ${hasIncome ? `<div class="day-income">+${this.formatCurrency(data.income, true)}</div>` : ''}
            ${hasExpense ? `<div class="day-expense">-${this.formatCurrency(data.expense, true)}</div>` : ''}
          </div>
        </div>
      `
    }

    html += '</div>'
    return html
  }

  renderTransactionsList(transactions, day = null) {
    let filteredTransactions = transactions

    if (day !== null) {
      filteredTransactions = transactions.filter(t => {
        const date = new Date(t.date)
        return date.getDate() === day
      })
    }

    if (filteredTransactions.length === 0) {
      return `
        <div class="empty-state">
          <p>${day ? 'No hi ha transaccions aquest dia' : 'No hi ha transaccions aquest mes'}</p>
        </div>
      `
    }

    const sorted = [...filteredTransactions].sort((a, b) => new Date(b.date) - new Date(a.date))

    return sorted
      .map(t => {
        const isIncome = t.type === 'income'
        const date = new Date(t.date)
        const dateStr = date.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })

        // ✅ Calcular import efectiu
        const percentage = t.accountingPercentage || 100
        const effectiveAmount = (Number(t.amount) || 0) * (percentage / 100)
        const hasPartialAccounting = percentage !== 100

        return `
          <div class="transaction-item ${isIncome ? 'income' : 'expense'} ${hasPartialAccounting ? 'partial' : ''}">
            <div class="transaction-info">
              <div class="transaction-icon">${isIncome ? '📈' : '📉'}</div>
              <div class="transaction-details">
                <span class="transaction-description">${t.description || 'Sense descripció'}</span>
                <span class="transaction-time">${dateStr}</span>
                ${hasPartialAccounting ? `<span class="percentage-badge">${percentage}%</span>` : ''}
              </div>
            </div>
            <div class="transaction-amounts">
              <div class="transaction-amount ${isIncome ? 'positive' : 'negative'}">
                ${isIncome ? '+' : '-'}${this.formatCurrency(Math.abs(effectiveAmount))}
              </div>
              ${hasPartialAccounting ? `<div class="original-amount">(${this.formatCurrency(t.amount)} total)</div>` : ''}
            </div>
          </div>
        `
      })
      .join('')
  }

  attachCalendarEvents() {
    document.getElementById('prev-month')?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1)
      this.selectedDay = null
      this.render()
    })

    document.getElementById('next-month')?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1)
      this.selectedDay = null
      this.render()
    })

    document.querySelectorAll('.day-cell[data-day]').forEach(cell => {
      cell.addEventListener('click', e => {
        const day = parseInt(e.currentTarget.dataset.day)
        this.selectDay(day)
      })
    })

    document.getElementById('close-transactions')?.addEventListener('click', () => {
      this.selectedDay = null
      this.updateTransactionsPanel()
      document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('selected'))
    })

    // ✅ Nous toggles per al resum
    const toggleVisibility = document.getElementById('toggle-visibility')
    const toggleBlur = document.getElementById('toggle-blur')
    const summarySection = document.getElementById('summary-section')

    if (toggleVisibility && summarySection) {
      toggleVisibility.addEventListener('change', e => {
        const isHidden = !e.target.checked
        summarySection.style.display = isHidden ? 'none' : ''
        localStorage.setItem('dashboardSummaryHidden', isHidden.toString())
      })
    }

    if (toggleBlur && summarySection) {
      toggleBlur.addEventListener('change', e => {
        const isBlurred = !e.target.checked
        summarySection.classList.toggle('blurred', isBlurred)
        localStorage.setItem('dashboardSummaryBlurred', isBlurred.toString())
      })
    }
  }

  selectDay(day) {
    this.selectedDay = day

    document.querySelectorAll('.day-cell').forEach(cell => {
      cell.classList.remove('selected')
      if (parseInt(cell.dataset.day) === day) {
        cell.classList.add('selected')
      }
    })

    this.updateTransactionsPanel()
  }

  updateTransactionsPanel() {
    const title = document.getElementById('selected-date-title')
    const list = document.getElementById('transactions-list')

    if (this.selectedDay) {
      const dateStr = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), this.selectedDay).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long' })
      title.textContent = `Transaccions - ${dateStr}`
      list.innerHTML = this.renderTransactionsList(this.transactions, this.selectedDay)
    } else {
      title.textContent = 'Transaccions del mes'
      list.innerHTML = this.renderTransactionsList(this.transactions)
    }
  }

  formatCurrency(amount, compact = false) {
    if (typeof amount !== 'number' || isNaN(amount)) return '0 €'
    const options = {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: compact ? 0 : 2,
      maximumFractionDigits: compact ? 0 : 2,
    }
    return new Intl.NumberFormat('ca-ES', options).format(amount)
  }

  renderChart(summary) {
    const ctx = document.getElementById('chart')
    if (!ctx || typeof Chart === 'undefined') {
      console.warn('Chart.js no disponible')
      return
    }

    if (this.chart) {
      this.chart.destroy()
    }

    this.chart = new Chart(ctx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Ingressos', 'Despeses'],
        datasets: [
          {
            data: [summary.totalIncome || 0, summary.totalExpenses || 0],
            backgroundColor: ['#10b981', '#ef4444'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    })
  }
}
