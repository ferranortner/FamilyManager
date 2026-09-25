import { financeService } from '../services/financeService.js'

function formatCurrency(amount) {
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

export class ForecastView {
  constructor() {
    this.container = document.getElementById('main-content')
    this.transactions = []
    this.expandedYears = new Set()

    // Guardar data actual per als filtres
    const now = new Date()
    this.currentYear = now.getFullYear()
    this.currentMonth = now.getMonth()
  }

  async render() {
    try {
      this.container.innerHTML = '<div style="padding: 40px; text-align: center; color: #666;">⏳ Carregant dades de previsió...</div>'

      this.transactions = await financeService.getTransactions()

      if (!this.transactions || this.transactions.length === 0) {
        this.container.innerHTML = '<div style="padding: 40px; text-align: center; color: #666;">⚠️ No hi ha transaccions per mostrar.</div>'
        return
      }

      const forecast = this.calculateForecast()
      this.renderUI(forecast)
      this.setupEventListeners()
    } catch (error) {
      console.error('Error a ForecastView:', error)
      this.container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #ef4444;">
          <h3>Error carregant la previsió</h3>
          <p>${error.message}</p>
        </div>
      `
    }
  }

  calculateForecast() {
    const monthNames = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre']

    const yearsMap = new Map()

    this.transactions.forEach(transaction => {
      const date = new Date(transaction.date)
      const year = date.getFullYear()
      const month = date.getMonth()
      const percentage = transaction.accountingPercentage !== undefined ? transaction.accountingPercentage : 100
      const realAmount = transaction.amount * (percentage / 100)

      if (!yearsMap.has(year)) {
        yearsMap.set(year, { year, income: 0, expense: 0, balance: 0, months: new Map() })
      }

      const yearData = yearsMap.get(year)
      if (!yearData.months.has(month)) {
        yearData.months.set(month, { month, income: 0, expense: 0, balance: 0, accumulated: 0 })
      }

      const monthData = yearData.months.get(month)

      if (transaction.type === 'income') {
        yearData.income += realAmount
        monthData.income += realAmount
      } else {
        yearData.expense += realAmount
        monthData.expense += realAmount
      }
    })

    const groupedData = []
    let grandTotalIncome = 0
    let grandTotalExpense = 0

    const sortedYears = Array.from(yearsMap.keys()).sort((a, b) => a - b)

    sortedYears.forEach(year => {
      const yearData = yearsMap.get(year)
      yearData.balance = yearData.income - yearData.expense
      grandTotalIncome += yearData.income
      grandTotalExpense += yearData.expense

      const sortedMonths = Array.from(yearData.months.values()).sort((a, b) => a.month - b.month)
      let yearAccumulated = 0

      sortedMonths.forEach(m => {
        m.balance = m.income - m.expense
        yearAccumulated += m.balance
        m.accumulated = yearAccumulated
        m.monthName = monthNames[m.month]

        if (year < this.currentYear || (year === this.currentYear && m.month < this.currentMonth)) {
          m.period = 'past'
        } else if (year === this.currentYear && m.month === this.currentMonth) {
          m.period = 'current'
        } else {
          m.period = 'future'
        }
      })

      groupedData.push({ year, ...yearData, months: sortedMonths })
      this.expandedYears.add(year)
    })

    return { groupedData, totalIncome: grandTotalIncome, totalExpense: grandTotalExpense, balance: grandTotalIncome - grandTotalExpense }
  }

  renderUI(forecast) {
    this.container.innerHTML = `
      <div class="fc-container" style="padding: 20px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
          <div style="padding: 20px; border-radius: 12px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 4px solid #10b981;">
            <div style="font-size: 0.9rem; color: #666; margin-bottom: 8px;">Total Ingressos Previstos</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #111;">${formatCurrency(forecast.totalIncome)}</div>
          </div>
          <div style="padding: 20px; border-radius: 12px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 4px solid #ef4444;">
            <div style="font-size: 0.9rem; color: #666; margin-bottom: 8px;">Total Despeses Previstes</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #111;">${formatCurrency(forecast.totalExpense)}</div>
          </div>
          <div style="padding: 20px; border-radius: 12px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 4px solid #3b82f6;">
            <div style="font-size: 0.9rem; color: #666; margin-bottom: 8px;">Balanç Previst</div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #111;">${formatCurrency(forecast.balance)}</div>
          </div>
        </div>
        
        <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; flex-wrap: wrap;">
          <button class="fc-tab active" data-period="all" style="padding: 8px 16px; border: none; background: #3b82f6; color: white; font-weight: 600; cursor: pointer; border-radius: 6px;">Tots</button>
          <button class="fc-tab" data-period="past" style="padding: 8px 16px; border: none; background: transparent; color: #666; font-weight: 600; cursor: pointer; border-radius: 6px;">Antics</button>
          <button class="fc-tab" data-period="current-year" style="padding: 8px 16px; border: none; background: transparent; color: #666; font-weight: 600; cursor: pointer; border-radius: 6px;">Any actual (${this.currentYear})</button>
          <button class="fc-tab" data-period="current-month" style="padding: 8px 16px; border: none; background: transparent; color: #666; font-weight: 600; cursor: pointer; border-radius: 6px;">Mes actual</button>
          <button class="fc-tab" data-period="future" style="padding: 8px 16px; border: none; background: transparent; color: #666; font-weight: 600; cursor: pointer; border-radius: 6px;">Futur</button>
        </div>
        
        <div id="fc-data-container">
          ${forecast.groupedData
            .map(
              yearData => `
            <div class="fc-year-block" data-year="${yearData.year}" style="margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <div class="fc-year-header" style="background: #f3f4f6; padding: 12px 16px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <span class="fc-toggle-icon" style="font-size: 1.2rem;">▼</span>
                <strong style="flex: 1;">📅 Any ${yearData.year}</strong>
                <span style="color: #10b981; font-weight: 600;">${formatCurrency(yearData.income)}</span>
                <span style="color: #ef4444; font-weight: 600;">${formatCurrency(yearData.expense)}</span>
                <span style="color: ${yearData.balance >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">${formatCurrency(yearData.balance)}</span>
              </div>
              <div class="fc-months-container">
                ${yearData.months
                  .map(
                    month => `
                  <div class="fc-month-row" data-period="${month.period}" data-year="${yearData.year}" data-month="${month.month}" style="display: grid; grid-template-columns: 150px 100px 1fr 1fr 1fr 1fr; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #f3f4f6; align-items: center;">
                    <div style="padding-left: 32px; position: relative;">
                      <span style="position: absolute; left: 12px; color: #9ca3af;">─</span>
                      ${month.monthName}
                    </div>
                    <div><span style="padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; background: ${month.period === 'past' ? '#e5e7eb' : month.period === 'current' ? '#dbeafe' : '#fef3c7'}; color: ${month.period === 'past' ? '#4b5563' : month.period === 'current' ? '#1d4ed8' : '#92400e'};">${this.getPeriodLabel(month.period)}</span></div>
                    <div style="text-align: right; color: #10b981; font-weight: 600;">${formatCurrency(month.income)}</div>
                    <div style="text-align: right; color: #ef4444; font-weight: 600;">${formatCurrency(month.expense)}</div>
                    <div style="text-align: right; color: ${month.balance >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">${formatCurrency(month.balance)}</div>
                    <div style="text-align: right; color: ${month.accumulated >= 0 ? '#10b981' : '#ef4444'}; font-weight: 700;">${formatCurrency(month.accumulated)}</div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `
  }

  setupEventListeners() {
    // 1. Esdeveniments dels filtres
    const tabs = this.container.querySelectorAll('.fc-tab')
    tabs.forEach(tab => {
      tab.addEventListener('click', e => {
        tabs.forEach(t => {
          t.classList.remove('active')
          t.style.background = 'transparent'
          t.style.color = '#666'
        })
        e.target.classList.add('active')
        e.target.style.background = '#3b82f6'
        e.target.style.color = 'white'

        this.updateVisibility()
      })
    })

    // 2. Esdeveniments per col·lapsar anys
    const yearHeaders = this.container.querySelectorAll('.fc-year-header')
    yearHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const yearBlock = header.closest('.fc-year-block')
        const year = yearBlock.dataset.year
        const monthsContainer = yearBlock.querySelector('.fc-months-container')
        const icon = header.querySelector('.fc-toggle-icon')

        if (this.expandedYears.has(year)) {
          this.expandedYears.delete(year)
          monthsContainer.style.display = 'none'
          icon.textContent = '▶'
        } else {
          this.expandedYears.add(year)
          monthsContainer.style.display = 'block'
          icon.textContent = '▼'
        }

        this.updateVisibility()
      })
    })

    this.updateVisibility()
  }

  updateVisibility() {
    const activeTab = this.container.querySelector('.fc-tab.active')
    const activePeriod = activeTab ? activeTab.dataset.period : 'all'

    const monthRows = this.container.querySelectorAll('.fc-month-row')
    const yearBlocks = this.container.querySelectorAll('.fc-year-block')

    // 1. Gestionar files de mesos segons filtre
    monthRows.forEach(row => {
      const rowPeriod = row.dataset.period
      const rowYear = parseInt(row.dataset.year)
      const rowMonth = parseInt(row.dataset.month)

      let shouldShow = false

      switch (activePeriod) {
        case 'all':
          shouldShow = true
          break
        case 'past':
          shouldShow = rowPeriod === 'past'
          break
        case 'current-year':
          shouldShow = rowYear === this.currentYear
          break
        case 'current-month':
          shouldShow = rowYear === this.currentYear && rowMonth === this.currentMonth
          break
        case 'future':
          shouldShow = rowPeriod === 'future'
          break
      }

      row.style.display = shouldShow ? 'grid' : 'none'
    })

    // 2. Gestionar blocs d'any
    yearBlocks.forEach(yearBlock => {
      const year = yearBlock.dataset.year
      const monthsContainer = yearBlock.querySelector('.fc-months-container')
      const visibleMonths = monthsContainer.querySelectorAll('.fc-month-row[style*="display: grid"]')

      if (visibleMonths.length === 0) {
        yearBlock.style.display = 'none'
      } else {
        yearBlock.style.display = 'block'

        if (this.expandedYears.has(year)) {
          monthsContainer.style.display = 'block'
        }
      }
    })
  }

  getPeriodLabel(period) {
    const labels = { past: 'Antic', current: 'Actual', future: 'Futur' }
    return labels[period] || period
  }
}
