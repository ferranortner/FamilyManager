// dashboard.js
export class Dashboard {
  constructor(containerId, financeServiceInstance = null, eventServiceInstance = null) {
    this.container = document.getElementById(containerId)

    if (!this.container) {
      throw new Error(`No s'ha trobat el contenidor amb id="${containerId}"`)
    }

    this.financeService = financeServiceInstance || (typeof financeService !== 'undefined' ? financeService : null)
    this.eventService = eventServiceInstance || (typeof eventService !== 'undefined' ? eventService : null)

    this.currentDate = new Date()
    this.chart = null
    this.transactions = []
    this.events = []
    this.selectedDay = null

    console.log('Dashboard inicialitzat:', {
      container: this.container,
      financeService: this.financeService,
      eventService: this.eventService,
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

      // ✅ OBTENIR ESDEVENIMENTS DEL MES (per al calendari) - NOU
      this.events = await this.getEventsByMonth(year, month)
      console.log('Esdeveniments del mes:', this.events)

      // ✅ OBTENIR ESDEVENIMENTS PROPERS (per al widget) - NOU
      const upcomingEvents = await this.getUpcomingEvents(7)
      console.log('Esdeveniments propers:', upcomingEvents)

      const html = this.generateHTML(summary, dailyData, upcomingEvents)
      console.log('HTML generat, inserint al DOM...')

      this.container.innerHTML = html
      console.log('HTML inserit')

      this.attachCalendarEvents()
      this.renderChart(summary)
      this.applySummaryState()

      // ✅ Renderitzar widget amb propers esdeveniments
      this.renderUpcomingEventsWidget(upcomingEvents)

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

  // ✅ NOU: Obtenir esdeveniments del mes (incloent recurrents)
  async getEventsByMonth(year, month) {
    if (!this.eventService) return []

    try {
      // Intentar usar el mètode específic del backend
      if (typeof this.eventService.getByMonth === 'function') {
        return await this.eventService.getByMonth(year, month)
      }

      // Fallback: obtenir tots i filtrar al client
      const allEvents = await this.eventService.getAll()

      return allEvents.filter(e => {
        const eventDate = new Date(e.date)

        if (e.isRecurring) {
          // Per recurrents: només comparem el mes (independentment de l'any)
          return eventDate.getMonth() + 1 === month
        } else {
          // Per no recurrents: any i mes exactes
          return eventDate.getFullYear() === year && eventDate.getMonth() + 1 === month
        }
      })
    } catch (error) {
      console.error('Error obtenint esdeveniments del mes:', error)
      return []
    }
  }

  // ✅ NOU: Renderitzar widget d'esdeveniments propers (separat del calendari)
  renderUpcomingEventsWidget(upcomingEvents) {
    const widgetContainer = document.querySelector('.events-widget-list')
    if (!widgetContainer) return

    if (!upcomingEvents || upcomingEvents.length === 0) {
      widgetContainer.innerHTML = '<div class="empty-events" style="text-align:center;padding:1.5rem;color:#64748b;font-size:0.875rem">Cap esdeveniment proper 🎉</div>'
      return
    }

    const eventTypeIcons = {
      medical: '🏥',
      birthday: '🎂',
      reminder: '🔔',
      other: '📌',
    }

    const eventsHTML = upcomingEvents
      .map(e => {
        const icon = eventTypeIcons[e.type] || '📌'
        const eventDate = new Date(e.date)
        const isRecurringThisYear = e.isRecurring && eventDate.getFullYear() !== new Date().getFullYear()
        const isTodayEvent = this.isToday(e)

        const dateOptions = { weekday: 'short', day: 'numeric', month: 'short' }
        const dateStr = eventDate.toLocaleDateString('ca-ES', dateOptions)

        return `
        <div class="widget-event-item ${isTodayEvent ? 'today' : ''}">
          <div class="widget-event-icon">${icon}</div>
          <div class="widget-event-info">
            <div class="widget-event-title">
              ${e.title || 'Sense títol'}
              ${e.isRecurring ? '<span class="widget-event-badge recurring" title="Es repeteix cada any">🔄</span>' : ''}
              ${isTodayEvent ? '<span class="widget-event-badge" style="background:#10b981;color:white">Avui</span>' : ''}
            </div>
            <div class="widget-event-date">
              ${dateStr}
              ${isRecurringThisYear ? `<small style="color:#94a3b8">(original: ${eventDate.getFullYear()})</small>` : ''}
            </div>
            ${e.notes ? `<div class="widget-event-notes" style="font-size:0.75rem;color:#64748b;margin-top:2px">📝 ${e.notes}</div>` : ''}
          </div>
        </div>
      `
      })
      .join('')

    widgetContainer.innerHTML = eventsHTML
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

  // ✅ MODIFICAT: Rep upcomingEvents com a paràmetre per al widget
  generateHTML(summary, dailyData, upcomingEvents = []) {
    const isHidden = localStorage.getItem('dashboardSummaryHidden') === 'true'
    const isBlurred = localStorage.getItem('dashboardSummaryBlurred') !== 'false'

    const formatAmount = (amount, className) => {
      if (isBlurred) {
        return `<div class="amount ${className}">•••••</div>`
      }
      return `<div class="amount ${className}">${this.formatCurrency(amount)}</div>`
    }

    // ✅ Widget d'esdeveniments (buit inicialment, es omple després amb renderUpcomingEventsWidget)
    const eventsWidgetHTML = this.generateEventsWidgetHTML(upcomingEvents)

    return `
    <!-- Controls de privacitat del resum -->
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

    <!-- Resum financer amb privacitat -->
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

    <!-- Contingut principal: Calendari + Transaccions + Esdeveniments -->
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

    <!-- Widget d'esdeveniments propers -->
    ${eventsWidgetHTML}

    <!-- Gràfic (al final perquè es vegi amb scroll) -->
    <div class="card chart-card">
      <canvas id="chart"></canvas>
    </div>
  `
  }

  // ✅ MODIFICAT: Generar HTML del widget (rep upcomingEvents)
  generateEventsWidgetHTML(upcomingEvents) {
    if (!this.eventService) return ''

    return `
      <div class="card events-widget">
        <div class="events-widget-header" style="display:flex;justify-content:space-between;align-items:center;padding-bottom:0.5rem;border-bottom:1px solid var(--border-color)">
          <h4 style="margin:0;font-size:1rem;color:#1e293b">📅 Pròxims esdeveniments</h4>
          <a href="#events" id="view-all-events" style="font-size:0.875rem;color:var(--primary-color);text-decoration:none">Veure tots →</a>
        </div>
        <div class="events-widget-list" style="display:flex;flex-direction:column;gap:0.5rem;max-height:300px;overflow-y:auto;padding-right:4px">
          <!-- S'omplirà dinàmicament amb renderUpcomingEventsWidget -->
          <div class="loading-events" style="text-align:center;padding:1rem;color:#64748b">Carregant...</div>
        </div>
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

  // ✅ Obtenir esdeveniments propers (per al widget)
  async getUpcomingEvents(days = 7) {
    if (!this.eventService) return []
    try {
      if (typeof this.eventService.getUpcomingEvents === 'function') {
        return await this.eventService.getUpcomingEvents(days)
      }
      // Fallback: obtenir tots i filtrar
      const allEvents = (await this.eventService.getAll?.()) || []
      return this.filterUpcomingEvents(allEvents, days)
    } catch (error) {
      console.error('Error obtenint esdeveniments propers:', error)
      return []
    }
  }

  // ✅ Filtrar esdeveniments propers (fallback)
  filterUpcomingEvents(events, days = 7) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)

    return events
      .filter(e => {
        const eventDate = new Date(e.date)

        if (e.isRecurring) {
          const thisYear = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate())
          const nextYear = new Date(today.getFullYear() + 1, eventDate.getMonth(), eventDate.getDate())

          return (thisYear >= today && thisYear <= futureDate) || (nextYear >= today && nextYear <= futureDate)
        }

        return eventDate >= today && eventDate <= futureDate
      })
      .sort((a, b) => {
        const getDateForComparison = e => {
          if (e.isRecurring) {
            const today = new Date()
            const eventDate = new Date(e.date)
            const thisYearDate = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate())
            return thisYearDate < today ? new Date(today.getFullYear() + 1, eventDate.getMonth(), eventDate.getDate()) : thisYearDate
          }
          return new Date(e.date)
        }
        return getDateForComparison(a) - getDateForComparison(b)
      })
  }

  // ✅ Verificar si un esdeveniment és avui
  isToday(event) {
    const today = new Date()
    const eventDate = new Date(event.date)

    if (event.isRecurring) {
      return eventDate.getDate() === today.getDate() && eventDate.getMonth() === today.getMonth()
    }
    return eventDate.toDateString() === today.toDateString()
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

  // ✅ IMPORTANT: Aquest mètode ja utilitza this.events (del mes) per pintar indicadors
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

      // ✅ Verificar si hi ha esdeveniments aquest dia (usant this.events del mes)
      const dayEvents = this.events.filter(e => this.isEventOnDay(e, day))
      const hasEvents = dayEvents.length > 0

      html += `
        <div class="day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasTransactions ? 'has-transactions' : ''} ${hasEvents ? 'has-events' : ''}" 
             data-day="${day}">
          <div class="day-number">${day}</div>
          <div class="day-indicators">
            ${hasIncome ? `<div class="indicator income" title="Ingressos: ${this.formatCurrency(data.income)}"></div>` : ''}
            ${hasExpense ? `<div class="indicator expense" title="Despeses: ${this.formatCurrency(data.expense)}"></div>` : ''}
            ${hasEvents ? `<div class="indicator event" title="${dayEvents.length} esdeveniment${dayEvents.length !== 1 ? 's' : ''}" style="background:#8b5cf6"></div>` : ''}
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

  // ✅ Verificar si un esdeveniment cau en un dia concret del mes actual
  isEventOnDay(event, day) {
    const eventDate = new Date(event.date)
    const currentYear = this.currentDate.getFullYear()
    const currentMonth = this.currentDate.getMonth()

    if (event.isRecurring) {
      // Per recursius: comparar dia i mes, independentment de l'any
      return eventDate.getDate() === day && eventDate.getMonth() === currentMonth
    }

    // Per no recursius: ha de coincidir dia, mes i any
    return eventDate.getDate() === day && eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear
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

    document.getElementById('view-all-events')?.addEventListener('click', e => {
      e.preventDefault()
      if (window.navigateToEvents) {
        window.navigateToEvents()
      } else {
        console.log("Navegar a gestió d'esdeveniments")
      }
    })
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

  applySummaryState() {
    const summarySection = document.getElementById('summary-section')
    const toggleBlur = document.getElementById('toggle-blur')

    if (!summarySection) return

    const isBlurred = localStorage.getItem('dashboardSummaryBlurred') !== 'false'
    summarySection.classList.toggle('blurred', isBlurred)

    if (toggleBlur) {
      toggleBlur.checked = !isBlurred
    }
  }
}
