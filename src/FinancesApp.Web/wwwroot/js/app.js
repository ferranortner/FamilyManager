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

// ===== GESTIÓ DE TEMES (GLOBAL AMB DELEGACIÓ D'ESDEVENIMENTS) =====
function initThemeSelector() {
  const body = document.body

  // Aplicar tema guardat immediatament
  const savedTheme = localStorage.getItem('financeApp-theme') || 'theme-light'
  aplicarTema(savedTheme)

  // DELEGACIÓ D'ESDEVENIMENTS: Escoltar clics a nivell de document
  // Així funciona encara que el DOM canviï
  document.addEventListener('click', e => {
    // Buscar si s'ha clicat sobre una opció de tema
    const themeOption = e.target.closest('.theme-option')
    if (themeOption) {
      e.preventDefault()
      e.stopPropagation()

      const theme = themeOption.dataset.theme
      if (theme) {
        aplicarTema(theme)
        localStorage.setItem('financeApp-theme', theme)
        console.log('Tema canviat a:', theme)
      }
    }
  })

  // També gestionar el hover del dropdown si cal
  const dropdown = document.querySelector('.theme-selector .dropdown')
  if (dropdown) {
    // Per mòbils: toggle amb clic al botó
    const btn = dropdown.querySelector('.btn-icon')
    if (btn) {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        dropdown.classList.toggle('active')
      })
    }

    // Tancar dropdown quan es clica fora
    document.addEventListener('click', e => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('active')
      }
    })
  }

  function aplicarTema(themeName) {
    // Eliminar totes les classes de tema existents
    body.classList.remove('theme-light', 'theme-dark', 'theme-blue', 'theme-green', 'theme-amber', 'theme-metal')
    // Afegir la classe del tema seleccionat
    body.classList.add(themeName)
  }
}

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
    this.navigate('dashboard')
  }

  async initializeDefaultData() {
    try {
      const categories = await this.categoryService.getAll()
      if (categories.length === 0) {
        console.log('Creant categories per defecte...')
        const defaultCategories = [
          { name: 'Nòmina', type: 'income', color: '#10b981', icon: '💰' },
          { name: 'Freelance', type: 'income', color: '#34d399', icon: '💻' },
          { name: 'Compres', type: 'expense', color: '#f59e0b', icon: '🛒' },
          { name: 'Transport', type: 'expense', color: '#3b82f6', icon: '🚗' },
          { name: 'Menjar', type: 'expense', color: '#ef4444', icon: '🍔' },
          { name: 'Serveis', type: 'expense', color: '#8b5cf6', icon: '💡' },
          { name: 'Oci', type: 'expense', color: '#ec4899', icon: '🎮' },
          { name: 'Salut', type: 'expense', color: '#14b8a6', icon: '⚕️' },
        ]
        for (const cat of defaultCategories) {
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
        const view = e.target.dataset.view
        this.navigate(view)
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'))
        e.target.classList.add('active')
      })
    })

    window.navigateToEvents = () => {
      this.navigate('events')
      document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.toggle('active', l.dataset.view === 'events')
      })
    }
  }

  async navigate(view) {
    const container = document.getElementById('main-content')
    const title = document.getElementById('page-title')
    this.currentView = view

    switch (view) {
      case 'dashboard':
        title.textContent = 'Dashboard'
        const dashboard = new Dashboard('main-content', this.financeService, this.eventService)
        await dashboard.render()
        break
      case 'categories':
        title.textContent = 'Categories'
        const categoriesManager = new CategoriesManager('main-content')
        await categoriesManager.render()
        break
      case 'transactions':
        title.textContent = 'Transaccions'
        const transactionManager = new TransactionManager('main-content')
        await transactionManager.render()
        break
      case 'events':
        title.textContent = 'Esdeveniments'
        const eventManager = new EventManager('main-content')
        await eventManager.render()
        break
      case 'analysis':
        title.textContent = "Anàlisi d'Evolució"
        const analysisPage = new AnalysisPage(this.financeService, this.categoryService)
        await analysisPage.render('main-content')
        break
      case 'groups':
        title.textContent = 'Grups de Transaccions'
        const transactionGroups = new TransactionGroups('main-content')
        await transactionGroups.render()
        break
      case 'categoriesSummary':
        title.textContent = 'Resum de Categories'
        const categorySummary = new CategorySummary('main-content')
        categorySummary.render()
        break
      case 'forecast':
        title.textContent = 'Previsió de Pagaments' // ← Afegit per consistència
        const forecastView = new ForecastView()
        await forecastView.render() // ← Afegit 'await' per si hi ha càrrega asíncrona
        break
      default:
        title.textContent = 'Dashboard'
        const defaultDashboard = new Dashboard('main-content', this.financeService, this.eventService)
        await defaultDashboard.render()
        break
    }
  }
}

// Iniciar tot quan el DOM estigui llest
document.addEventListener('DOMContentLoaded', () => {
  // Inicialitzar selector de temes PRIMER (amb delegació d'esdeveniments)
  initThemeSelector()

  // DESPRÉS iniciar l'aplicació
  window.app = new App()
})
