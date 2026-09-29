// components/loanAmortization.js

export class LoanAmortizationManager {
  constructor(containerId, loansConfig) {
    this.container = document.getElementById(containerId)
    this.loansConfig = loansConfig
    this.schedules = {}
    this.currentLoanId = 'combined'
    this.filterYear = 'all'
    this.hidePastExceptLast = false

    this.collapsedSummaries = {
      combined: false,
      loan_1: false,
      loan_2: false,
    }
  }

  async render() {
    this.container.innerHTML = '<p class="loading">Calculant taules d\'amortització...</p>'
    this.generateAllSchedules()

    const isCollapsed = this.collapsedSummaries[this.currentLoanId] || false
    const toggleIcon = isCollapsed ? '▶' : '▼'
    const toggleText = isCollapsed ? 'Mostrar resum' : 'Ocultar resum'

    this.container.innerHTML = `
      <div class="transactions-page" style="padding: 16px;">
        
        <!-- Pestanyes horitzontals -->
        <div class="loan-tabs" style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
          <button class="loan-tab-btn ${this.currentLoanId === 'combined' ? 'active' : ''}" 
                  data-loan-id="combined" 
                  style="padding: 10px 20px; border: none; background: ${this.currentLoanId === 'combined' ? '#28a745' : '#f1f3f5'}; 
                         color: ${this.currentLoanId === 'combined' ? '#fff' : '#495057'}; border-radius: 6px; 
                         font-weight: 600; cursor: pointer; font-size: 0.95em;">
            📊 Resum Combinat
          </button>
          ${this.loansConfig
            .map(
              loan => `
            <button class="loan-tab-btn ${loan.id === this.currentLoanId ? 'active' : ''}" 
                    data-loan-id="${loan.id}" 
                    style="padding: 10px 20px; border: none; background: ${loan.id === this.currentLoanId ? '#007bff' : '#f1f3f5'}; 
                           color: ${loan.id === this.currentLoanId ? '#fff' : '#495057'}; border-radius: 6px; 
                           font-weight: 600; cursor: pointer; font-size: 0.95em;">
              ${loan.name}
            </button>
          `
            )
            .join('')}
        </div>

        <!-- Resum col·lapsable -->
        ${!isCollapsed ? this.renderSummarySection() : ''}

        <!-- Botó col·lapsar + Filtres -->
        <div style="display: flex; gap: 16px; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap;">
          
          <button id="collapse-btn" style="flex: 1; min-width: 200px; padding: 10px; background: #f8f9fa; border: 1px dashed #dee2e6; border-radius: 6px; cursor: pointer; font-weight: 600; color: #6c757d; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>${toggleIcon}</span>
            <span>${toggleText}</span>
          </button>

          <div class="control-group">
            <label for="year-filter" style="font-weight: 600; color: #495057; display: block; margin-bottom: 4px; font-size: 0.8em; text-transform: uppercase;">Filtrar per any</label>
            <select id="year-filter" style="padding: 8px 12px; border: 1px solid #ced4da; border-radius: 6px; font-size: 0.95em; min-width: 150px;">
              <option value="all">Tots els anys</option>
              ${this.getUniqueYearsForCurrentView()
                .map(y => `<option value="${y}" ${y == this.filterYear ? 'selected' : ''}>${y}</option>`)
                .join('')}
            </select>
          </div>

          <div class="control-group" style="padding-bottom: 8px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9em; font-weight: 500; color: #495057; text-transform: uppercase;">
              <input type="checkbox" id="hide-past-cb" ${this.hidePastExceptLast ? 'checked' : ''} style="width: 18px; height: 18px;">
              Ocultar antigues (menys l'última)
            </label>
          </div>

        </div>

        <!-- Llista de quotes -->
        <div id="amortization-list" class="transactions-list-full">
          <p class="loading">Carregant desglossament...</p>
        </div>

      </div>
    `

    // Event Listeners
    this.container.querySelectorAll('.loan-tab-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        this.currentLoanId = e.target.dataset.loanId
        this.filterYear = 'all'
        this.render()
      })
    })

    document.getElementById('collapse-btn')?.addEventListener('click', () => {
      this.collapsedSummaries[this.currentLoanId] = !this.collapsedSummaries[this.currentLoanId]
      this.render()
    })

    document.getElementById('year-filter')?.addEventListener('change', e => {
      this.filterYear = e.target.value
      this.applyFilters()
    })

    document.getElementById('hide-past-cb')?.addEventListener('change', e => {
      this.hidePastExceptLast = e.target.checked
      this.applyFilters()
    })

    this.applyFilters()
  }

  renderSummarySection() {
    if (this.currentLoanId === 'combined') {
      return this.renderCombinedLayout()
    } else {
      return this.renderIndividualLayout()
    }
  }

  // Layout combinat: targetes COMPACTES + taula GRAN
  renderCombinedLayout() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let globalPending = 0,
      globalAmortized = 0,
      globalInterest = 0,
      globalPendingInterest = 0
    let totalMonths = 0,
      paidMonths = 0
    let loanStates = {}

    this.loansConfig.forEach(loan => {
      const schedule = this.schedules[loan.id]
      let pending = loan.principal
      let amortized = 0
      let interest = 0
      let pendingInterest = 0
      let paid = 0

      for (const item of schedule) {
        const itemDate = new Date(item.date)
        itemDate.setHours(0, 0, 0, 0)
        if (itemDate <= today) {
          amortized += item.principal
          interest += item.interest
          pending = item.balance
          paid++
        } else {
          pendingInterest += item.interest
        }
      }

      loanStates[loan.id] = { pending, amortized, interest, pendingInterest, paid, total: loan.months }
      globalPending += pending
      globalAmortized += amortized
      globalInterest += interest
      globalPendingInterest += pendingInterest
      totalMonths += loan.months
      paidMonths += paid
    })

    const percentComplete = ((paidMonths / totalMonths) * 100).toFixed(1)

    return `
      <div style="display: flex; gap: 20px; margin-bottom: 20px; align-items: stretch;">
        
        <!-- Esquerra: 4 targetes COMPACTES -->
        <div style="flex: 0 0 380px;">
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 14px; text-align: center; color: white; box-shadow: 0 2px 8px rgba(102,126,234,0.3);">
              <div style="font-size: 0.8em; opacity: 0.9; margin-bottom: 6px; font-weight: 500;"> Deute Pendent</div>
              <div style="font-size: 1.4em; font-weight: 700;">${this.formatCurrency(globalPending)}</div>
            </div>

            <div style="background: linear-gradient(135deg, #6c757d 0%, #495057 100%); border-radius: 8px; padding: 14px; text-align: center; color: white; box-shadow: 0 2px 8px rgba(108,117,125,0.3);">
              <div style="font-size: 0.8em; opacity: 0.9; margin-bottom: 6px; font-weight: 500;">✅ Capital Amortitzat</div>
              <div style="font-size: 1.4em; font-weight: 700;">${this.formatCurrency(globalAmortized)}</div>
            </div>

            <div style="background: linear-gradient(135deg, #d63384 0%, #c82333 100%); border-radius: 8px; padding: 14px; text-align: center; color: white; box-shadow: 0 2px 8px rgba(214,51,132,0.3);">
              <div style="font-size: 0.8em; opacity: 0.9; margin-bottom: 6px; font-weight: 500;">📉 Interessos Pagats</div>
              <div style="font-size: 1.4em; font-weight: 700;">${this.formatCurrency(globalInterest)}</div>
            </div>

            <div style="background: repeating-linear-gradient(45deg, #f8f9fa, #f8f9fa 10px, #e9ecef 10px, #e9ecef 20px); border-radius: 8px; padding: 14px; text-align: center; border: 2px solid #dee2e6; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="font-size: 0.8em; color: #495057; margin-bottom: 6px; font-weight: 500;">📊 Completat</div>
              <div style="font-size: 1.3em; font-weight: 700; color: #28a745;">${paidMonths}/${totalMonths}</div>
              <div style="font-size: 0.8em; color: #28a745; font-weight: 600;">(${percentComplete}%)</div>
            </div>

          </div>
        </div>

        <!-- Dreta: Taula de desglossament GRAN -->
        <div style="flex: 1; background: #fff; border-radius: 8px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border: 1px solid #e0e0e0;">
          <h4 style="margin: 0 0 12px 0; color: #495057; font-size: 1em; font-weight: 600;">Desglossament per crèdit:</h4>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${this.loansConfig
              .map(loan => {
                const state = loanStates[loan.id]
                const percent = ((state.paid / state.total) * 100).toFixed(1)
                return `
                <div style="display: grid; grid-template-columns: 1.2fr auto auto auto auto; gap: 12px; padding: 14px; background: #f8f9fa; border-radius: 6px; align-items: center;">
                  <div style="font-weight: 600; color: #495057; font-size: 0.95em;">${loan.name}</div>
                  <div style="text-align: center;">
                    <div style="font-size: 0.75em; color: #6c757d;">Amortitzat</div>
                    <div style="font-size: 1.1em; font-weight: 700; color: #28a745;">${this.formatCurrency(state.amortized)}</div>
                    <div style="font-size: 0.75em; color: #28a745;">${percent}%</div>
                  </div>
                  <div style="text-align: center;">
                    <div style="font-size: 0.75em; color: #6c757d;">Capital Pendent</div>
                    <div style="font-size: 1.1em; font-weight: 700; color: #dc3545;">${this.formatCurrency(state.pending)}</div>
                  </div>
                  <div style="text-align: center;">
                    <div style="font-size: 0.75em; color: #6c757d;">Interessos Pagats</div>
                    <div style="font-size: 1.1em; font-weight: 700; color: #ffc107; text-shadow: 0 0 2px rgba(0,0,0,0.2);">${this.formatCurrency(state.interest)}</div>
                  </div>
                  <div style="text-align: center;">
                    <div style="font-size: 0.75em; color: #6c757d;">Interessos Pendents</div>
                    <div style="font-size: 1.1em; font-weight: 700; color: #fd7e14;">${this.formatCurrency(state.pendingInterest)}</div>
                  </div>
                </div>
              `
              })
              .join('')}
          </div>
        </div>

      </div>
    `
  }

  // Layout individual: targetes normals (com abans)
  renderIndividualLayout() {
    const loan = this.loansConfig.find(l => l.id === this.currentLoanId)
    if (!loan) return ''

    const schedule = this.schedules[loan.id] || []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let pending = loan.principal
    let amortized = 0
    let interest = 0
    let pendingInterest = 0
    let paidMonths = 0

    for (const item of schedule) {
      const itemDate = new Date(item.date)
      itemDate.setHours(0, 0, 0, 0)
      if (itemDate <= today) {
        amortized += item.principal
        interest += item.interest
        pending = item.balance
        paidMonths++
      } else {
        pendingInterest += item.interest
      }
    }

    const percentComplete = ((paidMonths / loan.months) * 100).toFixed(1)

    return `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 20px; text-align: center; color: white; box-shadow: 0 2px 8px rgba(102,126,234,0.3);">
          <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 8px; font-weight: 500;">💰 Deute Pendent</div>
          <div style="font-size: 1.8em; font-weight: 700;">${this.formatCurrency(pending)}</div>
        </div>

        <div style="background: linear-gradient(135deg, #6c757d 0%, #495057 100%); border-radius: 8px; padding: 20px; text-align: center; color: white; box-shadow: 0 2px 8px rgba(108,117,125,0.3);">
          <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 8px; font-weight: 500;">✅ Capital Amortitzat</div>
          <div style="font-size: 1.8em; font-weight: 700;">${this.formatCurrency(amortized)}</div>
        </div>

        <div style="background: linear-gradient(135deg, #d63384 0%, #c82333 100%); border-radius: 8px; padding: 20px; text-align: center; color: white; box-shadow: 0 2px 8px rgba(214,51,132,0.3);">
          <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 8px; font-weight: 500;"> Interessos Pagats</div>
          <div style="font-size: 1.8em; font-weight: 700;">${this.formatCurrency(interest)}</div>
        </div>

        <div style="background: repeating-linear-gradient(45deg, #f8f9fa, #f8f9fa 10px, #e9ecef 10px, #e9ecef 20px); border-radius: 8px; padding: 20px; text-align: center; border: 2px solid #dee2e6; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="font-size: 0.9em; color: #495057; margin-bottom: 8px; font-weight: 500;">📊 Completat</div>
          <div style="font-size: 1.6em; font-weight: 700; color: #28a745;">${paidMonths}/${loan.months}</div>
          <div style="font-size: 0.9em; color: #28a745; font-weight: 600;">(${percentComplete}%)</div>
        </div>

      </div>
    `
  }

  generateAllSchedules() {
    this.loansConfig.forEach(loan => {
      let balance = loan.principal
      const monthlyRate = loan.annualRate / 12
      let currentDate = new Date(loan.startDate)
      currentDate.setMonth(currentDate.getMonth() + 1)

      const schedule = []
      for (let i = 1; i <= loan.months; i++) {
        const interestPayment = balance * monthlyRate
        const principalPayment = loan.monthlyPayment - interestPayment
        balance = Math.max(0, balance - principalPayment)

        schedule.push({
          loanId: loan.id,
          month: i,
          date: new Date(currentDate),
          year: currentDate.getFullYear(),
          payment: loan.monthlyPayment,
          interest: interestPayment,
          principal: principalPayment,
          balance: balance,
        })

        currentDate.setMonth(currentDate.getMonth() + 1)
      }
      this.schedules[loan.id] = schedule
    })
  }

  getUniqueYearsForCurrentView() {
    if (this.currentLoanId === 'combined') {
      const allDates = [...this.schedules['loan_1'], ...this.schedules['loan_2']].map(i => i.year)
      return [...new Set(allDates)].sort((a, b) => a - b)
    }
    const currentSchedule = this.schedules[this.currentLoanId] || []
    return [...new Set(currentSchedule.map(item => item.year))].sort((a, b) => a - b)
  }

  applyFilters() {
    let filtered = []

    if (this.currentLoanId === 'combined') {
      const allItems = [...this.schedules['loan_1'], ...this.schedules['loan_2']]
      const grouped = {}

      allItems.forEach(item => {
        const key = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`
        if (!grouped[key]) {
          grouped[key] = {
            date: item.date,
            year: item.date.getFullYear(),
            payment: 0,
            interest: 0,
            principal: 0,
            balance: 0,
            details: [],
          }
        }
        grouped[key].payment += item.payment
        grouped[key].interest += item.interest
        grouped[key].principal += item.principal
        grouped[key].balance += item.balance
        grouped[key].details.push(item)
      })

      filtered = Object.values(grouped).sort((a, b) => a.date - b.date)
    } else {
      filtered = [...(this.schedules[this.currentLoanId] || [])]
    }

    if (this.filterYear !== 'all') {
      filtered = filtered.filter(item => item.year === parseInt(this.filterYear))
    }

    if (this.hidePastExceptLast) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const pastItems = filtered.filter(item => {
        const d = new Date(item.date)
        d.setHours(0, 0, 0, 0)
        return d < today
      })
      const futureAndCurrent = filtered.filter(item => {
        const d = new Date(item.date)
        d.setHours(0, 0, 0, 0)
        return d >= today
      })

      const lastPaid = pastItems.length > 0 ? pastItems[pastItems.length - 1] : null

      filtered = futureAndCurrent
      if (lastPaid) filtered.unshift(lastPaid)
      filtered.sort((a, b) => a.date - b.date)
    }

    this.renderList(filtered)
  }

  renderList(filteredSchedule) {
    const listContainer = document.getElementById('amortization-list')
    if (!listContainer) return

    if (filteredSchedule.length === 0) {
      listContainer.innerHTML = `<div class="empty-state-full"><div class="empty-icon"></div><p>Cap dada coincideix amb els filtres</p></div>`
      return
    }

    listContainer.innerHTML = filteredSchedule.map(item => this.renderItem(item)).join('')
  }

  renderItem(item) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const itemDate = new Date(item.date)
    itemDate.setHours(0, 0, 0, 0)

    let rowStyle = ''
    let leftBorder = ''

    if (itemDate < today) {
      rowStyle = 'background-color: #d4edda;'
      leftBorder = 'border-left: 5px solid #28a745;'
    } else if (itemDate > today) {
      rowStyle = 'background-color: #f8f9fa; opacity: 0.85;'
      leftBorder = 'border-left: 5px solid #adb5bd;'
    } else {
      rowStyle = 'background-color: #e3f2fd;'
      leftBorder = 'border-left: 5px solid #007bff;'
    }

    const monthsCat = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre']
    const monthName = monthsCat[item.date.getMonth()]
    const dateStr = item.date.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })

    let description = `Quota ${item.month} - ${monthName} ${item.year}`
    let extraInfo = ''

    if (this.currentLoanId === 'combined' && item.details) {
      description = `Pagament Combinat - ${monthName} ${item.year}`
      extraInfo = `<div style="display: flex; gap: 8px; margin-top: 4px; font-size: 0.85em;">
        ${item.details
          .map(d => {
            const loanName = this.loansConfig
              .find(l => l.id === d.loanId)
              .name.split('(')[0]
              .trim()
            return `<span style="background: #e9ecef; padding: 2px 8px; border-radius: 4px; color: #495057;">${loanName}: ${this.formatCurrency(d.payment)}</span>`
          })
          .join('')}
      </div>`
    }

    return `
      <div class="transaction-item-compact" style="${rowStyle} ${leftBorder} padding: 16px; margin-bottom: 12px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="display: grid; grid-template-columns: 1.5fr auto auto auto auto; gap: 16px; align-items: center;">
          
          <div>
            <div style="font-weight: 600; font-size: 1.05em; color: #495057; margin-bottom: 4px;">${description}</div>
            <div style="font-size: 0.85em; color: #6c757d;">${dateStr}</div>
            ${extraInfo}
          </div>

          <div style="text-align: right;">
            <div style="font-size: 1.3em; font-weight: 700; color: #dc3545;">-${this.formatCurrency(item.payment)}</div>
            <div style="font-size: 0.8em; color: #6c757d;">Total</div>
          </div>

          <div style="text-align: center; background: #fff3cd; padding: 8px 12px; border-radius: 6px;">
            <div style="font-size: 1.2em; font-weight: 700; color: #856404;">${this.formatCurrency(item.interest)}</div>
            <div style="font-size: 0.75em; color: #856404; text-transform: uppercase; font-weight: 600;">Interessos</div>
          </div>

          <div style="text-align: center; background: #d4edda; padding: 8px 12px; border-radius: 6px;">
            <div style="font-size: 1.2em; font-weight: 700; color: #155724;">${this.formatCurrency(item.principal)}</div>
            <div style="font-size: 0.75em; color: #155724; text-transform: uppercase; font-weight: 600;">Capital</div>
          </div>

          <div style="text-align: center; background: #d1ecf1; padding: 8px 12px; border-radius: 6px;">
            <div style="font-size: 1.2em; font-weight: 700; color: #0c5460;">${this.formatCurrency(item.balance)}</div>
            <div style="font-size: 0.75em; color: #0c5460; text-transform: uppercase; font-weight: 600;">Saldo</div>
          </div>

        </div>
      </div>
    `
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(amount)
  }
}
