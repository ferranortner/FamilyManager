// js/components/analysis.js - Pàgina d'anàlisi amb fallback robust

export class AnalysisPage {
  constructor(financeService, categoryService) {
    this.container = null
    this.financeService = financeService
    this.categoryService = categoryService
    this.transactions = []
    this.categories = []
    this.chart = null
    this.selectedCategories = new Set()
    this.dateRange = {
      start: null,
      end: null,
    }
    this.groupBy = 'month'
    this.transactionType = 'expense'
    this.chartJsAvailable = typeof Chart !== 'undefined'
  }

  async render(container) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container

    if (!this.container) {
      console.error('Container no trobat:', container)
      return
    }

    // Verificar serveis
    if (!this.financeService) {
      this.showError('Error: financeService no està definit. Verifica que el passes correctament des de app.js')
      return
    }

    if (!this.categoryService) {
      this.showError('Error: categoryService no està definit.')
      return
    }

    this.container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #64748b;">Carregant dades...</div>'

    try {
      // Obtenir transaccions amb fallback
      let transactions = await this.getTransactionsWithFallback()

      // Obtenir categories amb fallback
      let categories = await this.getCategoriesWithFallback()

      this.transactions = transactions || []
      this.categories = (categories || []).filter(c => c && c.type === 'expense')

      //console.log('✅ Analysis: Transaccions carregades:', this.transactions.length)
      //console.log('✅ Analysis: Categories carregades:', this.categories.length)

      if (this.categories.length === 0) {
        this.renderContent()
        this.showWarning('No hi ha categories de despeses. Selecciona "Ingressos" o "Ambdós" per veure dades.')
        return
      }

      // Establir període per defecte
      this.setDefaultDateRange()

      // Seleccionar totes les categories per defecte
      this.selectedCategories.clear()
      this.categories.forEach(c => {
        if (c && c.id) this.selectedCategories.add(c.id)
      })

      this.renderContent()

      // Intentar renderitzar gràfic si Chart.js està disponible
      if (this.chartJsAvailable) {
        this.renderChart()
      } else {
        this.showChartJsWarning()
      }
    } catch (error) {
      console.error('❌ Error carregant anàlisi:', error)
      this.showError(`Error carregant dades: ${error.message}`)
    }
  }

  // Mètode robust per obtenir transaccions amb múltiples fallbacks
  async getTransactionsWithFallback() {
    const methods = ['getAllTransactions', 'getTransactions', 'getAll', 'list', 'fetchTransactions']

    for (const method of methods) {
      if (typeof this.financeService[method] === 'function') {
        try {
          console.log(`🔄 Analysis: Intentant ${method}...`)
          const result = await this.financeService[method]()
          console.log(`✅ Analysis: ${method} funcionó, retornat ${result?.length || 0} items`)
          return result
        } catch (err) {
          console.warn(`⚠️ Analysis: ${method} va fallar:`, err.message)
        }
      }
    }

    // Si és una propietat en lloc de mètode
    if (this.financeService.transactions && Array.isArray(this.financeService.transactions)) {
      console.log('✅ Analysis: Usant propietat transactions')
      return this.financeService.transactions
    }

    // Si té data o items
    if (this.financeService.data && Array.isArray(this.financeService.data)) {
      console.log('✅ Analysis: Usant propietat data')
      return this.financeService.data
    }

    console.error("❌ Analysis: No s'ha trobat cap mètode per obtenir transaccions")
    console.log('Mètodes disponibles:', Object.keys(this.financeService))
    throw new Error("No s'ha trobat cap mètode per obtenir transaccions")
  }

  // Mètode robust per obtenir categories amb múltiples fallbacks
  async getCategoriesWithFallback() {
    const methods = ['getAll', 'getCategories', 'list', 'fetchCategories', 'all']

    for (const method of methods) {
      if (typeof this.categoryService[method] === 'function') {
        try {
          console.log(`🔄 Analysis: Intentant categories.${method}...`)
          const result = await this.categoryService[method]()
          console.log(`✅ Analysis: categories.${method} funcionó`)
          return result
        } catch (err) {
          console.warn(`⚠️ Analysis: categories.${method} va fallar:`, err.message)
        }
      }
    }

    // Si és una propietat
    if (this.categoryService.categories && Array.isArray(this.categoryService.categories)) {
      console.log('✅ Analysis: Usant propietat categories')
      return this.categoryService.categories
    }

    if (this.categoryService.data && Array.isArray(this.categoryService.data)) {
      console.log('✅ Analysis: Usant propietat data de categories')
      return this.categoryService.data
    }

    console.error("❌ Analysis: No s'ha trobat cap mètode per obtenir categories")
    console.log('Mètodes disponibles:', Object.keys(this.categoryService))
    throw new Error("No s'ha trobat cap mètode per obtenir categories")
  }

  showError(message) {
    if (this.container) {
      this.container.innerHTML = `
        <div style="
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          padding: 2rem;
          border-radius: 12px;
          margin: 2rem;
          font-family: system-ui, sans-serif;
        ">
          <h3 style="margin-top: 0; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            ⚠️ Error
          </h3>
          <p style="margin: 0; line-height: 1.5;">${message}</p>
          <p style="font-size: 0.875rem; color: #b91c1c; margin-top: 1rem; margin-bottom: 0;">
            Revisa la consola (F12 → Console) per més detalls tècnics.
          </p>
        </div>
      `
    }
  }

  showWarning(message) {
    const warningEl = document.createElement('div')
    warningEl.innerHTML = `
      <div style="
        background: #fffbeb;
        border: 1px solid #fcd34d;
        color: #92400e;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        font-family: system-ui, sans-serif;
      ">
        <p style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
          ℹ️ ${message}
        </p>
      </div>
    `
    const content = this.container.querySelector('.analysis-page')
    if (content) {
      content.insertBefore(warningEl.firstElementChild, content.firstChild.nextSibling)
    }
  }

  showChartJsWarning() {
    const chartContainer = document.getElementById('evolution-chart')?.parentElement
    if (chartContainer) {
      chartContainer.innerHTML = `
        <div style="
          text-align: center;
          padding: 3rem 2rem;
          color: #6b7280;
          background: #f9fafb;
          border-radius: 12px;
          border: 2px dashed #e5e7eb;
        ">
          <p style="font-size: 1.25rem; margin-bottom: 0.5rem;">📊 Gràfic no disponible</p>
          <p style="margin: 0;">Chart.js no s'ha pogut carregar.</p>
          <p style="font-size: 0.875rem; margin-top: 0.5rem; color: #9ca3af;">
            Això pot ser degut a:<br>
            • Bloqueig de Tracking Prevention (Safari/Edge)<br>
            • Problemes de connexió amb el CDN<br>
            • Extensions del navegador (AdBlock, etc.)
          </p>
          <p style="font-size: 0.875rem; margin-top: 1rem;">
            <strong>Solució:</strong> Desactiva el bloqueig de trackers o usa Chrome/Firefox.
          </p>
        </div>
      `
    }
  }

  setDefaultDateRange() {
    const end = new Date()
    const start = new Date()
    start.setMonth(start.getMonth() - 6)

    this.dateRange.end = end.toISOString().split('T')[0]
    this.dateRange.start = start.toISOString().split('T')[0]
  }

  formatCurrency(value) {
    const num = parseFloat(value)
    if (isNaN(num)) return '0,00 €'
    return num.toLocaleString('ca-ES', {
      style: 'currency',
      currency: 'EUR',
    })
  }

  formatPeriodLabel(period) {
    if (this.groupBy === 'month') {
      const [year, month] = period.split('-')
      const date = new Date(year, month - 1)
      return date.toLocaleDateString('ca-ES', { month: 'short', year: 'numeric' })
    } else if (this.groupBy === 'week') {
      return `Setm. ${period}`
    } else if (this.groupBy === 'quarter') {
      const [year, quarter] = period.split('-Q')
      return `${year} T${quarter}`
    }
    return period
  }

  renderContent() {
    this.container.innerHTML = `
      <div class="analysis-page" style="
        display: flex;
        flex-direction: column;
        height: 100%;
        max-height: 100%;
        overflow: hidden;
        gap: 1rem;
        padding: 1rem;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e2e8f0;
          flex-shrink: 0;
        ">
          <h1 style="margin: 0; font-size: 1.5rem; font-weight: 600; color: #1e293b;">
            
          </h1>
          <button id="refresh-analysis" style="
            padding: 0.5rem 1rem;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
          ">🔄 Actualitzar</button>
        </div>

        <!-- Controls -->
        <div style="
          display: flex;
          flex-wrap: wrap;
          gap: 1.5rem;
          padding: 1rem;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          flex-shrink: 0;
        ">
          <!-- Període -->
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <label style="font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase;">
              Període
            </label>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              ${['1m', '3m', '6m', '1y', 'all']
                .map(
                  p => `
                <button class="preset-btn ${p === '6m' ? 'active' : ''}" data-period="${p}" style="
                  padding: 0.5rem 1rem;
                  border: 1px solid #e2e8f0;
                  background: ${p === '6m' ? '#2563eb' : 'white'};
                  color: ${p === '6m' ? 'white' : '#475569'};
                  border-radius: 8px;
                  cursor: pointer;
                  font-weight: 500;
                ">${p === '1m' ? '1M' : p === '3m' ? '3M' : p === '6m' ? '6M' : p === '1y' ? '1A' : 'Tot'}</button>
              `
                )
                .join('')}
            </div>
          </div>

          <!-- Agrupació -->
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <label style="font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase;">
              Agrupar per
            </label>
            <div style="display: flex; gap: 0.5rem;">
              ${['month', 'week', 'quarter']
                .map(
                  g => `
                <button class="group-btn ${g === 'month' ? 'active' : ''}" data-group="${g}" style="
                  padding: 0.5rem 1rem;
                  border: 1px solid #e2e8f0;
                  background: ${g === 'month' ? '#f1f5f9' : 'white'};
                  color: #475569;
                  border-radius: 8px;
                  cursor: pointer;
                  font-weight: 500;
                ">${g === 'month' ? 'Mes' : g === 'week' ? 'Setmana' : 'Trimestre'}</button>
              `
                )
                .join('')}
            </div>
          </div>

          <!-- Tipus -->
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <label style="font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase;">
              Tipus
            </label>
            <div style="display: flex; gap: 0.5rem;">
              <button class="type-btn active" data-type="expense" style="
                padding: 0.5rem 1rem;
                border: 1px solid #dc2626;
                background: #fef2f2;
                color: #dc2626;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
              ">Despeses</button>
              <button class="type-btn" data-type="income" style="
                padding: 0.5rem 1rem;
                border: 1px solid #e2e8f0;
                background: white;
                color: #475569;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
              ">Ingressos</button>
              <button class="type-btn" data-type="both" style="
                padding: 0.5rem 1rem;
                border: 1px solid #e2e8f0;
                background: white;
                color: #475569;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
              ">Ambdós</button>
            </div>
          </div>
        </div>

        <!-- Categories -->
        <div style="
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 1rem;
          flex-shrink: 0;
        ">
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
          ">
            <label style="font-weight: 600; color: #374151;">
              Categories (${this.selectedCategories.size})
            </label>
            <div style="display: flex; gap: 0.75rem;">
              <button id="select-all-cat" style="background: none; border: none; color: #2563eb; cursor: pointer; font-weight: 500;">Totes</button>
              <button id="select-none-cat" style="background: none; border: none; color: #2563eb; cursor: pointer; font-weight: 500;">Cap</button>
            </div>
          </div>
          <div id="categories-chips" style="
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            max-height: 100px;
            overflow-y: auto;
          ">
            ${this.renderCategoryChips()}
          </div>
        </div>

        <!-- Resum -->
        <div id="analysis-summary" style="flex-shrink: 0;">
          ${this.renderSummary()}
        </div>

        <!-- Gràfic -->
        <div style="
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 1rem;
          flex: 1;
          min-height: 300px;
          position: relative;
        ">
          <canvas id="evolution-chart"></canvas>
        </div>
      </div>
    `

    this.attachEventListeners()
  }

  renderCategoryChips() {
    if (!this.categories || this.categories.length === 0) {
      return '<p style="color: #6b7280; padding: 1rem;">No hi ha categories disponibles</p>'
    }

    return this.categories
      .map(cat => {
        const isSelected = this.selectedCategories.has(cat.id)
        const color = cat.color || '#64748b'
        return `
        <div class="category-chip ${isSelected ? 'selected' : ''}" 
             data-id="${cat.id}"
             style="
               display: flex;
               align-items: center;
               gap: 0.5rem;
               padding: 0.5rem 0.75rem;
               background: ${isSelected ? 'white' : '#f8fafc'};
               border: 2px solid ${isSelected ? color : 'transparent'};
               border-radius: 20px;
               cursor: pointer;
               transition: all 0.2s;
               font-size: 0.875rem;
               user-select: none;
             "
             onmouseover="this.style.transform='translateY(-1px)'"
             onmouseout="this.style.transform='translateY(0)'"
        >
          <span style="font-size: 1rem;">${cat.icon || '📁'}</span>
          <span style="font-weight: ${isSelected ? '600' : '500'}; color: ${isSelected ? color : '#374151'};">
            ${cat.name}
          </span>
          ${isSelected ? `<span style="color: ${color}; font-weight: bold;">✓</span>` : ''}
        </div>
      `
      })
      .join('')
  }

  renderSummary() {
    const filteredData = this.getFilteredData()

    // CORRECCIÓ: Agrupar per període abans de calcular totals
    const groupedData = this.groupDataByPeriod(filteredData)
    const totals = this.calculateTotals(groupedData)

    // Actualitzar també el contador de categories seleccionades
    const label = this.container?.querySelector('label')
    if (label) {
      label.textContent = `Categories (${this.selectedCategories.size})`
    }

    return `
    <div style="
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    ">
      <div style="...">
        <span style="...">Total Període</span>
        <span style="font-size: 1.25rem; font-weight: 700; color: ${totals.total >= 0 ? '#059669' : '#dc2626'};">
          ${this.formatCurrency(totals.total)}
        </span>
      </div>
      <div style="...">
        <span style="...">
          Mitjana/${this.groupBy === 'month' ? 'mes' : this.groupBy === 'week' ? 'setm.' : 'trim.'}
        </span>
        <span style="font-size: 1.25rem; font-weight: 700; color: #1e293b;">
          ${this.formatCurrency(totals.average)}
        </span>
      </div>
      <div style="...">
        <span style="...">Màxim</span>
        <span style="font-size: 1.25rem; font-weight: 700; color: #dc2626;">
          ${this.formatCurrency(totals.max)}
        </span>
      </div>
      <div style="...">
        <span style="...">Transaccions</span>
        <span style="font-size: 1.25rem; font-weight: 700; color: #1e293b;">
          ${filteredData.length}
        </span>
      </div>
    </div>
  `
  }

  attachEventListeners() {
    // Períodes
    this.container.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        this.container.querySelectorAll('.preset-btn').forEach(b => {
          b.classList.remove('active')
          b.style.background = 'white'
          b.style.color = '#475569'
        })
        e.target.classList.add('active')
        e.target.style.background = '#2563eb'
        e.target.style.color = 'white'

        this.setPeriod(e.target.dataset.period)
      })
    })

    // Agrupació
    this.container.querySelectorAll('.group-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        this.container.querySelectorAll('.group-btn').forEach(b => {
          b.classList.remove('active')
          b.style.background = 'white'
        })
        e.target.classList.add('active')
        e.target.style.background = '#f1f5f9'
        this.groupBy = e.target.dataset.group
        this.updateChart()
      })
    })

    // Tipus
    this.container.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        this.container.querySelectorAll('.type-btn').forEach(b => {
          b.classList.remove('active')
          b.style.background = 'white'
          b.style.color = '#475569'
          b.style.borderColor = '#e2e8f0'
        })
        e.target.classList.add('active')
        if (e.target.dataset.type === 'expense') {
          e.target.style.background = '#fef2f2'
          e.target.style.color = '#dc2626'
          e.target.style.borderColor = '#dc2626'
        }

        await this.changeTransactionType(e.target.dataset.type)
      })
    })

    // Categories
    this.container.querySelectorAll('.category-chip').forEach(chip => {
      chip.addEventListener('click', e => {
        const chipEl = e.currentTarget
        const id = parseInt(chipEl.dataset.id)
        const cat = this.categories.find(c => c.id === id)
        const color = cat?.color || '#2563eb'

        if (this.selectedCategories.has(id)) {
          this.selectedCategories.delete(id)
          chipEl.classList.remove('selected')
          chipEl.style.background = '#f8fafc'
          chipEl.style.borderColor = 'transparent'
          chipEl.querySelector('span:nth-child(2)').style.fontWeight = '500'
          chipEl.querySelector('span:nth-child(2)').style.color = '#374151'
          const check = chipEl.querySelector('span:last-child')
          if (check && check.textContent === '✓') check.remove()
        } else {
          this.selectedCategories.add(id)
          chipEl.classList.add('selected')
          chipEl.style.background = 'white'
          chipEl.style.borderColor = color
          chipEl.querySelector('span:nth-child(2)').style.fontWeight = '600'
          chipEl.querySelector('span:nth-child(2)').style.color = color
          if (!chipEl.querySelector('span:last-child') || chipEl.querySelector('span:last-child').textContent !== '✓') {
            const check = document.createElement('span')
            check.textContent = '✓'
            check.style.color = color
            check.style.fontWeight = 'bold'
            chipEl.appendChild(check)
          }
        }
        this.updateCategoryCount()
        this.updateChart()
      })
    })

    // Select all/none
    document.getElementById('select-all-cat')?.addEventListener('click', () => {
      this.categories.forEach(c => this.selectedCategories.add(c.id))
      this.container.querySelectorAll('.category-chip').forEach(chip => {
        const id = parseInt(chip.dataset.id)
        const cat = this.categories.find(c => c.id === id)
        chip.classList.add('selected')
        chip.style.background = 'white'
        chip.style.borderColor = cat?.color || '#2563eb'
      })
      this.updateCategoryCount()
      this.updateChart()
    })

    document.getElementById('select-none-cat')?.addEventListener('click', () => {
      this.selectedCategories.clear()
      this.container.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.remove('selected')
        chip.style.background = '#f8fafc'
        chip.style.borderColor = 'transparent'
      })
      this.updateCategoryCount()
      this.updateChart()
    })

    // Refresh
    document.getElementById('refresh-analysis')?.addEventListener('click', () => {
      this.updateChart()
    })
  }

  updateCategoryCount() {
    const label = this.container.querySelector('label')
    if (label) {
      label.textContent = `Categories (${this.selectedCategories.size})`
    }
  }

  async changeTransactionType(type) {
    try {
      let allCategories = await this.getCategoriesWithFallback()

      if (type === 'expense') {
        this.categories = allCategories.filter(c => c.type === 'expense')
      } else if (type === 'income') {
        this.categories = allCategories.filter(c => c.type === 'income')
      } else {
        this.categories = allCategories
      }

      this.selectedCategories.clear()
      this.categories.forEach(c => this.selectedCategories.add(c.id))

      const chipsContainer = document.getElementById('categories-chips')
      if (chipsContainer) {
        chipsContainer.innerHTML = this.renderCategoryChips()
      }

      // Re-attach events
      this.container.querySelectorAll('.category-chip').forEach(chip => {
        chip.addEventListener('click', e => {
          const chipEl = e.currentTarget
          const id = parseInt(chipEl.dataset.id)
          if (this.selectedCategories.has(id)) {
            this.selectedCategories.delete(id)
            chipEl.classList.remove('selected')
            chipEl.style.background = '#f8fafc'
            chipEl.style.borderColor = 'transparent'
          } else {
            this.selectedCategories.add(id)
            chipEl.classList.add('selected')
            chipEl.style.background = 'white'
            const cat = this.categories.find(c => c.id === id)
            chipEl.style.borderColor = cat?.color || '#2563eb'
          }
          this.updateCategoryCount()
          this.updateChart()
        })
      })

      this.updateChart()
    } catch (error) {
      console.error('Error canviant tipus:', error)
    }
  }

  setPeriod(period) {
    const end = new Date()
    const start = new Date()

    switch (period) {
      case '1m':
        start.setMonth(start.getMonth() - 1)
        break
      case '3m':
        start.setMonth(start.getMonth() - 3)
        break
      case '6m':
        start.setMonth(start.getMonth() - 6)
        break
      case '1y':
        start.setFullYear(start.getFullYear() - 1)
        break
      case 'all':
        if (this.transactions.length > 0) {
          const dates = this.transactions.map(t => new Date(t.date))
          start.setTime(Math.min(...dates))
        } else {
          start.setFullYear(start.getFullYear() - 5)
        }
        break
    }

    this.dateRange.start = start.toISOString().split('T')[0]
    this.dateRange.end = end.toISOString().split('T')[0]

    this.updateChart()
  }

  getFilteredData() {
    if (!this.transactions || !Array.isArray(this.transactions)) return []

    return this.transactions.filter(t => {
      if (!t || !t.date) return false
      // CORRECCIÓ: suportar tant categoryId com category_id
      const categoryId = t.categoryId || t.category_id
      return t.date >= this.dateRange.start && t.date <= this.dateRange.end && this.selectedCategories.has(categoryId)
    })
  }

  groupDataByPeriod(data) {
    const grouped = {}

    data.forEach(t => {
      if (!t || !t.date) return

      const date = new Date(t.date)
      let periodKey

      if (this.groupBy === 'month') {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      } else if (this.groupBy === 'week') {
        const week = this.getWeekNumber(date)
        periodKey = `${date.getFullYear()}-W${String(week).padStart(2, '0')}`
      } else if (this.groupBy === 'quarter') {
        const quarter = Math.floor(date.getMonth() / 3) + 1
        periodKey = `${date.getFullYear()}-Q${quarter}`
      }

      if (!grouped[periodKey]) {
        grouped[periodKey] = { period: periodKey, categories: {}, total: 0 }
      }

      const amount = parseFloat(t.amount) || 0
      const catId = t.categoryId || t.category_id
      grouped[periodKey].categories[catId] = (grouped[periodKey].categories[catId] || 0) + amount
      grouped[periodKey].total += amount
    })

    return grouped
  }

  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  }

  calculateTotals(groupedData) {
    let total = 0,
      max = 0,
      count = 0

    Object.values(groupedData).forEach(data => {
      total += data.total
      if (Math.abs(data.total) > Math.abs(max)) max = data.total
      count++
    })

    return { total, max, average: count > 0 ? total / count : 0 }
  }

  renderChart() {
    if (!this.chartJsAvailable) {
      this.showChartJsWarning()
      return
    }

    const canvas = document.getElementById('evolution-chart')
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (this.chart) this.chart.destroy()

    const filteredData = this.getFilteredData()
    const groupedData = this.groupDataByPeriod(filteredData)
    const periods = Object.keys(groupedData).sort()

    if (periods.length === 0) {
      canvas.parentElement.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #6b7280;">
          <p>No hi ha dades per mostrar en el període seleccionat.</p>
        </div>
      `
      return
    }

    const datasets = this.categories
      .filter(cat => this.selectedCategories.has(cat.id))
      .map(cat => {
        const data = periods.map(period => Math.abs(groupedData[period].categories[cat.id] || 0))
        return {
          label: cat.name,
          data: data,
          borderColor: cat.color || '#64748b',
          backgroundColor: this.hexToRgba(cat.color || '#64748b', 0.1),
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        }
      })

    const totals = periods.map(period => {
      let sum = 0
      this.selectedCategories.forEach(catId => {
        sum += groupedData[period].categories[catId] || 0
      })
      return Math.abs(sum)
    })

    datasets.push({
      label: 'Total',
      data: totals,
      borderColor: '#1e293b',
      backgroundColor: 'rgba(30, 41, 59, 0.05)',
      borderWidth: 3,
      borderDash: [5, 5],
      fill: false,
      tension: 0.4,
      pointRadius: 5,
      pointHoverRadius: 7,
      order: 0,
    })

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: periods.map(p => this.formatPeriodLabel(p)),
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          title: {
            display: true,
            text: `Evolució de ${this.transactionType === 'income' ? 'Ingressos' : 'Despeses'}`,
            font: { size: 16, weight: 'bold' },
            padding: 20,
          },
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, padding: 15, font: { size: 12 } },
          },
          tooltip: {
            callbacks: {
              label: context => {
                const value = context.parsed.y
                const prefix = context.dataset.label === 'Total' ? '💰 ' : ''
                return `${prefix}${context.dataset.label}: ${this.formatCurrency(value)}`
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => this.formatCurrency(value),
              font: { size: 11 },
            },
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
          },
        },
      },
    })

    const summaryEl = document.getElementById('analysis-summary')
    if (summaryEl) summaryEl.innerHTML = this.renderSummary()
  }

  updateChart() {
    this.renderChart()
  }

  hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== 'string') return `rgba(100, 116, 139, ${alpha})`
    let r, g, b
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16)
      g = parseInt(hex[2] + hex[2], 16)
      b = parseInt(hex[3] + hex[3], 16)
    } else {
      r = parseInt(hex.slice(1, 3), 16)
      g = parseInt(hex.slice(3, 5), 16)
      b = parseInt(hex.slice(5, 7), 16)
    }
    if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(100, 116, 139, ${alpha})`
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
}
