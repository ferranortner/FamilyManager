// app.js
import { financeService } from './services/financeService.js'
import { categoryService } from './services/categoryService.js'
import { eventService } from './services/eventService.js'
import { Dashboard } from './components/dashboard.js'
import { CategoriesManager } from './components/categories.js'
import { TransactionManager } from './components/transactions.js'
import { EventManager } from './components/eventManager.js'
import { AnalysisPage } from './components/analysis.js'
import { TransactionGroups } from './components/TransactionGroups.js'
import { CategorySummary } from './components/CategorySummary.js'
import { ForecastView } from './components/forecast.js'
import { LoanAmortizationManager } from './components/loanAmortization.js'
import { BudgetsView } from './components/budgets.js'
import { RecurringView } from './components/recurring.js'
import { QuickAdd } from './components/quickAdd.js'
import { loanService } from './services/loanService.js'

const DEFAULT_CATEGORIES = [
  { name: 'Nòmina', type: 'income', color: '#10b981', icon: '' },
  { name: 'Freelance', type: 'income', color: '#34d399', icon: '' },
  { name: 'Compres', type: 'expense', color: '#f59e0b', icon: '' },
  { name: 'Transport', type: 'expense', color: '#3b82f6', icon: '' },
  { name: 'Menjar', type: 'expense', color: '#ef4444', icon: '' },
  { name: 'Serveis', type: 'expense', color: '#8b5cf6', icon: '' },
  { name: 'Oci', type: 'expense', color: '#ec4899', icon: '' },
  { name: 'Salut', type: 'expense', color: '#14b8a6', icon: '' },
]

class App {
  constructor() {
    this.currentView = 'dashboard'
    this.financeService = financeService
    this.categoryService = categoryService
    this.eventService = eventService
    this.init()
  }

  async init() {
    await this.initializeDefaultData()
    this.setupNavigation()
    new QuickAdd().mount()
    this.navigate('dashboard')
  }

  async initializeDefaultData() {
    try {
      const categories = await this.categoryService.getAll()
      if (categories.length === 0) {
        for (const cat of DEFAULT_CATEGORIES) {
          try {
            await this.categoryService.create(cat)
          } catch (err) {
            console.error('Error creant', cat.name, ':', err)
          }
        }
      }
    } catch (error) {
      console.error('Error inicialitzant dades:', error)
    }
  }

  setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault()
        this.setActiveLink(link.dataset.view)
        this.navigate(link.dataset.view)
      })
    })

    window.navigateToEvents = () => {
      this.setActiveLink('events')
      this.navigate('events')
    }
  }

  setActiveLink(view) {
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.view === view)
    })
  }

  // Els préstecs es carreguen del backend (JSON); si no n'hi ha, es mostra un missatge
  async renderLoans() {
    const container = document.getElementById('main-content')
    let loans = []
    try {
      loans = await loanService.getAll()
    } catch (err) {
      container.innerHTML = `<p class="error-detail">Error carregant préstecs: ${err.message}</p>`
      return
    }

    if (loans.length === 0) {
      container.innerHTML = '<div class="empty-state-full"><p>Encara no hi ha préstecs definits</p></div>'
      return
    }

    await new LoanAmortizationManager('main-content', loans).render()
  }

  async navigate(view) {
    const title = document.getElementById('page-title')
    this.currentView = view

    const views = {
      dashboard: { title: 'Panell', render: () => new Dashboard('main-content', this.financeService, this.eventService).render() },
      transactions: { title: 'Transaccions', render: () => new TransactionManager('main-content').render() },
      events: { title: 'Esdeveniments', render: () => new EventManager('main-content').render() },
      analysis: { title: "Anàlisi d'evolució", render: () => new AnalysisPage(this.financeService, this.categoryService).render('main-content') },
      groups: { title: 'Grups de transaccions', render: () => new TransactionGroups('main-content').render() },
      categories: { title: 'Categories', render: () => new CategoriesManager('main-content').render() },
      categoriesSummary: { title: 'Resum per categories', render: () => new CategorySummary('main-content').render() },
      forecast: { title: 'Previsió de pagaments', render: () => new ForecastView().render() },
      budgets: { title: 'Pressupostos', render: () => new BudgetsView('main-content').render() },
      recurring: { title: 'Transaccions recurrents', render: () => new RecurringView('main-content').render() },
      loanAmortization: { title: 'Previsió de crèdits', render: () => this.renderLoans() },
    }

    const target = views[view] ?? views.dashboard
    title.textContent = target.title
    await target.render()
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App()
})
