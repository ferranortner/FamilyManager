// app.js
import { financeService } from './services/financeService.js'
import { categoryService } from './services/categoryService.js'
import { Dashboard } from './components/dashboard.js'
import { CategoriesManager } from './components/categories.js'
import { TransactionManager } from './components/transactions.js'

class App {
  constructor() {
    this.currentView = 'dashboard'
    this.init()
  }

  async init() {
    // Inicialitzar dades per defecte si cal
    await this.initializeDefaultData()

    // Configurar navegació
    this.setupNavigation()

    // Carregar vista inicial
    this.navigate('dashboard')
  }

  async initializeDefaultData() {
    try {
      const categories = await categoryService.getAll()

      if (categories.length === 0) {
        console.log('Creant categories per defecte...')

        // Categories amb TOTS els camps necessaris
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
            await categoryService.create(cat)
            console.log('Creada:', cat.name)
          } catch (err) {
            console.error('Error creant', cat.name, ':', err)
          }
        }

        console.log('Categories per defecte creades')
      }
    } catch (error) {
      console.error('Error inicialitzant dades:', error)
      // No aturem l'app si falla
    }
  }

  setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault()
        const view = e.target.dataset.view
        this.navigate(view)

        // Actualitzar active
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'))
        e.target.classList.add('active')
      })
    })
  }

  async navigate(view) {
    const container = document.getElementById('main-content')
    const title = document.getElementById('page-title')

    this.currentView = view

    switch (view) {
      case 'dashboard':
        title.textContent = 'Dashboard'
        const dashboard = new Dashboard('main-content', financeService)
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

      default:
        title.textContent = 'Dashboard'
        const defaultDashboard = new Dashboard('main-content', financeService)
        await defaultDashboard.render()
        break
    }
  }
}

// Iniciar app
document.addEventListener('DOMContentLoaded', () => {
  new App()
})
