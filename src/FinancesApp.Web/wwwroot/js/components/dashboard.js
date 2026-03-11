// dashboard.js
export class Dashboard {
  constructor(containerId, financeServiceInstance = null) {
    this.container = document.getElementById(containerId)

    // Verifica IMMEDIATAMENT si el contenidor existeix
    if (!this.container) {
      throw new Error(`No s'ha trobat el contenidor amb id="${containerId}"`)
    }

    this.financeService = financeServiceInstance || (typeof financeService !== 'undefined' ? financeService : null)
    this.currentDate = new Date()
    this.chart = null

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

      console.log('Iniciant render...') // DEBUG

      // Obtenir dades
      const year = this.currentDate.getFullYear()
      const month = this.currentDate.getMonth() + 1

      console.log(`Sol·licitant dades per ${year}-${month}`) // DEBUG

      const summary = await this.financeService.getSummary(year, month)
      console.log('Summary rebut:', summary) // DEBUG

      const dailyData = await this.getDailyData(year, month)
      console.log('DailyData rebut:', dailyData) // DEBUG

      // Generar HTML
      const html = this.generateHTML(summary, dailyData)
      console.log('HTML generat, inserint al DOM...') // DEBUG

      this.container.innerHTML = html
      console.log('HTML inserit') // DEBUG

      // Adjuntar events i gràfica
      this.attachCalendarEvents()
      this.renderChart(summary)

      console.log('Render completat') // DEBUG
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

  generateHTML(summary, dailyData) {
    return `
      <div class="dashboard-grid">
        <div class="card summary-card">
          <h3>Balanç</h3>
          <div class="amount ${summary.balance >= 0 ? 'positive' : 'negative'}">
            ${this.formatCurrency(summary.balance)}
          </div>
        </div>
        <div class="card summary-card">
          <h3>Ingressos</h3>
          <div class="amount positive">${this.formatCurrency(summary.totalIncome)}</div>
        </div>
        <div class="card summary-card">
          <h3>Despeses</h3>
          <div class="amount negative">${this.formatCurrency(summary.totalExpenses)}</div>
        </div>
      </div>
      
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
      
      <div class="card chart-card">
        <canvas id="chart"></canvas>
      </div>
    `
  }

  async getDailyData(year, month) {
    try {
      if (!this.financeService?.getTransactionsByMonth) {
        console.warn('getTransactionsByMonth no disponible')
        return {}
      }

      const transactions = await this.financeService.getTransactionsByMonth(year, month)
      console.log(`${transactions?.length || 0} transaccions trobades`) // DEBUG

      if (!Array.isArray(transactions)) {
        console.warn('Les transaccions no són un array:', transactions)
        return {}
      }

      const dailyData = {}

      transactions.forEach((t, index) => {
        try {
          const date = new Date(t.date)
          if (isNaN(date.getTime())) {
            console.warn(`Data invàlida a transacció ${index}:`, t)
            return
          }

          const day = date.getDate()

          if (!dailyData[day]) {
            dailyData[day] = { income: 0, expense: 0 }
          }

          if (t.type === 'income') {
            dailyData[day].income += Number(t.amount) || 0
          } else if (t.type === 'expense') {
            dailyData[day].expense += Number(t.amount) || 0
          }
        } catch (err) {
          console.error(`Error processant transacció ${index}:`, t, err)
        }
      })

      return dailyData
    } catch (error) {
      console.error('Error a getDailyData:', error)
      return {}
    }
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

      const data = dailyData[day] || { income: 0, expense: 0 }
      const hasIncome = data.income > 0
      const hasExpense = data.expense > 0

      html += `
        <div class="day-cell ${isToday ? 'today' : ''}" data-day="${day}">
          <div class="day-number">${day}</div>
          ${hasIncome ? `<div class="day-income">+${this.formatCurrency(data.income, true)}</div>` : ''}
          ${hasExpense ? `<div class="day-expense">-${this.formatCurrency(data.expense, true)}</div>` : ''}
        </div>
      `
    }

    html += '</div>'
    return html
  }

  attachCalendarEvents() {
    document.getElementById('prev-month')?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1)
      this.render()
    })

    document.getElementById('next-month')?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1)
      this.render()
    })
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
