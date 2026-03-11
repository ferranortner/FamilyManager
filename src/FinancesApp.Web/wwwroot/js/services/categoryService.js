import { apiService } from './apiService.js'

class CategoryService {
  constructor() {
    this.api = apiService
    this.cache = null
    this.cacheTime = null
    this.cacheDuration = 60000 // 1 minut de caché
  }

  async getAll(type = null) {
    // TEMPORAL: Desactivar caché per debugar
    // if (this.cache && this.cacheTime && Date.now() - this.cacheTime < this.cacheDuration) {
    //   if (!type) return this.cache
    //   return this.cache.filter(c => c.type === type)
    // }

    const params = type ? `?type=${type}` : ''
    console.log('Fent GET a /categories') // DEBUG

    const categories = await this.api.request(`/categories${params}`)
    console.log('Resposta del servidor:', categories) // DEBUG

    this.cache = categories
    this.cacheTime = Date.now()

    return categories
  }

  async getById(id) {
    return this.api.request(`/categories/${id}`)
  }

  async create(category) {
    this.invalidateCache()
    return this.api.request('/categories', {
      method: 'POST',
      body: category,
    })
  }

  async update(id, category) {
    this.invalidateCache()
    return this.api.request(`/categories/${id}`, {
      method: 'PUT',
      body: category,
    })
  }

  async delete(id) {
    this.invalidateCache()
    return this.api.request(`/categories/${id}`, {
      method: 'DELETE',
    })
  }

  invalidateCache() {
    this.cache = null
    this.cacheTime = null
  }

  // Obtenir categories per defecte si no n'hi ha
  getDefaultCategories() {
    return [
      { id: 1, name: 'Nòmina', type: 'income', color: '#10b981', icon: '💰' },
      { id: 2, name: 'Freelance', type: 'income', color: '#34d399', icon: '💻' },
      { id: 3, name: 'Compres', type: 'expense', color: '#f59e0b', icon: '🛒' },
      { id: 4, name: 'Transport', type: 'expense', color: '#3b82f6', icon: '🚗' },
      { id: 5, name: 'Menjar', type: 'expense', color: '#ef4444', icon: '🍔' },
      { id: 6, name: 'Serveis', type: 'expense', color: '#8b5cf6', icon: '💡' },
      { id: 7, name: 'Oci', type: 'expense', color: '#ec4899', icon: '🎮' },
      { id: 8, name: 'Salut', type: 'expense', color: '#14b8a6', icon: '⚕️' },
    ]
  }
}

export const categoryService = new CategoryService()
